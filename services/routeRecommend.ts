import type { LatLng } from "@/types/mapEvents";
import type { DogInfoFormDraft } from "@/stores/dogStore";
import type { RouteRecommendResponse } from "@/types/routeRecommend";

type FetchRouteRecommendParams = {
  start: LatLng;
  draft: DogInfoFormDraft;
};

function toDogSize(breed: DogInfoFormDraft["breed"]) {
  if (breed === "소형견") return "SMALL";
  if (breed === "중형견") return "MEDIUM";
  return "LARGE";
}

function toAgeInMonths(draft: DogInfoFormDraft) {
  if (draft.ageUnit === "months") return Number(draft.age);
  return Number(draft.age) * 12;
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
  const res = await fetch("/api/routes/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      latitude: start.lat,
      longitude: start.lng,
      dogSize: toDogSize(draft.breed),
      dogAge: toAgeInMonths(draft),
      ...(draft.walkDurationMinutes > 0
        ? { walkingTime: Number(draft.walkDurationMinutes) }
        : {}),
      ...(draft.walkDistanceKm > 0
        ? { walkingDistance: Number(draft.walkDistanceKm) }
        : {}),
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
