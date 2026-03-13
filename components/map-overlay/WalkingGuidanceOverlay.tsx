"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import type { RouteGuidanceStep } from "@/domain/route/types";
import { haversineMeters } from "@/features/route/tracking/path";
import type { LatLng } from "@/types/mapEvents";

const STEP_REACHED_DISTANCE_M = 20;

type WalkingGuidanceOverlayProps = {
  topOffsetPx: number;
  myPos: LatLng | null;
  guidance?: RouteGuidanceStep[] | null;
};

type GuidanceDisplayStep = {
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

function getGuidanceTitle(step: RouteGuidanceStep) {
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

function getGuidanceSubtitle(step: RouteGuidanceStep, title: string) {
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

function toDisplayStep(step: RouteGuidanceStep): GuidanceDisplayStep {
  const title = getGuidanceTitle(step);
  return {
    title,
    subtitle: getGuidanceSubtitle(step, title),
  };
}

function resolveCurrentGuidanceIndex(params: {
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

export default function WalkingGuidanceOverlay({
  topOffsetPx,
  myPos,
  guidance,
}: WalkingGuidanceOverlayProps) {
  const steps = useMemo(
    () => (guidance ?? []).filter((step) => step.pointType !== "SP"),
    [guidance],
  );
  const lastResolvedIndexRef = useRef(0);
  const [resolvedIndex, dispatchResolvedIndex] = useReducer(
    (_: number, nextIndex: number) => nextIndex,
    0,
  );

  useEffect(() => {
    lastResolvedIndexRef.current = 0;
    dispatchResolvedIndex(0);
  }, [steps]);

  useEffect(() => {
    const nextIndex = resolveCurrentGuidanceIndex({
      steps,
      myPos,
      lastResolvedIndex: lastResolvedIndexRef.current,
    });
    if (nextIndex == null || nextIndex === lastResolvedIndexRef.current) return;

    lastResolvedIndexRef.current = nextIndex;
    dispatchResolvedIndex(nextIndex);
  }, [myPos, steps]);

  const currentIndex =
    steps.length > 0 ? Math.min(resolvedIndex, steps.length - 1) : null;

  const currentStep = useMemo(() => {
    if (currentIndex == null) return null;
    return toDisplayStep(steps[currentIndex]);
  }, [currentIndex, steps]);

  const nextStep = useMemo(() => {
    if (currentIndex == null) return null;
    const next = steps[currentIndex + 1];
    return next ? toDisplayStep(next) : null;
  }, [currentIndex, steps]);

  if (!currentStep) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{ top: topOffsetPx }}
    >
      <div className="px-3">
        <div className="mx-auto flex max-w-[360px] flex-col gap-3 rounded-2xl bg-white/95 px-4 py-4 text-dg-black shadow-lg shadow-black/15 backdrop-blur">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium text-dg-gray-600">
              현재 안내
            </div>
            <div className="text-center text-base font-semibold leading-6">
              {currentStep.title}
            </div>
            {currentStep.subtitle ? (
              <div className="text-center text-sm text-dg-gray-600">
                {currentStep.subtitle}
              </div>
            ) : null}
          </div>

          {nextStep ? (
            <div className="border-t border-dg-gray-400 pt-3">
              <div className="text-center text-xs font-medium text-dg-gray-600">
                다음 안내
              </div>
              <div className="mt-1 text-center text-sm font-medium leading-5 text-dg-black">
                {nextStep.title}
              </div>
              {nextStep.subtitle ? (
                <div className="mt-1 text-center text-xs text-dg-gray-600">
                  {nextStep.subtitle}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
