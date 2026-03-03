import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFacilityPoisForMarkers } from "../lib/facilityPoiNormalization.ts";

function createFountainPoi(overrides = {}) {
  return {
    id: "fountain:37.5001:127.0001:공원음수대",
    source: "fountain",
    title: "공원 음수대",
    category: "음수대",
    address: "서울시 동작구",
    lat: 37.5001,
    lng: 127.0001,
    distanceM: 100,
    thumbnailUrl: null,
    meta: {
      source: "fountain",
      item: {
        fountainName: "공원 음수대",
        address: "서울시 동작구",
        latitude: 37.5001,
        longitude: 127.0001,
        managedBy: "동작구청",
      },
    },
    ...overrides,
  };
}

function createTrashPoi(overrides = {}) {
  return {
    id: "trash-bin:37.5001:127.0001:강남대로",
    source: "trash-bin",
    title: "강남역 11번 출구 앞",
    category: "쓰레기통",
    address: "서울특별시 강남구 강남대로 396",
    lat: 37.5001,
    lng: 127.0001,
    distanceM: 120,
    thumbnailUrl: null,
    meta: {
      source: "trash-bin",
      item: {
        cityName: "강남구",
        address: "서울특별시 강남구 강남대로 396",
        locationDesc: "강남역 11번 출구 앞",
        latitude: 37.5001,
        longitude: 127.0001,
        binType: "일반쓰레기",
      },
    },
    ...overrides,
  };
}

test("normalizeFacilityPoisForMarkers dedupes same source/same core fields", () => {
  const input = [
    createTrashPoi(),
    createTrashPoi({ id: "trash-bin:dup1" }),
    createTrashPoi({ id: "trash-bin:dup2" }),
  ];

  const normalized = normalizeFacilityPoisForMarkers(input);
  assert.equal(normalized.length, 1);
});

test("normalizeFacilityPoisForMarkers filters invalid coordinates", () => {
  const input = [
    createFountainPoi(),
    createFountainPoi({
      id: "fountain:invalid",
      lat: Number.NaN,
      lng: 127.11,
    }),
    createTrashPoi({
      id: "trash-bin:invalid",
      lat: 37.5,
      lng: Number.NaN,
    }),
  ];

  const normalized = normalizeFacilityPoisForMarkers(input);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].poi.source, "fountain");
});

test("normalizeFacilityPoisForMarkers keeps different sources at same coordinate", () => {
  const input = [
    createFountainPoi(),
    createTrashPoi(),
  ];

  const normalized = normalizeFacilityPoisForMarkers(input);
  assert.equal(normalized.length, 2);
  assert.notEqual(normalized[0].key, normalized[1].key);
});
