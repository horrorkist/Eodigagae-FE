"use client";

import { PetPoiItem } from "@/types/mapEvents";

export type MapChannel = "map" | "pet";

export type BaseEvent<C extends MapChannel, T extends string> = {
  channel: C;
  type: T;
  ts?: number;
};

/** MAP domain events */
export type MapEvents =
  | (BaseEvent<"map", "MOVE_TO"> & {
      pos: { lat: number; lng: number };
      zoom?: number;
      animate?: boolean;
    })
  | BaseEvent<"map", "REQUEST_MY_LOCATION">
  | BaseEvent<"map", "MOVE_MY_MARKER_READY">
  | BaseEvent<"map", "MOVE_MY_MARKER_CANCELLED">
  | BaseEvent<"map", "MY_MARKER_MOVED">;

/** PET domain events */
export type PetEvents =
  | (BaseEvent<"pet", "PETPOI_TOGGLE"> & { on: boolean })
  | BaseEvent<"pet", "PETPOI_REFRESH">
  | (BaseEvent<"pet", "PETPOI_RESULT"> & {
      items: PetPoiItem[];
      key: string;
    })
  | (BaseEvent<"pet", "PETPOI_ERROR"> & {
      message: string;
      key: string;
    });

export type AppEvent = MapEvents | PetEvents;

type Listener<E extends AppEvent = AppEvent> = (e: E) => void;
type Key = `${MapChannel}:${string}`;

function keyOf(e: Pick<AppEvent, "channel" | "type">): Key {
  return `${e.channel}:${e.type}`;
}

class BufferedBus {
  private queue: AppEvent[] = [];
  private listeners = new Map<Key, Set<Listener<any>>>();
  private flushing = false;

  emit<E extends AppEvent>(e: E) {
    this.queue.push({ ...e, ts: e.ts ?? Date.now() });
  }

  subscribe<C extends MapChannel, T extends AppEvent["type"]>(
    channel: C,
    type: T,
    fn: Listener<Extract<AppEvent, { channel: C; type: T }>>,
  ) {
    const k = `${channel}:${type}` as Key;
    let set = this.listeners.get(k);
    if (!set) {
      set = new Set();
      this.listeners.set(k, set);
    }
    set.add(fn as any);

    return () => {
      set!.delete(fn as any);
      if (set!.size === 0) this.listeners.delete(k);
    };
  }

  flush(max = 1000) {
    if (this.flushing) return;
    this.flushing = true;
    try {
      let count = 0;
      while (this.queue.length > 0) {
        const e = this.queue.shift()!;
        const k = keyOf(e);
        const set = this.listeners.get(k);
        if (set) {
          for (const fn of Array.from(set)) {
            try {
              fn(e);
            } catch (err) {
              console.error("[bus] listener error", e, err);
            }
          }
        }
        count++;
        if (count >= max) {
          console.warn(
            "[bus] flush max reached, remaining:",
            this.queue.length,
          );
          break;
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  get size() {
    return this.queue.length;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __APP_EVENT_BUS__: BufferedBus | undefined;
}

export const bus: BufferedBus =
  globalThis.__APP_EVENT_BUS__ ??
  (globalThis.__APP_EVENT_BUS__ = new BufferedBus());
