import type { LatLng } from "@/types/mapEvents";
import type { RouteResult } from "@/domain/route/types";
import { extractTmapPedestrian } from "@/lib/extractTmapPedestrian";

export type TmapWalkRouteFetchResult = {
  route: RouteResult;
  rawResponse: unknown;
};

export async function fetchTmapWalkRoute(params: {
  start: LatLng;
  goal: LatLng;
}): Promise<TmapWalkRouteFetchResult> {
  const res = await fetch("/api/tmap/pedestrian", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      startX: params.start.lng,
      startY: params.start.lat,
      endX: params.goal.lng,
      endY: params.goal.lat,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "TMAP 도보 경로 요청 실패");

  return {
    route: extractTmapPedestrian(data),
    rawResponse: data,
  };
}
