// stores/mapStore.ts
import { create } from "zustand";
import type { LatLng } from "@/types/mapEvents";
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

  // route
  route: RouteResult | null;
  routeLoading: boolean;
  routeError: string | null;
  drawRoute: boolean;
  setRouteState: (patch: RouteStatePatch) => void;

  // actions
  setMyPos: (p: LatLng | null) => void;
  setPickedPos: (p: LatLng | null) => void;
  clearPicked: () => void;

  setDrawRoute: (v: boolean) => void;
  clearRoute: () => void;
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

  setRouteState: (patch) => set(patch),

  setDrawRoute: (v) => set({ drawRoute: v }),

  clearRoute: () => set({ route: null, routeError: null, drawRoute: false }),
}));
