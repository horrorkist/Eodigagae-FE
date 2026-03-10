import type { LatLng } from "@/types/mapEvents";
import type { RouteResult } from "@/domain/route/types";
import type { FocusedPoi } from "@/types/focusedPoi";
import type { RouteRecommendation } from "@/types/routeRecommend";
import { extractTmapPedestrian } from "@/lib/extractTmapPedestrian";
import {
  buildPoiRouteRecommendations,
  TMAP_POI_ROUTE_OPTIONS,
  type TmapPedestrianSearchOption,
} from "@/lib/poiRouteRecommendations";

export type { TmapPedestrianSearchOption } from "@/lib/poiRouteRecommendations";

export type TmapWalkRouteFetchResult = {
  route: RouteResult;
  rawResponse: unknown;
};

export async function fetchTmapWalkRoute(params: {
  start: LatLng;
  goal: LatLng;
  searchOption?: TmapPedestrianSearchOption;
}): Promise<TmapWalkRouteFetchResult> {
  const res = await fetch("/api/tmap/pedestrian", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      startX: params.start.lng,
      startY: params.start.lat,
      endX: params.goal.lng,
      endY: params.goal.lat,
      searchOption: params.searchOption,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "TMAP 도보 경로 요청 실패");

  return {
    route: extractTmapPedestrian(data),
    rawResponse: data,
  };
}
export async function fetchPoiRouteRecommendations(params: {
  start: LatLng;
  poi: FocusedPoi;
}): Promise<{ recommendations: RouteRecommendation[]; errors: string[] }> {
  const settled = await Promise.allSettled(
    TMAP_POI_ROUTE_OPTIONS.map(async (option) => ({
      ...option,
      value: await fetchTmapWalkRoute({
        start: params.start,
        goal: { lat: params.poi.lat, lng: params.poi.lng },
        searchOption: option.searchOption,
      }),
    })),
  );

  return buildPoiRouteRecommendations({
    poi: params.poi,
    settledResults: settled.map((result, index) => {
      const option = TMAP_POI_ROUTE_OPTIONS[index];
      if (result.status === "fulfilled") {
        return {
          key: option.key,
          searchOption: option.searchOption,
          displayLabel: option.displayLabel,
          status: "fulfilled",
          value: result.value.value,
        };
      }

      return {
        key: option.key,
        searchOption: option.searchOption,
        displayLabel: option.displayLabel,
        status: "rejected",
        reason: result.reason,
      };
    }),
  });
}
