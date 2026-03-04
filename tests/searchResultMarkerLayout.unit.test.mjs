import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSearchResultMarkerLayout,
  SEARCH_RESULT_SPIDERFY_BASE_RADIUS_M,
  SEARCH_RESULT_SPIDERFY_MAX_PER_RING,
  SEARCH_RESULT_SPIDERFY_RING_GAP_M,
} from "../lib/searchResultMarkerLayout.ts";

const BASE_LAT = 37.501;
const BASE_LNG = 127.002;

function createInput(index, lat = BASE_LAT, lng = BASE_LNG) {
  return {
    key: `poi:${index}`,
    baseLat: lat,
    baseLng: lng,
  };
}

function distanceMeters(fromLat, fromLng, toLat, toLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

test("buildSearchResultMarkerLayout spiderfies 9 overlapped points into unique render positions", () => {
  const inputs = Array.from({ length: 9 }, (_, i) => createInput(i));

  const layout = buildSearchResultMarkerLayout(inputs, {
    spiderfy: true,
  });

  assert.equal(layout.length, 9);

  const dedup = new Set(
    layout.map((point) => `${point.renderLat.toFixed(7)}:${point.renderLng.toFixed(7)}`),
  );
  assert.equal(dedup.size, 9);
});

test("buildSearchResultMarkerLayout keeps a single point unchanged", () => {
  const input = [createInput(0)];

  const layout = buildSearchResultMarkerLayout(input, {
    spiderfy: true,
  });

  assert.equal(layout.length, 1);
  assert.equal(layout[0].renderLat, BASE_LAT);
  assert.equal(layout[0].renderLng, BASE_LNG);
});

test("buildSearchResultMarkerLayout uses multi-ring placement for 17 overlapped points", () => {
  const inputs = Array.from({ length: 17 }, (_, i) => createInput(i));

  const layout = buildSearchResultMarkerLayout(inputs, {
    spiderfy: true,
  });

  assert.equal(layout.length, 17);

  const radii = layout.map((point) =>
    Math.round(distanceMeters(BASE_LAT, BASE_LNG, point.renderLat, point.renderLng)),
  );

  const firstRingExpected = Math.round(SEARCH_RESULT_SPIDERFY_BASE_RADIUS_M);
  const secondRingExpected = Math.round(
    SEARCH_RESULT_SPIDERFY_BASE_RADIUS_M + SEARCH_RESULT_SPIDERFY_RING_GAP_M,
  );
  const thirdRingExpected = Math.round(
    SEARCH_RESULT_SPIDERFY_BASE_RADIUS_M + SEARCH_RESULT_SPIDERFY_RING_GAP_M * 2,
  );

  const firstRingCount = radii.filter((radius) => Math.abs(radius - firstRingExpected) <= 1).length;
  const secondRingCount = radii.filter((radius) => Math.abs(radius - secondRingExpected) <= 1).length;
  const thirdRingCount = radii.filter((radius) => Math.abs(radius - thirdRingExpected) <= 1).length;

  assert.equal(firstRingCount, SEARCH_RESULT_SPIDERFY_MAX_PER_RING);
  assert.equal(secondRingCount, SEARCH_RESULT_SPIDERFY_MAX_PER_RING);
  assert.equal(thirdRingCount, 1);
});
