import type { LatLng } from "@/types/mapEvents";
import type { RouteResult } from "@/stores/mapStore";
import { extractTmapPedestrian } from "@/lib/extractTmapPedestrian";

export async function fetchNaverRoute(params: {
  start: LatLng;
  goal: LatLng;
}): Promise<RouteResult> {
  const start = `${params.start.lng},${params.start.lat}`;
  const goal = `${params.goal.lng},${params.goal.lat}`;

  const res = await fetch(
    `/api/directions?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}&option=traoptimal`,
    { method: "GET" },
  );
  const data = await res.json();

  if (!res.ok) throw new Error(data?.error ?? "경로 요청 실패");
  if (!Array.isArray(data?.path) || data.path.length === 0)
    throw new Error("경로 데이터가 비어있어요.");

  return { summary: data.summary, path: data.path };
}

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
