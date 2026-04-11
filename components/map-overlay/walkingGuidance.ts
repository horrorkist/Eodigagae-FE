"use client";

import { projectPointToSegmentMeters } from "../../lib/geo.ts";
import type { RouteGuidanceStep } from "../../domain/route/types.ts";
import { haversineMeters } from "../../features/route/tracking/path.ts";
import type { LatLng } from "../../types/mapEvents.ts";

export const STEP_REACHED_DISTANCE_M = 20;
const GUIDANCE_FORWARD_PROGRESS_EPSILON_M = 0.01;

export type GuidanceDisplayStep = {
  title: string;
  subtitle: string | null;
};

export type RouteProgressGuidanceStep = RouteGuidanceStep & {
  distanceAlongRouteM: number;
  snapDistM: number;
  segmentIndex: number;
};

type ProgressCandidate = {
  distanceAlongRouteM: number;
  snapDistM: number;
  segmentIndex: number;
};

function normalizeText(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toLatLng(coordinate: [number, number]): LatLng {
  return {
    lat: coordinate[1],
    lng: coordinate[0],
  };
}

function buildCumulativeDistances(path: [number, number][]) {
  const cumulativeDistancesM = [0];

  for (let i = 0; i < path.length - 1; i += 1) {
    const segmentLengthM = haversineMeters(toLatLng(path[i]), toLatLng(path[i + 1]));
    cumulativeDistancesM.push(cumulativeDistancesM[i] + segmentLengthM);
  }

  return cumulativeDistancesM;
}

function compareProgressCandidate(a: ProgressCandidate, b: ProgressCandidate) {
  if (a.snapDistM !== b.snapDistM) {
    return a.snapDistM - b.snapDistM;
  }

  return a.distanceAlongRouteM - b.distanceAlongRouteM;
}

function pickProgressCandidate(
  candidates: ProgressCandidate[],
  previousDistanceAlongRouteM: number | null,
) {
  if (candidates.length === 0) return null;

  const forwardCandidates =
    previousDistanceAlongRouteM == null
      ? candidates
      : candidates.filter(
          (candidate) =>
            candidate.distanceAlongRouteM >
            previousDistanceAlongRouteM + GUIDANCE_FORWARD_PROGRESS_EPSILON_M,
        );
  const pool = forwardCandidates.length > 0 ? forwardCandidates : candidates;

  return pool.reduce((best, candidate) =>
    compareProgressCandidate(candidate, best) < 0 ? candidate : best,
  );
}

function findProgressCandidates(
  path: [number, number][],
  coordinate: [number, number],
  cumulativeDistancesM: number[],
) {
  const point = toLatLng(coordinate);
  const candidates: ProgressCandidate[] = [];

  for (let i = 0; i < path.length - 1; i += 1) {
    const start = toLatLng(path[i]);
    const end = toLatLng(path[i + 1]);
    const segmentLengthM =
      cumulativeDistancesM[i + 1] - cumulativeDistancesM[i];
    const projection = projectPointToSegmentMeters(point, start, end);

    candidates.push({
      distanceAlongRouteM: cumulativeDistancesM[i] + segmentLengthM * projection.t,
      snapDistM: projection.distM,
      segmentIndex: i,
    });
  }

  return candidates;
}

export function getWalkingGuidanceSteps(
  guidance?: RouteGuidanceStep[] | null,
): RouteGuidanceStep[] {
  return (guidance ?? []).filter((step) => step.pointType !== "SP");
}

export function buildRouteProgressGuidanceSteps(params: {
  path?: [number, number][] | null;
  guidance?: RouteGuidanceStep[] | null;
}): RouteProgressGuidanceStep[] {
  const { path, guidance } = params;
  const steps = getWalkingGuidanceSteps(guidance);
  if (!path || path.length < 2 || steps.length === 0) return [];

  const cumulativeDistancesM = buildCumulativeDistances(path);
  const progressSteps: RouteProgressGuidanceStep[] = [];
  let previousDistanceAlongRouteM: number | null = null;

  for (const step of steps) {
    const candidates = findProgressCandidates(
      path,
      step.coordinate,
      cumulativeDistancesM,
    );
    const bestCandidate = pickProgressCandidate(
      candidates,
      previousDistanceAlongRouteM,
    );
    if (!bestCandidate) return [];

    progressSteps.push({
      ...step,
      distanceAlongRouteM: bestCandidate.distanceAlongRouteM,
      snapDistM: bestCandidate.snapDistM,
      segmentIndex: bestCandidate.segmentIndex,
    });
    previousDistanceAlongRouteM = bestCandidate.distanceAlongRouteM;
  }

  return progressSteps;
}

export function getGuidanceTitle(step: RouteGuidanceStep) {
  if (step.pointType === "EP") {
    return "목적지 근처예요";
  }

  return (
    normalizeText(step.description) ??
    normalizeText(step.direction) ??
    normalizeText(step.guidePointName) ??
    normalizeText(step.intersectionName) ??
    normalizeText(step.nearPoiName) ??
    "경로를 따라 이동해 주세요"
  );
}

export function getGuidanceSubtitle(step: RouteGuidanceStep, title: string) {
  const candidates = [
    normalizeText(step.guidePointName),
    normalizeText(step.intersectionName),
    normalizeText(step.nearPoiName),
  ];

  for (const candidate of candidates) {
    if (candidate && candidate !== title) {
      return candidate;
    }
  }

  if (step.pointType === "EP") {
    return "안내를 마무리하고 있어요";
  }

  return null;
}

export function toDisplayStep(step: RouteGuidanceStep): GuidanceDisplayStep {
  const title = getGuidanceTitle(step);
  return {
    title,
    subtitle: getGuidanceSubtitle(step, title),
  };
}

export function resolveCurrentGuidanceIndex(params: {
  steps: RouteGuidanceStep[];
  myPos: LatLng | null;
  lastResolvedIndex: number;
  stepReachedDistanceM?: number;
}) {
  const {
    steps,
    myPos,
    lastResolvedIndex,
    stepReachedDistanceM = STEP_REACHED_DISTANCE_M,
  } = params;

  if (steps.length === 0) return null;

  const startIndex = Math.min(Math.max(0, lastResolvedIndex), steps.length - 1);
  if (!myPos) return startIndex;

  let closestIndex = startIndex;
  let closestDistanceM = Number.POSITIVE_INFINITY;

  for (let i = startIndex; i < steps.length; i += 1) {
    const distanceM = haversineMeters(myPos, toLatLng(steps[i].coordinate));
    if (distanceM < closestDistanceM) {
      closestDistanceM = distanceM;
      closestIndex = i;
    }
  }

  if (
    closestDistanceM <= stepReachedDistanceM &&
    closestIndex < steps.length - 1
  ) {
    return closestIndex + 1;
  }

  return closestIndex;
}

export function resolveCurrentGuidanceIndexFromProgress(params: {
  steps: RouteProgressGuidanceStep[];
  progressM: number | null;
  lastResolvedIndex: number;
  stepReachedDistanceM?: number;
}) {
  const {
    steps,
    progressM,
    lastResolvedIndex,
    stepReachedDistanceM = STEP_REACHED_DISTANCE_M,
  } = params;

  if (steps.length === 0) return null;

  let nextIndex = Math.min(Math.max(0, lastResolvedIndex), steps.length - 1);
  if (progressM == null) return nextIndex;

  while (
    nextIndex < steps.length - 1 &&
    progressM >= steps[nextIndex].distanceAlongRouteM - stepReachedDistanceM
  ) {
    nextIndex += 1;
  }

  return nextIndex;
}
