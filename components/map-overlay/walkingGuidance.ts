"use client";

import type { RouteGuidanceStep } from "../../domain/route/types.ts";
import { haversineMeters } from "../../features/route/tracking/path.ts";
import type { LatLng } from "../../types/mapEvents.ts";

export const STEP_REACHED_DISTANCE_M = 20;

export type GuidanceDisplayStep = {
  title: string;
  subtitle: string | null;
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

export function getWalkingGuidanceSteps(
  guidance?: RouteGuidanceStep[] | null,
): RouteGuidanceStep[] {
  return (guidance ?? []).filter((step) => step.pointType !== "SP");
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

export function getGuidanceSubtitle(
  step: RouteGuidanceStep,
  title: string,
) {
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

  const startIndex = Math.min(
    Math.max(0, lastResolvedIndex),
    steps.length - 1,
  );
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
