import type { RouteResult } from "@/stores/mapStore";
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function readNumberFromRecord(
  record: UnknownRecord,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

export function extractTmapPedestrian(data: unknown): RouteResult {
  const root = isRecord(data) ? data : {};
  const features = Array.isArray(root.features) ? root.features : [];

  const path: [number, number][] = [];
  let distance: number | undefined;
  let duration: number | undefined;

  for (const f of features) {
    if (!isRecord(f)) continue;
    const g = isRecord(f.geometry) ? f.geometry : null;
    const props = isRecord(f.properties) ? f.properties : {};

    if (distance == null) {
      const d =
        readNumberFromRecord(props, "totalDistance") ??
        readNumberFromRecord(props, "distance") ??
        readNumberFromRecord(root, "totalDistance") ??
        readNumberFromRecord(root, "distance");
      if (d != null) distance = d;
    }

    if (duration == null) {
      const t =
        readNumberFromRecord(props, "totalTime") ??
        readNumberFromRecord(props, "duration") ??
        readNumberFromRecord(root, "totalTime") ??
        readNumberFromRecord(root, "duration");
      if (t != null) duration = t;
    }

    if (g?.type === "LineString" && Array.isArray(g.coordinates)) {
      for (const c of g.coordinates) {
        if (!Array.isArray(c)) continue;
        const lng = c[0];
        const lat = c[1];
        if (typeof lng === "number" && typeof lat === "number")
          path.push([lng, lat]);
      }
    }
  }

  if (path.length === 0)
    throw new Error("TMAP 도보 경로 좌표를 파싱하지 못했어요.");

  return { summary: { distance, duration }, path };
}
