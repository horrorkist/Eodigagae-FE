import assert from "node:assert/strict";
import test from "node:test";

import {
  extractReverseGeocodeErrorMessage,
  normalizeReverseGeocodeResponse,
  parseReverseGeocodeCoords,
} from "../lib/tmapReverseGeocode.ts";

test("normalizeReverseGeocodeResponse prefers road address for display", () => {
  const result = normalizeReverseGeocodeResponse({
    addressInfo: {
      fullAddress: "서울특별시 중구 세종대로 110",
      city_do: "서울특별시",
      gu_gun: "중구",
      roadName: "세종대로",
      buildingIndex: "110",
    },
  });

  assert.deepEqual(result, {
    displayAddress: "서울특별시 중구 세종대로 110",
    roadAddress: "서울특별시 중구 세종대로 110",
    jibunAddress: null,
  });
});

test("normalizeReverseGeocodeResponse falls back to jibun address", () => {
  const result = normalizeReverseGeocodeResponse({
    addressInfo: {
      city_do: "서울특별시",
      gu_gun: "중구",
      legalDong: "태평로1가",
      bunji: "31",
    },
  });

  assert.deepEqual(result, {
    displayAddress: "서울특별시 중구 태평로1가 31",
    roadAddress: null,
    jibunAddress: "서울특별시 중구 태평로1가 31",
  });
});

test("normalizeReverseGeocodeResponse returns nulls when address is empty", () => {
  const result = normalizeReverseGeocodeResponse({
    addressInfo: {},
  });

  assert.deepEqual(result, {
    displayAddress: null,
    roadAddress: null,
    jibunAddress: null,
  });
});

test("parseReverseGeocodeCoords returns null for invalid coordinates", () => {
  const coords = parseReverseGeocodeCoords(
    new URLSearchParams({ lat: "abc", lng: "127.0" }),
  );

  assert.equal(coords, null);
});

test("parseReverseGeocodeCoords parses valid coordinates", () => {
  const coords = parseReverseGeocodeCoords(
    new URLSearchParams({ lat: "37.5665", lng: "126.9780" }),
  );

  assert.deepEqual(coords, {
    lat: 37.5665,
    lng: 126.978,
  });
});

test("extractReverseGeocodeErrorMessage prefers nested upstream message", () => {
  const message = extractReverseGeocodeErrorMessage({
    error: {
      message: "upstream failed",
    },
  });

  assert.equal(message, "upstream failed");
});

test("extractReverseGeocodeErrorMessage falls back to default message", () => {
  const message = extractReverseGeocodeErrorMessage({});

  assert.equal(message, "TMAP upstream error");
});
