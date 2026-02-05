import type { RouteResult } from "@/stores/mapStore";

export function extractTmapPedestrian(data: any): RouteResult {
  const features: any[] = Array.isArray(data?.features) ? data.features : [];

  const path: [number, number][] = [];
  let distance: number | undefined;
  let duration: number | undefined;

  for (const f of features) {
    const g = f?.geometry;
    const props = f?.properties;

    if (distance == null) {
      const d =
        props?.totalDistance ??
        props?.distance ??
        data?.totalDistance ??
        data?.distance;
      if (typeof d === "number") distance = d;
    }

    if (duration == null) {
      const t =
        props?.totalTime ??
        props?.duration ??
        data?.totalTime ??
        data?.duration;
      if (typeof t === "number") duration = t;
    }

    if (g?.type === "LineString" && Array.isArray(g?.coordinates)) {
      for (const c of g.coordinates) {
        const lng = c?.[0];
        const lat = c?.[1];
        if (typeof lng === "number" && typeof lat === "number")
          path.push([lng, lat]);
      }
    }
  }

  if (path.length === 0)
    throw new Error("TMAP 도보 경로 좌표를 파싱하지 못했어요.");

  return { summary: { distance, duration }, path };
}
