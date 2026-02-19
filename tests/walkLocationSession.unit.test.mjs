import assert from "node:assert/strict";
import test from "node:test";

import {
  accumulatePausedTotalMs,
  computePausedDurationMs,
  toLatLngFromCoords,
} from "../features/walk/location/session.ts";

test("toLatLngFromCoords returns null for missing coordinates", () => {
  assert.equal(toLatLngFromCoords(null), null);
  assert.equal(toLatLngFromCoords({ latitude: 37.5 }), null);
  assert.equal(toLatLngFromCoords({ longitude: 127.0 }), null);
});

test("toLatLngFromCoords returns LatLng for valid coordinates", () => {
  assert.deepEqual(toLatLngFromCoords({ latitude: 37.5, longitude: 127.0 }), {
    lat: 37.5,
    lng: 127,
  });
});

test("computePausedDurationMs is non-negative", () => {
  assert.equal(computePausedDurationMs(null, 1000), 0);
  assert.equal(computePausedDurationMs(1200, 1000), 0);
  assert.equal(computePausedDurationMs(900, 1000), 100);
});

test("accumulatePausedTotalMs sums paused duration", () => {
  assert.equal(accumulatePausedTotalMs(1000, 800, 1000), 1200);
});

