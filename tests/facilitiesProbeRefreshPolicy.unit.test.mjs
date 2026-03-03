import assert from "node:assert/strict";
import test from "node:test";

import { shouldRefreshFacilityProbe } from "../lib/facilitiesProbeRefreshPolicy.ts";

const BASE = {
  center: { lat: 37.5, lng: 127.0 },
  zoom: 15,
  clampGridDeg: 0.001,
  minMoveM: 150,
};

test("first call refreshes when anchor is absent", () => {
  const result = shouldRefreshFacilityProbe({
    ...BASE,
    lastAnchor: null,
  });

  assert.equal(result.shouldRefresh, true);
});

test("movement below threshold after clamp does not refresh", () => {
  const result = shouldRefreshFacilityProbe({
    ...BASE,
    center: { lat: 37.5004, lng: 127.0004 },
    lastAnchor: {
      center: { lat: 37.5, lng: 127.0 },
      zoom: 15,
    },
  });

  assert.equal(result.shouldRefresh, false);
});

test("movement above threshold refreshes", () => {
  const result = shouldRefreshFacilityProbe({
    ...BASE,
    center: { lat: 37.502, lng: 127.0 },
    lastAnchor: {
      center: { lat: 37.5, lng: 127.0 },
      zoom: 15,
    },
  });

  assert.equal(result.shouldRefresh, true);
});

test("zoom change refreshes even when movement is below threshold", () => {
  const result = shouldRefreshFacilityProbe({
    ...BASE,
    center: { lat: 37.5001, lng: 127.0001 },
    zoom: 16,
    lastAnchor: {
      center: { lat: 37.5, lng: 127.0 },
      zoom: 15,
    },
  });

  assert.equal(result.shouldRefresh, true);
});

test("force option always refreshes", () => {
  const result = shouldRefreshFacilityProbe({
    ...BASE,
    center: { lat: 37.5001, lng: 127.0001 },
    lastAnchor: {
      center: { lat: 37.5, lng: 127.0 },
      zoom: 15,
    },
    force: true,
  });

  assert.equal(result.shouldRefresh, true);
});
