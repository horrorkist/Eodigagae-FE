import type { LatLng } from "@/types/mapEvents";

const WALK_UPDATE_INTERVAL_MS = 1000;
const MAX_WALK_ACCURACY_M = 50;
const MIN_WALK_MOVE_M = 1.5;
const WALK_MOVE_FROM_ACCURACY_RATIO = 0.35;
const WALK_MOVE_FROM_ACCURACY_MAX_M = 7;
const WALK_LOW_SPEED_MPS = 0.8;
const WALK_LOW_SPEED_MIN_MOVE_M = 5;
const WALK_LOW_SPEED_MOVE_MAX_M = 8;
const WALK_LOW_SPEED_MOVE_FROM_ACCURACY_RATIO = 0.6;
const WALK_STATIONARY_DRIFT_MIN_M = 8;
const WALK_STATIONARY_DRIFT_MAX_M = 16;
const WALK_STATIONARY_DRIFT_FROM_ACCURACY_RATIO = 1.0;
const WALK_SPEED_VALID_MAX_ACCURACY_M = 15;

export type EvaluateWalkSampleParams = {
  nowMs: number;
  lastWalkAtMs: number;
  accuracyM: number | null;
  rawSpeedMps: number | null;
  lastPos: LatLng | null;
  nextPos: LatLng;
  lowSpeedAnchorPos: LatLng | null;
};

export type EvaluateWalkSampleResult = {
  accept: boolean;
  movedM: number;
  speedMps: number | null;
  nextLowSpeedAnchorPos: LatLng | null;
  distanceToAddM: number;
};

export function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

export function evaluateWalkSample(
  params: EvaluateWalkSampleParams,
): EvaluateWalkSampleResult {
  const {
    nowMs,
    lastWalkAtMs,
    accuracyM,
    rawSpeedMps,
    lastPos,
    nextPos,
    lowSpeedAnchorPos,
  } = params;

  if (accuracyM != null && accuracyM > MAX_WALK_ACCURACY_M) {
    return {
      accept: false,
      movedM: 0,
      speedMps: null,
      nextLowSpeedAnchorPos: lowSpeedAnchorPos,
      distanceToAddM: 0,
    };
  }

  const sinceLastMs = nowMs - lastWalkAtMs;
  if (sinceLastMs < WALK_UPDATE_INTERVAL_MS) {
    return {
      accept: false,
      movedM: 0,
      speedMps: null,
      nextLowSpeedAnchorPos: lowSpeedAnchorPos,
      distanceToAddM: 0,
    };
  }

  const movedM = lastPos ? haversineMeters(lastPos, nextPos) : 0;
  const speedMps =
    rawSpeedMps != null &&
    (accuracyM ?? Number.POSITIVE_INFINITY) <= WALK_SPEED_VALID_MAX_ACCURACY_M
      ? rawSpeedMps
      : null;
  const lowSpeedMoveThresholdM = Math.max(
    WALK_LOW_SPEED_MIN_MOVE_M,
    Math.min(
      WALK_LOW_SPEED_MOVE_MAX_M,
      Math.max(0, (accuracyM ?? 0) * WALK_LOW_SPEED_MOVE_FROM_ACCURACY_RATIO),
    ),
  );
  const accuracyMoveThresholdM = Math.min(
    WALK_MOVE_FROM_ACCURACY_MAX_M,
    Math.max(0, (accuracyM ?? 0) * WALK_MOVE_FROM_ACCURACY_RATIO),
  );
  const moveThresholdM = Math.max(MIN_WALK_MOVE_M, accuracyMoveThresholdM);
  const isLowSpeed = speedMps == null || speedMps < WALK_LOW_SPEED_MPS;

  if (lastPos && movedM < moveThresholdM) {
    return {
      accept: false,
      movedM,
      speedMps,
      nextLowSpeedAnchorPos: lowSpeedAnchorPos,
      distanceToAddM: 0,
    };
  }

  let nextAnchor = lowSpeedAnchorPos;

  if (lastPos && isLowSpeed) {
    const anchor = lowSpeedAnchorPos ?? lastPos;
    nextAnchor = anchor;

    const stationaryDriftThresholdM = Math.max(
      WALK_STATIONARY_DRIFT_MIN_M,
      Math.min(
        WALK_STATIONARY_DRIFT_MAX_M,
        Math.max(0, (accuracyM ?? 0) * WALK_STATIONARY_DRIFT_FROM_ACCURACY_RATIO),
      ),
    );
    const driftFromAnchorM = haversineMeters(anchor, nextPos);

    if (movedM < lowSpeedMoveThresholdM || driftFromAnchorM < stationaryDriftThresholdM) {
      return {
        accept: false,
        movedM,
        speedMps,
        nextLowSpeedAnchorPos: nextAnchor,
        distanceToAddM: 0,
      };
    }
  }

  const distanceToAddM = lastPos && movedM <= 80 ? movedM : 0;
  nextAnchor = nextPos;

  return {
    accept: true,
    movedM,
    speedMps,
    nextLowSpeedAnchorPos: nextAnchor,
    distanceToAddM,
  };
}

