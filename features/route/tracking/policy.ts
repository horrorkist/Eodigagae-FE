import type { LatLng } from "@/types/mapEvents";
import {
  ROUTE_REDRAW_MIN_MOVE_M,
  ROUTE_REROUTE_PROMPT_COOLDOWN_MS,
  ROUTE_REROUTE_PROMPT_DISTANCE_M,
} from "./constants.ts";
import { haversineMeters } from "./path.ts";

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
  prevProjected: LatLng | null;
  prevProgressSegIdx: number | null;
  progressedSegIdx: number;
  projected: LatLng;
  redrawMinMoveM?: number;
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

export function shouldSkipRouteRedraw({
  isOffRoute,
  wasOffRoute,
  prevProjected,
  prevProgressSegIdx,
  progressedSegIdx,
  projected,
  redrawMinMoveM = ROUTE_REDRAW_MIN_MOVE_M,
}: RouteRedrawSkipConditionInput) {
  if (isOffRoute || wasOffRoute) return false;
  if (!prevProjected || prevProgressSegIdx == null) return false;
  if (progressedSegIdx !== prevProgressSegIdx) return false;

  return haversineMeters(prevProjected, projected) < redrawMinMoveM;
}
