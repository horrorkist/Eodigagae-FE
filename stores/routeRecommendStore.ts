import { create } from "zustand";
import type {
  RouteRecommendation,
  RouteRecommendMeta,
} from "@/types/routeRecommend";

type RouteRecommendState = {
  recommendations: RouteRecommendation[];
  selectedRouteId: string | null;
  loading: boolean;
  error: string | null;
  meta: RouteRecommendMeta | null;

  startLoading: () => void;
  setRecommendations: (
    recommendations: RouteRecommendation[],
    meta: RouteRecommendMeta | null,
  ) => void;
  setError: (message: string) => void;
  selectRoute: (routeId: string | null) => void;
  clear: () => void;
};

export const useRouteRecommendStore = create<RouteRecommendState>((set) => ({
  recommendations: [],
  selectedRouteId: null,
  loading: false,
  error: null,
  meta: null,

  startLoading: () =>
    set({
      loading: true,
      error: null,
      recommendations: [],
      selectedRouteId: null,
      meta: null,
    }),

  setRecommendations: (recommendations, meta) =>
    set({
      recommendations,
      selectedRouteId: recommendations[0]?.id ?? null,
      loading: false,
      error: null,
      meta,
    }),

  setError: (message) =>
    set({
      recommendations: [],
      selectedRouteId: null,
      loading: false,
      error: message,
      meta: null,
    }),

  selectRoute: (routeId) => set({ selectedRouteId: routeId }),

  clear: () =>
    set({
      recommendations: [],
      selectedRouteId: null,
      loading: false,
      error: null,
      meta: null,
    }),
}));
