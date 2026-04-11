"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import AppIcon from "@/components/icons/AppIcon";
import { appIconChevronDown } from "@/components/icons/definitions.generated";
import type { RouteGuidanceStep } from "@/domain/route/types";
import type { LatLng } from "@/types/mapEvents";
import {
  buildRouteProgressGuidanceSteps,
  getWalkingGuidanceSteps,
  resolveCurrentGuidanceIndex,
  resolveCurrentGuidanceIndexFromProgress,
  toDisplayStep,
} from "./walkingGuidance";

type WalkingGuidanceOverlayProps = {
  topOffsetPx: number;
  myPos: LatLng | null;
  path?: [number, number][] | null;
  routeProgressM?: number | null;
  progressMode?: "position" | "route-progress";
  guidance?: RouteGuidanceStep[] | null;
  hidden: boolean;
  onToggleHidden: () => void;
};

export default function WalkingGuidanceOverlay({
  topOffsetPx,
  myPos,
  path,
  routeProgressM = null,
  progressMode = "position",
  guidance,
  hidden,
  onToggleHidden,
}: WalkingGuidanceOverlayProps) {
  const steps = useMemo(() => getWalkingGuidanceSteps(guidance), [guidance]);
  const progressSteps = useMemo(
    () => buildRouteProgressGuidanceSteps({ path, guidance }),
    [guidance, path],
  );
  const resolvedSteps = progressMode === "route-progress" ? progressSteps : steps;
  const lastResolvedIndexRef = useRef(0);
  const [resolvedIndex, dispatchResolvedIndex] = useReducer(
    (_: number, nextIndex: number) => nextIndex,
    0,
  );

  useEffect(() => {
    lastResolvedIndexRef.current = 0;
    dispatchResolvedIndex(0);
  }, [progressMode, progressSteps, steps]);

  useEffect(() => {
    const nextIndex =
      progressMode === "route-progress"
        ? resolveCurrentGuidanceIndexFromProgress({
            steps: progressSteps,
            progressM: routeProgressM,
            lastResolvedIndex: lastResolvedIndexRef.current,
          })
        : resolveCurrentGuidanceIndex({
            steps,
            myPos,
            lastResolvedIndex: lastResolvedIndexRef.current,
          });
    if (nextIndex == null || nextIndex === lastResolvedIndexRef.current) return;

    lastResolvedIndexRef.current = nextIndex;
    dispatchResolvedIndex(nextIndex);
  }, [myPos, progressMode, progressSteps, routeProgressM, steps]);

  const currentIndex =
    resolvedSteps.length > 0
      ? Math.min(resolvedIndex, resolvedSteps.length - 1)
      : null;

  const currentStep = useMemo(() => {
    if (currentIndex == null) return null;
    return toDisplayStep(resolvedSteps[currentIndex]);
  }, [currentIndex, resolvedSteps]);

  const nextStep = useMemo(() => {
    if (currentIndex == null) return null;
    const next = resolvedSteps[currentIndex + 1];
    return next ? toDisplayStep(next) : null;
  }, [currentIndex, resolvedSteps]);

  if (!currentStep) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{ top: topOffsetPx }}
    >
      <div className="px-3">
        {hidden ? (
          <div className="mx-auto flex max-w-[360px] justify-end">
            <button
              type="button"
              onClick={onToggleHidden}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-dg-black shadow-lg shadow-black/15 backdrop-blur"
            >
              <span>안내 보기</span>
              <AppIcon
                icon={appIconChevronDown}
                className="h-3 w-3 -rotate-180"
              />
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[360px] flex-col gap-3 rounded-2xl bg-white/95 px-4 py-4 text-dg-black shadow-lg shadow-black/15 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
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
              <button
                type="button"
                onClick={onToggleHidden}
                className="pointer-events-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-dg-gray-200 px-2.5 py-1 text-xs font-medium text-dg-gray-700 active:bg-dg-gray-300"
              >
                <span>숨기기</span>
                <AppIcon icon={appIconChevronDown} className="h-3 w-3" />
              </button>
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
        )}
      </div>
    </div>
  );
}
