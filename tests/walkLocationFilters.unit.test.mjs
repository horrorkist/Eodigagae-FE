import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWalkSample } from "../features/walk/location/filters.ts";

const BASE_POS = { lat: 37.5665, lng: 126.978 };

function moveLng(pos, deltaLng) {
  return { lat: pos.lat, lng: pos.lng + deltaLng };
}

test("evaluateWalkSample rejects when throttled", () => {
  const sample = evaluateWalkSample({
    nowMs: 1500,
    lastWalkAtMs: 1000,
    accuracyM: 10,
    rawSpeedMps: 1.1,
    lastPos: BASE_POS,
    nextPos: moveLng(BASE_POS, 0.0002),
    lowSpeedAnchorPos: null,
  });

  assert.equal(sample.accept, false);
  assert.equal(sample.rejectReason, "throttled");
});

test("evaluateWalkSample rejects inaccurate position", () => {
  const sample = evaluateWalkSample({
    nowMs: 2000,
    lastWalkAtMs: 0,
    accuracyM: 80,
    rawSpeedMps: 1.1,
    lastPos: BASE_POS,
    nextPos: moveLng(BASE_POS, 0.0002),
    lowSpeedAnchorPos: null,
  });

  assert.equal(sample.accept, false);
  assert.equal(sample.rejectReason, "accuracy-too-low");
});

test("evaluateWalkSample keeps anchor when low-speed drift is too small", () => {
  const nextPos = moveLng(BASE_POS, 0.00005);
  const sample = evaluateWalkSample({
    nowMs: 4000,
    lastWalkAtMs: 0,
    accuracyM: 5,
    rawSpeedMps: 0.2,
    lastPos: BASE_POS,
    nextPos,
    lowSpeedAnchorPos: null,
  });

  assert.equal(sample.accept, false);
  assert.deepEqual(sample.nextLowSpeedAnchorPos, BASE_POS);
  assert.equal(sample.rejectReason, "stationary-drift");
});

test("evaluateWalkSample accepts valid movement and returns additive distance", () => {
  const nextPos = moveLng(BASE_POS, 0.00012);
  const sample = evaluateWalkSample({
    nowMs: 5000,
    lastWalkAtMs: 0,
    accuracyM: 5,
    rawSpeedMps: 1.2,
    lastPos: BASE_POS,
    nextPos,
    lowSpeedAnchorPos: null,
  });

  assert.equal(sample.accept, true);
  assert.equal(sample.speedMps, 1.2);
  assert.ok(sample.movedM > 0);
  assert.ok(sample.distanceToAddM > 0);
  assert.deepEqual(sample.nextLowSpeedAnchorPos, nextPos);
  assert.equal(sample.rejectReason, null);
});

test("evaluateWalkSample nulls speed when accuracy is above speed threshold", () => {
  const sample = evaluateWalkSample({
    nowMs: 3000,
    lastWalkAtMs: 0,
    accuracyM: 20,
    rawSpeedMps: 2.1,
    lastPos: null,
    nextPos: BASE_POS,
    lowSpeedAnchorPos: null,
  });

  assert.equal(sample.accept, true);
  assert.equal(sample.speedMps, null);
  assert.equal(sample.rejectReason, null);
});
