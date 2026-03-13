// stores/mapStore.ts
import { create } from "zustand";
import type { LatLng } from "@/types/mapEvents";
import type { FocusedPoi } from "@/types/focusedPoi";
import type { RouteResult } from "@/domain/route/types";
import type { RoutePlanningSource } from "@/types/routePlanning";
import type { TmapPoi, TmapPoiSearchSort } from "@/types/tmapPoi";

export type RouteStatePatch = Partial<
  Pick<
    MapState,
    "route" | "routeRawResponse" | "routeLoading" | "routeError" | "drawRoute"
  >
>;

export type RouteSceneMode = "idle" | "start-point" | "planning" | "walking";

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
  routeSceneMode: RouteSceneMode;
  routeExperienceSource: RoutePlanningSource | null;
  submittedSearchPois: TmapPoi[];
  submittedSearchKeyword: string;
  submittedSearchSort: TmapPoiSearchSort;
  submittedSearchCenter: LatLng | null;
  submittedSearchSeq: number;
  pendingSearchResultsRevealSeq: number | null;

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
  setRouteSceneMode: (mode: RouteSceneMode) => void;
  setRouteExperienceSource: (source: RoutePlanningSource | null) => void;
  resetRouteSceneMode: () => void;
  commitSubmittedSearchPois: (
    pois: TmapPoi[],
    keyword: string,
    sort: TmapPoiSearchSort,
    center: LatLng,
  ) => void;
  consumePendingSearchResultsRevealSeq: () => number | null;
  clearSubmittedSearchPois: () => void;
  clearPicked: () => void;
  clearFocusedPoi: () => void;

  setDrawRoute: (v: boolean) => void;
  clearRoute: () => void;
};

function clampNonNegative(value: number) {
  return Math.max(0, value);
}

export const useMapStore = create<MapState>((set, get) => ({
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
  routeSceneMode: "idle",
  routeExperienceSource: null,
  submittedSearchPois: [],
  submittedSearchKeyword: "",
  submittedSearchSort: "R",
  submittedSearchCenter: null,
  submittedSearchSeq: 0,
  pendingSearchResultsRevealSeq: null,

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
  setRouteSceneMode: (mode) => set({ routeSceneMode: mode }),
  setRouteExperienceSource: (source) => set({ routeExperienceSource: source }),
  resetRouteSceneMode: () => set({ routeSceneMode: "idle" }),
  commitSubmittedSearchPois: (pois, keyword, sort, center) =>
    set((state) => {
      const nextSeq = state.submittedSearchSeq + 1;
      return {
        submittedSearchPois: pois,
        submittedSearchKeyword: keyword,
        submittedSearchSort: sort,
        submittedSearchCenter: center,
        submittedSearchSeq: nextSeq,
        pendingSearchResultsRevealSeq: nextSeq,
      };
    }),
  consumePendingSearchResultsRevealSeq: () => {
    const pending = get().pendingSearchResultsRevealSeq;
    if (pending != null) {
      set({ pendingSearchResultsRevealSeq: null });
    }
    return pending;
  },
  clearSubmittedSearchPois: () =>
    set({
      submittedSearchPois: [],
      submittedSearchKeyword: "",
      submittedSearchSort: "R",
      submittedSearchCenter: null,
      submittedSearchSeq: 0,
      pendingSearchResultsRevealSeq: null,
    }),
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
