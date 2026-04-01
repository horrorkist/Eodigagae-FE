import {
  ROUTE_ARRIVAL_PROMPT_DISTANCE_M,
  ROUTE_ARRIVAL_PROMPT_EXIT_DISTANCE_M,
  ROUTE_ARRIVAL_ROUND_TRIP_PROGRESS_RATIO,
  ROUTE_REDRAW_MIN_MOVE_M,
  ROUTE_REROUTE_PROMPT_COOLDOWN_MS,
  ROUTE_REROUTE_PROMPT_DISTANCE_M,
} from "./constants.ts";
import { haversineMeters } from "./path.ts";
import type { TrackingCursor } from "./matcher.ts";

export type ReroutePromptConditionInput = {
  isOffRoute: boolean;
  snapDistM: number;
  promptShown: boolean;
  routeLoading: boolean;
  isModalOpen: boolean;
  lastPromptAt: number;
  now: number;
  promptDistanceM?: number;
  promptCooldownMs?: number;
};

export type RouteRedrawSkipConditionInput = {
  isOffRoute: boolean;
  wasOffRoute: boolean;
  prevCursor: TrackingCursor | null;
  cursor: TrackingCursor;
  redrawMinMoveM?: number;
};

export type ArrivalPromptConditionInput = {
  walking: boolean;
  remainingDistanceM: number;
  promptShown: boolean;
  suppressedUntilExit: boolean;
  isModalOpen: boolean;
  isRoundTrip: boolean;
  progressRatio: number;
  arrivalDistanceM?: number;
  roundTripProgressRatio?: number;
};

export type ArrivalPromptResetConditionInput = {
  remainingDistanceM: number;
  exitDistanceM?: number;
};

export function shouldPromptReroute({
  isOffRoute,
  snapDistM,
  promptShown,
  routeLoading,
  isModalOpen,
  lastPromptAt,
  now,
  promptDistanceM = ROUTE_REROUTE_PROMPT_DISTANCE_M,
  promptCooldownMs = ROUTE_REROUTE_PROMPT_COOLDOWN_MS,
}: ReroutePromptConditionInput) {
  return (
    isOffRoute &&
    snapDistM >= promptDistanceM &&
    !promptShown &&
    !routeLoading &&
    !isModalOpen &&
    now - lastPromptAt > promptCooldownMs
  );
}

export function shouldPromptArrival({
  walking,
  remainingDistanceM,
  promptShown,
  suppressedUntilExit,
  isModalOpen,
  isRoundTrip,
  progressRatio,
  arrivalDistanceM = ROUTE_ARRIVAL_PROMPT_DISTANCE_M,
  roundTripProgressRatio = ROUTE_ARRIVAL_ROUND_TRIP_PROGRESS_RATIO,
}: ArrivalPromptConditionInput) {
  if (!walking) return false;
  if (remainingDistanceM > arrivalDistanceM) return false;
  if (promptShown || suppressedUntilExit || isModalOpen) return false;
  if (isRoundTrip && progressRatio < roundTripProgressRatio) return false;

  return true;
}

export function shouldResetArrivalPrompt({
  remainingDistanceM,
  exitDistanceM = ROUTE_ARRIVAL_PROMPT_EXIT_DISTANCE_M,
}: ArrivalPromptResetConditionInput) {
  return remainingDistanceM > exitDistanceM;
}

export function shouldSkipRouteRedraw({
  isOffRoute,
  wasOffRoute,
  prevCursor,
  cursor,
  redrawMinMoveM = ROUTE_REDRAW_MIN_MOVE_M,
}: RouteRedrawSkipConditionInput) {
  if (isOffRoute || wasOffRoute) return false;
  if (!prevCursor) return false;

  const progressDeltaM = Math.max(
    0,
    cursor.distanceAlongRouteM - prevCursor.distanceAlongRouteM,
  );
  if (progressDeltaM >= redrawMinMoveM) return false;

  return haversineMeters(prevCursor.projected, cursor.projected) < redrawMinMoveM;
}
