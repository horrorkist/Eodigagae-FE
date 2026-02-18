// stores/mapStore.ts
import { create } from "zustand";
import type { LatLng } from "@/types/mapEvents";
import type { FocusedPoi } from "@/types/focusedPoi";

// ================================
// Types (route)
// ================================
export type RouteSummary = {
  distance?: number; // meters
  duration?: number; // ms or sec (upstream dependent)
};

export type RouteGuidanceStep = {
  order: number;
  coordinate: [number, number]; // [lng, lat]
  index?: number;
  pointIndex?: number;
  name?: string;
  guidePointName?: string;
  description?: string;
  direction?: string;
  intersectionName?: string;
  nearPoiName?: string;
  nearPoi?: [number, number]; // [lng, lat]
  crossName?: string;
  turnType?: number;
  pointType?: string;
};

export type RouteSegment = {
  order: number;
  index?: number;
  lineIndex?: number;
  name?: string;
  roadName?: string;
  description?: string;
  distance?: number; // meters
  duration?: number; // sec or ms (upstream dependent)
  roadType?: number;
  categoryRoadType?: number;
  facilityType?: number;
  facilityName?: string;
  coordinateCount: number;
  start: [number, number]; // [lng, lat]
  end: [number, number]; // [lng, lat]
};

export type RouteEndpoints = {
  start?: RouteGuidanceStep;
  end?: RouteGuidanceStep;
};

export type RouteFeatureStats = {
  totalFeatures: number;
  pointFeatures: number;
  lineFeatures: number;
};

export type RouteResult = {
  summary?: RouteSummary;
  path: [number, number][]; // [[lng,lat], ...]
  guidance?: RouteGuidanceStep[];
  segments?: RouteSegment[];
  endpoints?: RouteEndpoints;
  featureStats?: RouteFeatureStats;
};

export type RouteStatePatch = Partial<
  Pick<
    MapState,
    "route" | "routeRawResponse" | "routeLoading" | "routeError" | "drawRoute"
  >
>;

// ================================
// Store
// ================================
type MapState = {
  // basic positions
  myPos: LatLng | null;
  pickedPos: LatLng | null;
  focusedPoi: FocusedPoi | null;
  petPoiOn: boolean;
  walking: boolean;
  walkingPaused: boolean;
  walkingStartedAt: number | null;
  walkingPausedAt: number | null;
  walkingPausedTotalMs: number;
  walkedDistanceM: number;
  heading: number | null;

  // route
  route: RouteResult | null;
  routeRawResponse: unknown | null;
  routeLoading: boolean;
  routeError: string | null;
  drawRoute: boolean;
  setRouteState: (patch: RouteStatePatch) => void;

  // actions
  setMyPos: (p: LatLng | null) => void;
  setPickedPos: (p: LatLng | null) => void;
  setFocusedPoi: (poi: FocusedPoi | null) => void;
  setPetPoiOn: (v: boolean) => void;
  setWalking: (v: boolean) => void;
  setWalkingPaused: (v: boolean) => void;
  setWalkingStartedAt: (ts: number | null) => void;
  setWalkingPausedAt: (ts: number | null) => void;
  setWalkingPausedTotalMs: (ms: number) => void;
  setWalkedDistanceM: (m: number) => void;
  addWalkedDistanceM: (deltaM: number) => void;
  setHeading: (deg: number | null) => void;
  clearPicked: () => void;
  clearFocusedPoi: () => void;

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
  focusedPoi: null,
  petPoiOn: false,
  walking: false,
  walkingPaused: false,
  walkingStartedAt: null,
  walkingPausedAt: null,
  walkingPausedTotalMs: 0,
  walkedDistanceM: 0,
  heading: null,

  setMyPos: (p) => set({ myPos: p }),
  setPickedPos: (p) => set({ pickedPos: p }),
  setFocusedPoi: (poi) => set({ focusedPoi: poi }),
  setPetPoiOn: (v) => set({ petPoiOn: v }),
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
  clearFocusedPoi: () => set({ focusedPoi: null }),

  // ----------------------------
  // route
  // ----------------------------
  route: null,
  routeRawResponse: null,
  routeLoading: false,
  routeError: null,
  drawRoute: false,

  setRouteState: (patch) => set(patch),

  setDrawRoute: (v) => set({ drawRoute: v }),

  clearRoute: () =>
    set({
      route: null,
      routeRawResponse: null,
      routeError: null,
      drawRoute: false,
    }),
}));
