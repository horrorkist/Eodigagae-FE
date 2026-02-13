// stores/mapStore.ts
import { create } from "zustand";
import type { LatLng } from "@/types/mapEvents";

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

export type RouteStatePatch = Partial<
  Pick<MapState, "route" | "routeLoading" | "routeError" | "drawRoute">
>;

// ================================
// Store
// ================================
type MapState = {
  // basic positions
  myPos: LatLng | null;
  pickedPos: LatLng | null;
  walking: boolean;
  walkingPaused: boolean;
  walkingStartedAt: number | null;
  walkingPausedAt: number | null;
  walkingPausedTotalMs: number;
  walkedDistanceM: number;
  heading: number | null;

  // route
  route: RouteResult | null;
  routeLoading: boolean;
  routeError: string | null;
  drawRoute: boolean;
  setRouteState: (patch: RouteStatePatch) => void;

  // actions
  setMyPos: (p: LatLng | null) => void;
  setPickedPos: (p: LatLng | null) => void;
  setWalking: (v: boolean) => void;
  setWalkingPaused: (v: boolean) => void;
  setWalkingStartedAt: (ts: number | null) => void;
  setWalkingPausedAt: (ts: number | null) => void;
  setWalkingPausedTotalMs: (ms: number) => void;
  setWalkedDistanceM: (m: number) => void;
  addWalkedDistanceM: (deltaM: number) => void;
  setHeading: (deg: number | null) => void;
  clearPicked: () => void;

  setDrawRoute: (v: boolean) => void;
  clearRoute: () => void;
};

function clampNonNegative(value: number) {
  return Math.max(0, value);
}

export const useMapStore = create<MapState>((set) => ({
  // ----------------------------
  // basic positions
  // ----------------------------
  myPos: null,
  pickedPos: null,
  walking: false,
  walkingPaused: false,
  walkingStartedAt: null,
  walkingPausedAt: null,
  walkingPausedTotalMs: 0,
  walkedDistanceM: 0,
  heading: null,

  setMyPos: (p) => set({ myPos: p }),
  setPickedPos: (p) => set({ pickedPos: p }),
  setWalking: (v) => set({ walking: v }),
  setWalkingPaused: (v) => set({ walkingPaused: v }),
  setWalkingStartedAt: (ts) => set({ walkingStartedAt: ts }),
  setWalkingPausedAt: (ts) => set({ walkingPausedAt: ts }),
  setWalkingPausedTotalMs: (ms) => set({ walkingPausedTotalMs: ms }),
  setWalkedDistanceM: (m) => set({ walkedDistanceM: clampNonNegative(m) }),
  addWalkedDistanceM: (deltaM) =>
    set((state) => ({
      walkedDistanceM: clampNonNegative(state.walkedDistanceM + deltaM),
    })),
  setHeading: (deg) => set({ heading: deg }),
  clearPicked: () => set({ pickedPos: null }),

  // ----------------------------
  // route
  // ----------------------------
  route: null,
  routeLoading: false,
  routeError: null,
  drawRoute: false,

  setRouteState: (patch) => set(patch),

  setDrawRoute: (v) => set({ drawRoute: v }),

  clearRoute: () => set({ route: null, routeError: null, drawRoute: false }),
}));
