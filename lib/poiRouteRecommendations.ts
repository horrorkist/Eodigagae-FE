import type { RouteResult } from "../domain/route/types";
import type { FocusedPoi } from "../types/focusedPoi";

export type TmapPedestrianSearchOption = 0 | 4 | 30;

export type PoiRouteFetchResult = {
  route: RouteResult;
  rawResponse: unknown;
};

export type PoiRouteRecommendation = {
  id: string;
  title: string;
  displayLabel?: string;
  source: "synthetic";
  route: RouteResult;
  waypoint: {
    lat: number;
    lng: number;
    title: string;
    source: "synthetic";
  };
  waypoints: Array<{
    lat: number;
    lng: number;
    title: string;
    source: "synthetic";
  }>;
  metrics: {
    score: number;
    distanceFit: number;
    poiBoost: number;
  };
};

export const TMAP_POI_ROUTE_OPTIONS: ReadonlyArray<{
  key: "recommend" | "wide-road" | "stairs-avoid";
  searchOption: TmapPedestrianSearchOption;
  displayLabel: string;
}> = [
  { key: "recommend", searchOption: 0, displayLabel: "추천" },
  { key: "wide-road", searchOption: 4, displayLabel: "대로우선" },
  { key: "stairs-avoid", searchOption: 30, displayLabel: "계단회피" },
] as const;

type SettledPoiRouteOption = {
  key: (typeof TMAP_POI_ROUTE_OPTIONS)[number]["key"];
  searchOption: TmapPedestrianSearchOption;
  displayLabel: string;
  status: "fulfilled" | "rejected";
  value?: PoiRouteFetchResult;
  reason?: unknown;
};

export function buildPoiRouteRecommendations(params: {
  poi: FocusedPoi;
  settledResults: SettledPoiRouteOption[];
}): { recommendations: PoiRouteRecommendation[]; errors: string[] } {
  const { poi, settledResults } = params;
  const recommendations: PoiRouteRecommendation[] = [];
  const errors: string[] = [];

  for (const entry of settledResults) {
    if (entry.status === "rejected" || !entry.value) {
      const message =
        entry.reason instanceof Error
          ? entry.reason.message
          : `${entry.displayLabel} 경로를 불러오지 못했어요.`;
      errors.push(message);
      continue;
    }

    recommendations.push({
      id: `poi-route:${poi.id}:${entry.key}`,
      title: poi.name,
      displayLabel: entry.displayLabel,
      source: "synthetic",
      waypoint: {
        lat: poi.lat,
        lng: poi.lng,
        title: poi.name,
        source: "synthetic",
      },
      waypoints: [
        {
          lat: poi.lat,
          lng: poi.lng,
          title: poi.name,
          source: "synthetic",
        },
      ],
      route: {
        ...entry.value.route,
        waypoints: [
          {
            coordinate: [poi.lng, poi.lat],
            markerCoordinate:
              entry.value.route.path[entry.value.route.path.length - 1] ??
              [poi.lng, poi.lat],
            title: poi.name,
            order: 0,
            kind: "end",
            distanceAlongRouteM: null,
          },
        ],
      },
      metrics: {
        score: 0,
        distanceFit: 0,
        poiBoost: 0,
      },
    });
  }

  return { recommendations, errors };
}
