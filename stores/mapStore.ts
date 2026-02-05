// stores/mapStore.ts
import { create } from "zustand";
import type { LatLng, MapCmd } from "@/types/mapEvents";
import { extractTmapPedestrian } from "@/lib/extractTmapPedestrian";

// ================================
// Types (route)
// ================================
export type RouteSummary = {
  distance?: number; // meters
  duration?: number; // ms or sec (upstream dependent)
};

export type RouteResult = {
  summary?: RouteSummary;
  path: [number, number][]; // [[lng,lat], ...]
};

// ================================
// Cmd Bus (PUB/SUB) — file-scope listeners
// ================================
type CmdListener<T extends MapCmd["type"] = MapCmd["type"]> = (
  cmd: Extract<MapCmd, { type: T }>,
) => void;

// ✅ IMPORTANT: file-scope so it doesn't reset on re-renders
const listeners = new Map<MapCmd["type"], Set<(cmd: any) => void>>();

// ================================
// Store
// ================================
type MapState = {
  // basic positions
  myPos: LatLng | null;
  pickedPos: LatLng | null;

  // route
  route: RouteResult | null;
  routeLoading: boolean;
  routeError: string | null;
  drawRoute: boolean;

  // actions
  setMyPos: (p: LatLng | null) => void;
  setPickedPos: (p: LatLng | null) => void;
  clearPicked: () => void;

  requestRoute: () => Promise<void>;
  requestTmapWalkRoute: () => Promise<void>;

  setDrawRoute: (v: boolean) => void;
  clearRoute: () => void;

  // ============================
  // Cmd Queue (transport)
  // ============================
  cmdQueue: MapCmd[];
  emitCmd: (cmd: MapCmd) => void;
  shiftCmd: () => MapCmd | null;
  clearCmdQueue: () => void;

  // ============================
  // Pub/Sub (broadcast)
  // ============================
  subscribeCmd: <T extends MapCmd["type"]>(
    type: T,
    fn: CmdListener<T>,
  ) => () => void;

  publishCmd: (cmd: MapCmd) => void;
};

export const useMapStore = create<MapState>((set, get) => ({
  // ----------------------------
  // basic positions
  // ----------------------------
  myPos: null,
  pickedPos: null,

  setMyPos: (p) => set({ myPos: p }),
  setPickedPos: (p) => set({ pickedPos: p }),
  clearPicked: () => set({ pickedPos: null }),

  // ----------------------------
  // route
  // ----------------------------
  route: null,
  routeLoading: false,
  routeError: null,
  drawRoute: false,

  setDrawRoute: (v) => set({ drawRoute: v }),

  clearRoute: () => set({ route: null, routeError: null, drawRoute: false }),

  requestRoute: async () => {
    const { myPos, pickedPos } = get();

    if (!myPos || !pickedPos) {
      set({
        routeError: "출발/도착 좌표가 필요해요.",
        route: null,
        drawRoute: false,
      });
      return;
    }

    set({ routeLoading: true, routeError: null });

    try {
      const start = `${myPos.lng},${myPos.lat}`;
      const goal = `${pickedPos.lng},${pickedPos.lat}`;

      const res = await fetch(
        `/api/directions?start=${encodeURIComponent(
          start,
        )}&goal=${encodeURIComponent(goal)}&option=traoptimal`,
        { method: "GET" },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? "경로 요청 실패");
      if (!Array.isArray(data?.path) || data.path.length === 0) {
        throw new Error("경로 데이터가 비어있어요.");
      }

      set({
        route: { summary: data.summary, path: data.path },
        routeLoading: false,
        routeError: null,
        drawRoute: false,
      });
    } catch (e: any) {
      set({
        route: null,
        routeLoading: false,
        routeError: e?.message ?? "알 수 없는 오류",
        drawRoute: false,
      });
    }
  },

  requestTmapWalkRoute: async () => {
    const { myPos, pickedPos } = get();

    if (!myPos || !pickedPos) {
      set({
        routeError: "출발/도착 좌표가 필요해요.",
        route: null,
        drawRoute: false,
      });
      return;
    }

    set({ routeLoading: true, routeError: null });

    try {
      const res = await fetch("/api/tmap/pedestrian", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startX: myPos.lng,
          startY: myPos.lat,
          endX: pickedPos.lng,
          endY: pickedPos.lat,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? "TMAP 도보 경로 요청 실패");

      const parsed = extractTmapPedestrian(data);

      set({
        route: parsed,
        routeLoading: false,
        routeError: null,
        drawRoute: false,
      });
    } catch (e: any) {
      set({
        route: null,
        routeLoading: false,
        routeError: e?.message ?? "알 수 없는 오류",
        drawRoute: false,
      });
    }
  },

  // ----------------------------
  // Cmd Queue (transport)
  // ----------------------------
  cmdQueue: [],
  emitCmd: (cmd) => set((s) => ({ cmdQueue: [...s.cmdQueue, cmd] })),
  shiftCmd: () => {
    const q = get().cmdQueue;
    if (q.length === 0) return null;
    const head = q[0];
    set({ cmdQueue: q.slice(1) });
    return head;
  },
  clearCmdQueue: () => set({ cmdQueue: [] }),

  // ----------------------------
  // Pub/Sub (broadcast)
  // ----------------------------
  subscribeCmd: (type, fn) => {
    let setForType = listeners.get(type);
    if (!setForType) {
      setForType = new Set();
      listeners.set(type, setForType);
    }
    setForType.add(fn as any);

    return () => {
      const s = listeners.get(type);
      if (!s) return;
      s.delete(fn as any);
      if (s.size === 0) listeners.delete(type);
    };
  },

  publishCmd: (cmd) => {
    const s = listeners.get(cmd.type);
    if (!s || s.size === 0) return;

    for (const fn of Array.from(s)) {
      try {
        fn(cmd);
      } catch (e) {
        console.error("[cmd listener error]", cmd.type, e);
      }
    }
  },
}));
