import type { LatLng } from "@/types/mapEvents";
import type { RouteResult } from "@/stores/mapStore";
import { extractTmapPedestrian } from "@/lib/extractTmapPedestrian";

export async function fetchTmapWalkRoute(params: {
  start: LatLng;
  goal: LatLng;
}): Promise<RouteResult> {
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

  return extractTmapPedestrian(data);
}
