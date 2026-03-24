import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRouteRecommendResponse,
  getUpstreamRouteRecommendError,
  mapUpstreamRouteToRecommendation,
  normalizeUpstreamRoutes,
  parseRouteRecommendRequest,
} from "../lib/strollRouteRecommend.ts";

const RAW_ROUTE = {
  strollId: "550e8400-e29b-41d4-a716-446655440000",
  strollName: "추천 경로 1",
  totalDistance: 3170,
  estimatedTime: 30,
  matchScore: 97.5,
  path: [
    { latitude: 37.5, longitude: 127.0 },
    { latitude: 37.5005, longitude: 127.0007 },
    { latitude: 37.501, longitude: 127.001 },
  ],
  waypoints: [
    {
      name: "중간 포인트",
      category: "park",
      latitude: 37.5005,
      longitude: 127.0007,
      sequence: 1,
    },
  ],
  navigationGuides: [
    {
      pointName: "삼성월드타워",
      description: "삼성월드타워아파트에서 좌회전",
      turnType: 1,
      latitude: 37.5172,
      longitude: 127.0473,
    },
  ],
};

test("parseRouteRecommendRequest validates request payload", () => {
  const parsed = parseRouteRecommendRequest({
    latitude: 37.5,
    longitude: 127.0,
    dogSize: "MEDIUM",
    dogAge: 24,
    walkingTime: 30,
    walkingDistance: 2.1,
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.deepEqual(parsed.value, {
    latitude: 37.5,
    longitude: 127.0,
    dogSize: "MEDIUM",
    dogAge: 24,
    walkingTime: 30,
    walkingDistance: 2.1,
  });
});

test("normalizeUpstreamRoutes accepts object and array payloads", () => {
  const single = normalizeUpstreamRoutes(RAW_ROUTE);
  const multi = normalizeUpstreamRoutes([RAW_ROUTE, RAW_ROUTE]);

  assert.equal(single?.length, 1);
  assert.equal(multi?.length, 2);
});

test("mapUpstreamRouteToRecommendation maps upstream route shape", () => {
  const recommendation = mapUpstreamRouteToRecommendation(RAW_ROUTE, 0);

  assert.ok(recommendation);
  assert.equal(recommendation?.id, RAW_ROUTE.strollId);
  assert.equal(recommendation?.title, RAW_ROUTE.strollName);
  assert.equal(recommendation?.displayLabel, "경로 1");
  assert.equal(recommendation?.source, "stroll-api");
  assert.equal(recommendation?.route.summary?.distance, 3170);
  assert.equal(recommendation?.route.summary?.duration, 1800);
  assert.deepEqual(recommendation?.route.path[0], [127.0, 37.5]);
  assert.equal(recommendation?.waypoint.title, "중간 포인트");
  assert.equal(recommendation?.waypoint.lat, 37.5005);
  assert.equal(recommendation?.waypoint.lng, 127.0007);
  assert.equal(recommendation?.route.guidance?.[0].name, "삼성월드타워");
  assert.equal(
    recommendation?.route.guidance?.[0].description,
    "삼성월드타워아파트에서 좌회전",
  );
});

test("buildRouteRecommendResponse fills minimal meta from request", () => {
  const response = buildRouteRecommendResponse([RAW_ROUTE], {
    latitude: 37.5,
    longitude: 127.0,
    dogSize: "SMALL",
    dogAge: 12,
    walkingDistance: 2.5,
  });

  assert.ok(response);
  assert.deepEqual(response?.meta, {
    poiCount: 0,
    candidateCount: 1,
    shortlistCount: 1,
    validatedCount: 1,
    temperature: 0,
    targetMinKm: 2.5,
    targetMaxKm: 2.5,
  });
});

test("buildRouteRecommendResponse returns null for invalid upstream shape", () => {
  const response = buildRouteRecommendResponse(
    [
      {
        strollId: "route-1",
        strollName: "broken",
        totalDistance: 1000,
        estimatedTime: 10,
        path: [{ latitude: 37.5 }],
      },
    ],
    {
      latitude: 37.5,
      longitude: 127.0,
      dogSize: "MEDIUM",
      dogAge: 24,
    },
  );

  assert.equal(response, null);
});

test("getUpstreamRouteRecommendError prefers upstream message", () => {
  assert.equal(
    getUpstreamRouteRecommendError({ message: "upstream failed" }, 500),
    "upstream failed",
  );
  assert.equal(
    getUpstreamRouteRecommendError(null, 500),
    "추천 경로 요청에 실패했어요. (HTTP 500)",
  );
});
