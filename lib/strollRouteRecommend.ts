import type { RouteGuidanceStep, RouteResult } from "@/domain/route/types";
import type {
  RouteRecommendation,
  RouteRecommendMeta,
  RouteRecommendResponse,
  RouteRecommendationSource,
  RouteWaypoint,
} from "@/types/routeRecommend";

const VALID_DOG_SIZES = new Set(["SMALL", "MEDIUM", "LARGE"]);

export type StrollDogSize = "SMALL" | "MEDIUM" | "LARGE";

export type RouteRecommendRequest = {
  latitude: number;
  longitude: number;
  dogSize: StrollDogSize;
  dogAge: number;
  walkingTime?: number;
  walkingDistance?: number;
};

export type UpstreamWaypoint = {
  name?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  sequence?: number;
};

export type UpstreamNavigationGuide = {
  pointName?: string;
  description?: string;
  turnType?: number;
  latitude?: number;
  longitude?: number;
};

export type UpstreamStrollRoute = {
  strollId?: string;
  strollName?: string;
  totalDistance?: number;
  estimatedTime?: number;
  matchScore?: number;
  path?: Array<{ latitude?: number; longitude?: number }>;
  waypoints?: UpstreamWaypoint[];
  navigationGuides?: UpstreamNavigationGuide[];
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalPositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = toFiniteNumber(value);
  if (parsed == null || parsed <= 0) return null;
  return parsed;
}

function isValidLatitude(value: number) {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return value >= -180 && value <= 180;
}

export function parseRouteRecommendRequest(
  value: unknown,
): ParseResult<RouteRecommendRequest> {
  if (!isRecord(value)) {
    return { ok: false, message: "Invalid JSON body" };
  }

  const latitude = toFiniteNumber(value.latitude);
  const longitude = toFiniteNumber(value.longitude);
  const dogAge = toFiniteNumber(value.dogAge);

  if (latitude == null || !isValidLatitude(latitude)) {
    return { ok: false, message: "latitude must be a valid coordinate" };
  }
  if (longitude == null || !isValidLongitude(longitude)) {
    return { ok: false, message: "longitude must be a valid coordinate" };
  }
  if (
    typeof value.dogSize !== "string" ||
    !VALID_DOG_SIZES.has(value.dogSize)
  ) {
    return { ok: false, message: "dogSize must be SMALL, MEDIUM, or LARGE" };
  }
  if (dogAge == null || dogAge < 0) {
    return { ok: false, message: "dogAge must be a non-negative number" };
  }

  const walkingTime = toOptionalPositiveNumber(value.walkingTime);
  if (value.walkingTime != null && walkingTime == null) {
    return { ok: false, message: "walkingTime must be a positive number" };
  }

  const walkingDistance = toOptionalPositiveNumber(value.walkingDistance);
  if (value.walkingDistance != null && walkingDistance == null) {
    return { ok: false, message: "walkingDistance must be a positive number" };
  }

  return {
    ok: true,
    value: {
      latitude,
      longitude,
      dogSize: value.dogSize as StrollDogSize,
      dogAge,
      ...(walkingTime != null ? { walkingTime } : {}),
      ...(walkingDistance != null ? { walkingDistance } : {}),
    },
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function toLngLatPath(
  path: UpstreamStrollRoute["path"],
): [number, number][] | null {
  if (!Array.isArray(path)) return null;

  const out: [number, number][] = [];
  for (const point of path) {
    const latitude = toFiniteNumber(point?.latitude);
    const longitude = toFiniteNumber(point?.longitude);

    if (latitude == null || longitude == null) continue;
    out.push([longitude, latitude]);
  }

  return out.length >= 2 ? out : null;
}

function toGuidanceSteps(
  guides: UpstreamStrollRoute["navigationGuides"],
): RouteGuidanceStep[] {
  if (!Array.isArray(guides)) return [];

  const out: RouteGuidanceStep[] = [];
  for (const guide of guides) {
    const latitude = toFiniteNumber(guide?.latitude);
    const longitude = toFiniteNumber(guide?.longitude);
    if (latitude == null || longitude == null) continue;

    out.push({
      order: out.length,
      coordinate: [longitude, latitude],
      name: readString(guide?.pointName) ?? undefined,
      description: readString(guide?.description) ?? undefined,
      turnType: toFiniteNumber(guide?.turnType) ?? undefined,
    });
  }

  return out;
}

function pickFallbackWaypoint(
  path: [number, number][],
  strollName: string,
): RouteWaypoint {
  const fallbackCoord =
    path[Math.min(1, path.length - 1)] ?? path[0] ?? [0, 0];

  return {
    lat: fallbackCoord[1],
    lng: fallbackCoord[0],
    title: strollName,
    source: "stroll-api",
  };
}

function toWaypoint(
  rawWaypoints: UpstreamStrollRoute["waypoints"],
  path: [number, number][],
  strollName: string,
): RouteWaypoint {
  if (Array.isArray(rawWaypoints)) {
    const sorted = [...rawWaypoints].sort((a, b) => {
      const left = toFiniteNumber(a?.sequence) ?? Number.MAX_SAFE_INTEGER;
      const right = toFiniteNumber(b?.sequence) ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    });

    for (const waypoint of sorted) {
      const latitude = toFiniteNumber(waypoint?.latitude);
      const longitude = toFiniteNumber(waypoint?.longitude);
      if (latitude == null || longitude == null) continue;

      return {
        lat: latitude,
        lng: longitude,
        title: readString(waypoint?.name) ?? strollName,
        source: "stroll-api",
      };
    }
  }

  return pickFallbackWaypoint(path, strollName);
}

export function normalizeUpstreamRoutes(
  payload: unknown,
): UpstreamStrollRoute[] | null {
  if (Array.isArray(payload)) {
    return payload.every((item) => isRecord(item))
      ? (payload as UpstreamStrollRoute[])
      : null;
  }

  if (isRecord(payload)) {
    return [payload as UpstreamStrollRoute];
  }

  return null;
}

export function mapUpstreamRouteToRecommendation(
  route: UpstreamStrollRoute,
  index: number,
): RouteRecommendation | null {
  const strollId = readString(route.strollId);
  const strollName = readString(route.strollName);
  const totalDistance = toFiniteNumber(route.totalDistance);
  const estimatedTime = toFiniteNumber(route.estimatedTime);
  const path = toLngLatPath(route.path);

  if (
    strollId == null ||
    strollName == null ||
    totalDistance == null ||
    estimatedTime == null ||
    path == null
  ) {
    return null;
  }

  const source: RouteRecommendationSource = "stroll-api";
  const waypoint = toWaypoint(route.waypoints, path, strollName);
  const guidance = toGuidanceSteps(route.navigationGuides);
  const routeResult: RouteResult = {
    summary: {
      distance: totalDistance,
      duration: estimatedTime * 60,
    },
    path,
    guidance,
    segments: [],
  };

  return {
    id: strollId,
    title: strollName,
    displayLabel: `경로 ${index + 1}`,
    source,
    waypoint,
    route: routeResult,
    metrics: {
      score: toFiniteNumber(route.matchScore) ?? 0,
      distanceFit: 0,
      poiBoost: 0,
    },
  };
}

export function buildRouteRecommendResponse(
  routes: UpstreamStrollRoute[],
  request: RouteRecommendRequest,
): RouteRecommendResponse | null {
  const recommendations = routes
    .map((route, index) => mapUpstreamRouteToRecommendation(route, index))
    .filter((item): item is RouteRecommendation => item != null);

  if (recommendations.length !== routes.length) {
    return null;
  }

  const meta: RouteRecommendMeta = {
    poiCount: 0,
    candidateCount: recommendations.length,
    shortlistCount: recommendations.length,
    validatedCount: recommendations.length,
    temperature: 0,
    targetMinKm: request.walkingDistance ?? 0,
    targetMaxKm: request.walkingDistance ?? 0,
  };

  return { recommendations, meta };
}

export function getUpstreamRouteRecommendError(payload: unknown, status: number) {
  if (isRecord(payload)) {
    for (const key of ["error", "detail", "message"]) {
      const message = readString(payload[key]);
      if (message) return message;
    }
  }

  return `추천 경로 요청에 실패했어요. (HTTP ${status})`;
}

export function describeFirstItemShape(value: unknown) {
  if (!isRecord(value)) return null;
  return Object.keys(value).sort();
}
