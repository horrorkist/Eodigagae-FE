import type { LatLng } from "@/types/mapEvents";
import type { DogInfoFormDraft } from "@/stores/dogStore";
import type {
  RouteRecommendation,
  RouteRecommendResponse,
} from "@/types/routeRecommend";

const DEFAULT_MIN_KM = 1.2;
const DEFAULT_MAX_KM = 2.5;
const DURATION_SPEED_KM_PER_MIN = 4 / 60;
const DUMMY_WALK_SPEED_M_PER_SEC = 1.1;
// TODO: 경로 추천 알고리즘 안정화 전까지 더미 경로를 기본으로 사용합니다.
const USE_DUMMY_ROUTE_RECOMMEND = true;

type FetchRouteRecommendParams = {
  start: LatLng;
  draft: DogInfoFormDraft;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function pathDistanceMeters(path: [number, number][]) {
  let sum = 0;

  for (let i = 1; i < path.length; i++) {
    sum += haversineMeters(
      { lat: path[i - 1][1], lng: path[i - 1][0] },
      { lat: path[i][1], lng: path[i][0] },
    );
  }

  return sum;
}

function scoreDistance(distanceM: number, minM: number, maxM: number) {
  if (distanceM >= minM && distanceM <= maxM) return 1;

  const edge = distanceM < minM ? minM : maxM;
  const diff = Math.abs(distanceM - edge);
  const tolerance = Math.max(500, (maxM - minM) * 0.75);

  return Math.max(0, 1 - diff / tolerance);
}

function offsetPoint(start: LatLng, distanceM: number, bearingDeg: number): LatLng {
  const bearing = toRadians(bearingDeg);
  const dLat = (distanceM / 111_320) * Math.cos(bearing);
  const cosLat = Math.max(Math.cos(toRadians(start.lat)), 0.1);
  const dLng = (distanceM / (111_320 * cosLat)) * Math.sin(bearing);

  return {
    lat: clamp(start.lat + dLat, -85, 85),
    lng: clamp(start.lng + dLng, -180, 180),
  };
}

function buildLoopPath(start: LatLng, baseBearingDeg: number, radiusM: number) {
  const a = offsetPoint(start, radiusM, baseBearingDeg);
  const b = offsetPoint(start, radiusM * 1.08, baseBearingDeg + 115);
  const c = offsetPoint(start, radiusM * 0.92, baseBearingDeg + 235);

  return [
    [start.lng, start.lat] as [number, number],
    [a.lng, a.lat] as [number, number],
    [b.lng, b.lat] as [number, number],
    [c.lng, c.lat] as [number, number],
    [start.lng, start.lat] as [number, number],
  ];
}

function deriveTargetRangeKm(draft: DogInfoFormDraft) {
  const walkDistanceKm = Number(draft.walkDistanceKm);
  const walkDurationMinutes = Number(draft.walkDurationMinutes);

  const fromDistance = Number.isFinite(walkDistanceKm) && walkDistanceKm > 0;
  const fromDuration =
    Number.isFinite(walkDurationMinutes) && walkDurationMinutes > 0;

  if (fromDistance) {
    const base = clamp(walkDistanceKm, 0.5, 12);
    const min = roundToSingleDecimal(clamp(base * 0.85, 0.5, 12));
    const max = roundToSingleDecimal(clamp(base * 1.2, min + 0.3, 12));
    return { minKm: min, maxKm: max };
  }

  if (fromDuration) {
    const estimatedDistanceKm = walkDurationMinutes * DURATION_SPEED_KM_PER_MIN;
    const base = clamp(estimatedDistanceKm, 0.5, 12);
    const min = roundToSingleDecimal(clamp(base * 0.85, 0.5, 12));
    const max = roundToSingleDecimal(clamp(base * 1.2, min + 0.3, 12));
    return { minKm: min, maxKm: max };
  }

  return { minKm: DEFAULT_MIN_KM, maxKm: DEFAULT_MAX_KM };
}

function buildDummyRecommendations({
  start,
  minKm,
  maxKm,
}: {
  start: LatLng;
  minKm: number;
  maxKm: number;
}): RouteRecommendation[] {
  const targetDistanceM = ((minKm + maxKm) / 2) * 1000;
  const baseRadiusM = clamp(targetDistanceM / 5.2, 120, 800);
  const variants = [
    { bearingDeg: 18, scale: 0.9 },
    { bearingDeg: 132, scale: 1.0 },
    { bearingDeg: 246, scale: 1.1 },
  ];
  const minM = minKm * 1000;
  const maxM = maxKm * 1000;

  return variants.map((variant, index) => {
    const path = buildLoopPath(start, variant.bearingDeg, baseRadiusM * variant.scale);
    const distance = Math.round(pathDistanceMeters(path));
    const duration = Math.round(distance / DUMMY_WALK_SPEED_M_PER_SEC);
    const distanceFit = scoreDistance(distance, minM, maxM);
    const waypoint = path[1];
    const score = clamp(distanceFit * 0.85 + (3 - index) * 0.05, 0, 1);

    return {
      id: `dummy-route-${Date.now()}-${index}`,
      title: `더미 산책 루프 ${index + 1}`,
      source: "synthetic",
      waypoint: {
        lat: waypoint[1],
        lng: waypoint[0],
        title: `더미 경유지 ${index + 1}`,
        source: "synthetic",
      },
      route: {
        summary: { distance, duration },
        path,
      },
      metrics: {
        score: roundToSingleDecimal(score),
        distanceFit: roundToSingleDecimal(distanceFit),
        poiBoost: 0,
      },
    };
  });
}

function isRouteRecommendResponse(value: unknown): value is RouteRecommendResponse {
  if (!value || typeof value !== "object") return false;
  const withRecs = value as { recommendations?: unknown; meta?: unknown };
  return Array.isArray(withRecs.recommendations) && !!withRecs.meta;
}

export async function fetchRouteRecommendations({
  start,
  draft,
}: FetchRouteRecommendParams): Promise<RouteRecommendResponse> {
  const { minKm, maxKm } = deriveTargetRangeKm(draft);
  if (USE_DUMMY_ROUTE_RECOMMEND) {
    const recommendations = buildDummyRecommendations({ start, minKm, maxKm });
    return {
      recommendations,
      meta: {
        poiCount: 0,
        candidateCount: recommendations.length,
        shortlistCount: recommendations.length,
        validatedCount: recommendations.length,
        temperature: 0,
        targetMinKm: minKm,
        targetMaxKm: maxKm,
      },
    };
  }

  const res = await fetch("/api/routes/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      startX: start.lng,
      startY: start.lat,
      targetMinKm: minKm,
      targetMaxKm: maxKm,
      maxResults: 3,
    }),
  });

  const payload = (await res.json()) as unknown;

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "")
        : "";
    throw new Error(message || "추천 경로를 불러오지 못했어요.");
  }

  if (!isRouteRecommendResponse(payload)) {
    throw new Error("추천 경로 응답 형식이 올바르지 않아요.");
  }

  return payload;
}
