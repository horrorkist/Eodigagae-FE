"use client";

import { useEffect, useMemo } from "react";
import { bus, type AppEvent, type MapChannel } from "@/lib/eventBus";

/** 타입 안전 emit */
export function useEmit() {
  return useMemo(() => {
    return <E extends AppEvent>(e: E) => bus.emit(e);
  }, []);
}

/** 타입 안전 subscribe */
export function useOn<C extends MapChannel, T extends AppEvent["type"]>(
  channel: C,
  type: T,
  handler: (e: Extract<AppEvent, { channel: C; type: T }>) => void,
) {
  useEffect(() => {
    return bus.subscribe(channel, type, handler as any);
  }, [channel, type, handler]);
}

/**
 * ✅ Dispatcher (딱 한 곳에서만 마운트)
 * - 버스 큐를 주기적으로 flush
 * - 이벤트 emit이 발생하면 다음 tick에 처리되도록 해도 되고,
 *   여기선 requestAnimationFrame 기반으로 “프레임마다” 처리
 */
export function useBusDispatcher(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let mounted = true;

    const loop = () => {
      if (!mounted) return;
      bus.flush();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
