import type {
  RouteGuidanceStep,
  RouteResult,
  RouteSegment,
} from "@/stores/mapStore";
import type { TmapPedestrianPointType } from "@/types/tmapPedestrian";

type UnknownRecord = Record<string, unknown>;
const TMAP_POINT_TYPES = new Set<TmapPedestrianPointType>([
  "SP",
  "EP",
  "PP",
  "PP1",
  "PP2",
  "PP3",
  "PP4",
  "PP5",
  "GP",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readNumberFromRecord(
  record: UnknownRecord,
  key: string,
): number | undefined {
  return toFiniteNumber(record[key]);
}

function readStringFromRecord(
  record: UnknownRecord,
  key: string,
): string | undefined {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readCoord(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lng = toFiniteNumber(value[0]);
  const lat = toFiniteNumber(value[1]);
  if (lng == null || lat == null) return null;
  return [lng, lat];
}

function readCoords(value: unknown): [number, number][] {
  if (!Array.isArray(value)) return [];

  const coords: [number, number][] = [];
  for (const item of value) {
    const coord = readCoord(item);
    if (coord) coords.push(coord);
  }
  return coords;
}

function readPointType(value: unknown): TmapPedestrianPointType | undefined {
  if (typeof value !== "string") return undefined;
  return TMAP_POINT_TYPES.has(value as TmapPedestrianPointType)
    ? (value as TmapPedestrianPointType)
    : undefined;
}

export function extractTmapPedestrian(data: unknown): RouteResult {
  const root = isRecord(data) ? data : {};
  const features = Array.isArray(root.features) ? root.features : [];

  const path: [number, number][] = [];
  const guidance: RouteGuidanceStep[] = [];
  const segments: RouteSegment[] = [];

  let distance =
    readNumberFromRecord(root, "totalDistance") ??
    readNumberFromRecord(root, "distance");
  let duration =
    readNumberFromRecord(root, "totalTime") ??
    readNumberFromRecord(root, "time") ??
    readNumberFromRecord(root, "duration");
  let pointFeatureCount = 0;
  let lineFeatureCount = 0;

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
        readNumberFromRecord(props, "time") ??
        readNumberFromRecord(props, "duration") ??
        readNumberFromRecord(root, "totalTime") ??
        readNumberFromRecord(root, "time") ??
        readNumberFromRecord(root, "duration");
      if (t != null) duration = t;
    }

    if (g?.type === "Point") {
      pointFeatureCount += 1;

      const coordinate = readCoord(g.coordinates);
      if (!coordinate) continue;

      const nearPoiX = readNumberFromRecord(props, "nearPoiX");
      const nearPoiY = readNumberFromRecord(props, "nearPoiY");

      guidance.push({
        order: guidance.length,
        coordinate,
        index: readNumberFromRecord(props, "index"),
        pointIndex: readNumberFromRecord(props, "pointIndex"),
        name: readStringFromRecord(props, "name"),
        guidePointName: readStringFromRecord(props, "guidePointName"),
        description: readStringFromRecord(props, "description"),
        direction: readStringFromRecord(props, "direction"),
        intersectionName: readStringFromRecord(props, "intersectionName"),
        nearPoiName: readStringFromRecord(props, "nearPoiName"),
        nearPoi:
          nearPoiX != null && nearPoiY != null ? [nearPoiX, nearPoiY] : undefined,
        crossName: readStringFromRecord(props, "crossName"),
        turnType: readNumberFromRecord(props, "turnType"),
        pointType: readPointType(props.pointType),
      });
      continue;
    }

    if (g?.type === "LineString") {
      lineFeatureCount += 1;

      const lineCoords = readCoords(g.coordinates);
      if (lineCoords.length === 0) continue;

      path.push(...lineCoords);

      const first = lineCoords[0];
      const last = lineCoords[lineCoords.length - 1];
      segments.push({
        order: segments.length,
        index: readNumberFromRecord(props, "index"),
        lineIndex: readNumberFromRecord(props, "lineIndex"),
        name: readStringFromRecord(props, "name"),
        roadName: readStringFromRecord(props, "roadName"),
        description: readStringFromRecord(props, "description"),
        distance: readNumberFromRecord(props, "distance"),
        duration:
          readNumberFromRecord(props, "time") ??
          readNumberFromRecord(props, "duration"),
        roadType: readNumberFromRecord(props, "roadType"),
        categoryRoadType: readNumberFromRecord(props, "categoryRoadType"),
        facilityType: readNumberFromRecord(props, "facilityType"),
        facilityName: readStringFromRecord(props, "facilityName"),
        coordinateCount: lineCoords.length,
        start: [first[0], first[1]],
        end: [last[0], last[1]],
      });
      continue;
    }
  }

  const startPoint =
    guidance.find((step) => step.pointType === "SP") ?? guidance[0];
  const endPoint =
    guidance.find((step) => step.pointType === "EP") ??
    guidance[guidance.length - 1];

  const endpoints =
    startPoint || endPoint
      ? {
          start: startPoint,
          end: endPoint,
        }
      : undefined;

  const featureStats = {
    totalFeatures: features.length,
    pointFeatures: pointFeatureCount,
    lineFeatures: lineFeatureCount,
  };

  if (path.length === 0) {
    if (guidance.length > 0) {
      throw new Error(
        "TMAP 도보 응답은 받았지만 경로 선분(LineString)을 찾지 못했어요.",
      );
    }
    throw new Error("TMAP 도보 경로 좌표를 파싱하지 못했어요.");
  }

  return {
    summary: { distance, duration },
    path,
    guidance,
    segments,
    endpoints,
    featureStats,
  };
}
