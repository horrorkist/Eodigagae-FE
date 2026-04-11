import { bus } from "@/lib/eventBus";
import {
  calculateWalkingDurationSec,
  createWalkHistoryEntry,
} from "@/lib/walkHistory";
import { useMapStore } from "@/stores/mapStore";
import { useWalkCompletionStore } from "@/stores/walkCompletionStore";
import { useWalkHistoryStore } from "@/stores/walkHistoryStore";

let lastStopRequestedStartedAt: number | null = null;

export function requestWalkStop() {
  const mapState = useMapStore.getState();
  if (!mapState.walking) return;
  if (
    mapState.walkingStartedAt != null &&
    lastStopRequestedStartedAt === mapState.walkingStartedAt
  ) {
    return;
  }

  lastStopRequestedStartedAt = mapState.walkingStartedAt;
  const endedAtMs = Date.now();
  const durationSec = calculateWalkingDurationSec({
    startedAtMs: mapState.walkingStartedAt,
    endedAtMs,
    walkingPaused: mapState.walkingPaused,
    walkingPausedAt: mapState.walkingPausedAt,
    walkingPausedTotalMs: mapState.walkingPausedTotalMs,
  });
  const summarySource = mapState.routeExperienceSource;

  if (summarySource === "dog-recommend" && mapState.walkingStartedAt != null) {
    useWalkCompletionStore.getState().setSummary({
      startedAt: new Date(mapState.walkingStartedAt).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
      durationSec,
      distanceM: mapState.walkedDistanceM,
      source: summarySource,
    });
  } else {
    useWalkCompletionStore.getState().clearSummary();
  }

  if (
    summarySource === "dog-recommend" &&
    mapState.walkingStartedAt != null &&
    durationSec > 0
  ) {
    useWalkHistoryStore.getState().appendEntry(
      createWalkHistoryEntry({
        startedAtMs: mapState.walkingStartedAt,
        endedAtMs,
        durationSec,
        distanceM: mapState.walkedDistanceM,
        source: summarySource,
      }),
    );
  }

  bus.emit({ channel: "map", type: "STOP_WALKING" });
}
