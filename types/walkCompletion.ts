import type { RoutePlanningSource } from "@/types/routePlanning";

export type WalkCompletionSummary = {
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceM: number;
  source: RoutePlanningSource | null;
};
