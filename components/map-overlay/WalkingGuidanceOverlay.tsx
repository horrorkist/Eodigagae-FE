"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconChevronDown,
  appIconPaw,
  appIconXMark,
} from "@/components/icons/definitions.generated";
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
  const resolvedSteps =
    progressMode === "route-progress" ? progressSteps : steps;
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

  if (hidden) {
    return (
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{ top: topOffsetPx }}
      >
        <div className="px-3">
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
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0">
      <div className="overflow-hidden shadow-md shadow-black/15">
        <div
          className="flex min-h-[96px] items-center bg-dg-green-500 px-4 pb-4 text-white"
          style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}
        >
          <div className="flex min-w-0 flex-1 items-start gap-2 text-left">
            <AppIcon
              icon={appIconPaw}
              className="mt-1 h-4 w-4 shrink-0 text-white"
            />
            <div className="min-w-0 flex-1 text-xl font-semibold leading-6 break-words">
              {currentStep.title}
            </div>
            <button
              type="button"
              onClick={onToggleHidden}
              aria-label="안내 숨기기"
              className="pointer-events-auto inline-flex h-5 w-5 shrink-0 items-center justify-center text-white/80 active:text-white"
            >
              <AppIcon icon={appIconXMark} className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {nextStep ? (
          <div className="flex min-h-[64px] items-center bg-dg-gray-400 px-4 py-3 text-dg-gray-700/35">
            <div className="flex min-w-0 items-start gap-2 text-left">
              <AppIcon
                icon={appIconPaw}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dg-gray-700/30"
              />
              <div className="min-w-0 text-base font-medium leading-4 break-words">
                {nextStep.title}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
