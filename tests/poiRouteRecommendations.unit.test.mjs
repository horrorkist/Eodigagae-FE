import assert from "node:assert/strict";
import test from "node:test";

import { buildPoiRouteRecommendations } from "../lib/poiRouteRecommendations.ts";

function createPoi(overrides = {}) {
  return {
    id: "poi-1",
    source: "tmap",
    name: "테스트 장소",
    lat: 37.5,
    lng: 127.0,
    bizCategory: "공원",
    distanceM: 120,
    middleAddress: "서울 강남구",
    tel: "",
    thumbnail: "",
    ...overrides,
  };
}

function createRoute(distance, duration) {
  return {
    route: {
      summary: { distance, duration },
      path: [
        [127.0, 37.5],
        [127.001, 37.501],
      ],
    },
    rawResponse: { ok: true, distance, duration },
  };
}

test("buildPoiRouteRecommendations preserves option order and labels", () => {
  const { recommendations, errors } = buildPoiRouteRecommendations({
    poi: createPoi(),
    settledResults: [
      {
        key: "recommend",
        searchOption: 0,
        displayLabel: "추천",
        status: "fulfilled",
        value: createRoute(1000, 600),
      },
      {
        key: "wide-road",
        searchOption: 4,
        displayLabel: "대로우선",
        status: "fulfilled",
        value: createRoute(1200, 720),
      },
      {
        key: "stairs-avoid",
        searchOption: 30,
        displayLabel: "계단회피",
        status: "fulfilled",
        value: createRoute(1400, 840),
      },
    ],
  });

  assert.equal(errors.length, 0);
  assert.deepEqual(
    recommendations.map((item) => item.displayLabel),
    ["추천", "대로우선", "계단회피"],
  );
  assert.deepEqual(
    recommendations.map((item) => item.route.summary?.distance),
    [1000, 1200, 1400],
  );
});

test("buildPoiRouteRecommendations keeps successful routes on partial failure", () => {
  const { recommendations, errors } = buildPoiRouteRecommendations({
    poi: createPoi(),
    settledResults: [
      {
        key: "recommend",
        searchOption: 0,
        displayLabel: "추천",
        status: "fulfilled",
        value: createRoute(1000, 600),
      },
      {
        key: "wide-road",
        searchOption: 4,
        displayLabel: "대로우선",
        status: "rejected",
        reason: new Error("대로우선 실패"),
      },
      {
        key: "stairs-avoid",
        searchOption: 30,
        displayLabel: "계단회피",
        status: "fulfilled",
        value: createRoute(1400, 840),
      },
    ],
  });

  assert.deepEqual(
    recommendations.map((item) => item.displayLabel),
    ["추천", "계단회피"],
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /대로우선 실패/);
});
