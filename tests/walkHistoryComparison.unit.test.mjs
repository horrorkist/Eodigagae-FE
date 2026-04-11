import assert from "node:assert/strict";
import test from "node:test";

import { buildRecentWalkComparisonView } from "../lib/walkHistory.ts";

function makeEntry({
  id,
  startedAt,
  endedAt,
  durationSec,
  distanceM,
}) {
  return {
    id,
    startedAt,
    endedAt,
    durationSec,
    distanceM,
    source: "dog-recommend",
  };
}

test("buildRecentWalkComparisonView compares against previous 7 calendar days and excludes current walk", () => {
  const currentWalk = {
    startedAt: "2026-04-11T10:00:00.000Z",
    endedAt: "2026-04-11T10:30:00.000Z",
    durationSec: 1800,
    distanceM: 2100,
  };
  const entries = [
    makeEntry({
      id: "current",
      startedAt: currentWalk.startedAt,
      endedAt: currentWalk.endedAt,
      durationSec: currentWalk.durationSec,
      distanceM: currentWalk.distanceM,
    }),
    makeEntry({
      id: "day-1",
      startedAt: "2026-04-10T09:00:00.000Z",
      endedAt: "2026-04-10T09:20:00.000Z",
      durationSec: 1200,
      distanceM: 1500,
    }),
    makeEntry({
      id: "day-3",
      startedAt: "2026-04-08T08:00:00.000Z",
      endedAt: "2026-04-08T08:25:00.000Z",
      durationSec: 1500,
      distanceM: 1800,
    }),
    makeEntry({
      id: "same-day-earlier",
      startedAt: "2026-04-11T06:00:00.000Z",
      endedAt: "2026-04-11T06:18:00.000Z",
      durationSec: 1080,
      distanceM: 1200,
    }),
    makeEntry({
      id: "too-old",
      startedAt: "2026-04-04T07:00:00.000Z",
      endedAt: "2026-04-04T07:40:00.000Z",
      durationSec: 2400,
      distanceM: 3200,
    }),
  ];

  const view = buildRecentWalkComparisonView({
    entries,
    currentWalk,
  });

  assert.equal(view.hasComparison, true);
  assert.equal(view.comparedWalkCount, 3);
  assert.equal(view.duration?.averageLabel, "21분");
  assert.equal(view.distance?.averageLabel, "1.5km");
  assert.equal(view.duration?.message, "평균보다 더 길어요");
  assert.equal(view.distance?.message, "평균보다 더 멀리 걸었어요");
  assert.equal(view.duration?.deltaPercentLabel, "+43%");
  assert.equal(view.distance?.deltaPercentLabel, "+40%");
});

test("buildRecentWalkComparisonView returns empty state without previous entries in range", () => {
  const currentWalk = {
    startedAt: "2026-04-11T10:00:00.000Z",
    endedAt: "2026-04-11T10:30:00.000Z",
    durationSec: 1800,
    distanceM: 2100,
  };

  const view = buildRecentWalkComparisonView({
    entries: [
      makeEntry({
        id: "current",
        startedAt: currentWalk.startedAt,
        endedAt: currentWalk.endedAt,
        durationSec: currentWalk.durationSec,
        distanceM: currentWalk.distanceM,
      }),
    ],
    currentWalk,
  });

  assert.equal(view.hasComparison, false);
  assert.equal(view.comparedWalkCount, 0);
  assert.equal(view.emptyMessage, "지난 기록이 더 쌓이면 비교해드릴게요.");
  assert.equal(view.duration, null);
  assert.equal(view.distance, null);
});
