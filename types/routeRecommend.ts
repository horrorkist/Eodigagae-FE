import type { RouteResult } from "@/stores/mapStore";

export type RouteRecommendationSource = "petpoi" | "synthetic";

export type RouteWaypoint = {
  lat: number;
  lng: number;
  title: string;
  source: RouteRecommendationSource;
  contentid?: string;
};

export type RouteRecommendation = {
  id: string;
  title: string;
  source: RouteRecommendationSource;
  route: RouteResult;
  waypoint: RouteWaypoint;
  metrics: {
    score: number;
    distanceFit: number;
    poiBoost: number;
  };
};

export type RouteRecommendMeta = {
  poiCount: number;
  candidateCount: number;
  shortlistCount: number;
  validatedCount: number;
  temperature: number;
  targetMinKm: number;
  targetMaxKm: number;
};

export type RouteRecommendResponse = {
  recommendations: RouteRecommendation[];
  meta: RouteRecommendMeta;
};
