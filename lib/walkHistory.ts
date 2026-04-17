import type { RoutePlanningSource } from "@/types/routePlanning";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type WalkHistoryEntry = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceM: number;
  source: RoutePlanningSource | null;
};

export type HistoryViewRecord = {
  id: string;
  walkedAt: string;
  dateLabel: string;
  distanceLabel: string;
  durationLabel: string;
};

export type ActualHistoryView = {
  todaySummary: {
    walkedAt: string | null;
    durationLabel: string;
    distanceLabel: string;
  };
  totalDays: string;
  totalDuration: string;
  totalDistance: string;
  previousWalks: HistoryViewRecord[];
  streakDays: number;
};

export type RecentWalkComparisonMetricView = {
  currentLabel: string;
  averageLabel: string;
  message: string;
  direction: "up" | "down" | "flat";
  deltaPercentLabel: string | null;
};

export type RecentWalkComparisonView = {
  title: string;
  description: string;
  hasComparison: boolean;
  emptyMessage: string | null;
  comparedWalkCount: number;
  duration: RecentWalkComparisonMetricView | null;
  distance: RecentWalkComparisonMetricView | null;
};

export type RecentWalkChartDatum = {
  dateKey: string;
  dateLabel: string;
  distanceM: number;
  durationSec: number;
  isCurrentDay: boolean;
};

type MockSessionPattern = {
  daysAgo: number;
  hour: number;
  minute: number;
  durationSec: number;
  distanceM: number;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function startOfDay(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWalkDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  return [
    String(date.getFullYear()),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
}

function getWalkDateLabel(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getMonth() + 1}.${pad2(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDayIndex(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_IN_MS;
}

export function getStreakDays(walkedAtValues: string[]) {
  const uniqueDateKeys = [...new Set(walkedAtValues.map(getWalkDateKey))].sort(
    (a, b) => getDayIndex(b) - getDayIndex(a),
  );

  if (uniqueDateKeys.length === 0) return 0;

  let streakDays = 1;

  for (let index = 1; index < uniqueDateKeys.length; index += 1) {
    const previousDay = getDayIndex(uniqueDateKeys[index - 1]);
    const currentDay = getDayIndex(uniqueDateKeys[index]);

    if (previousDay - currentDay !== 1) break;

    streakDays += 1;
  }

  return streakDays;
}

export function formatHistoryDistanceLabel(distanceM: number) {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return "0m";
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(1)}km`;
  return `${Math.round(distanceM)}m`;
}

export function formatHistoryDurationLabel(durationSec: number) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "00:00";

  const totalSeconds = Math.floor(durationSec);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours === 0) {
    return `${pad2(minutes)}:${pad2(seconds)}`;
  }

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function buildComparisonMessage(params: {
  currentValue: number;
  averageValue: number;
  flatTolerance: number;
  upMessage: string;
  downMessage: string;
}) {
  const { currentValue, averageValue, flatTolerance, upMessage, downMessage } =
    params;
  const diff = currentValue - averageValue;

  if (Math.abs(diff) <= flatTolerance) {
    return {
      direction: "flat" as const,
      message: "평균과 비슷해요",
    };
  }

  if (diff > 0) {
    return {
      direction: "up" as const,
      message: upMessage,
    };
  }

  return {
    direction: "down" as const,
    message: downMessage,
  };
}

function buildComparisonPercentLabel(params: {
  currentValue: number;
  averageValue: number;
  direction: "up" | "down" | "flat";
}) {
  const { currentValue, averageValue, direction } = params;
  if (!Number.isFinite(averageValue) || averageValue <= 0) {
    return direction === "flat" ? "0%" : null;
  }

  const rawPercent = Math.abs(((currentValue - averageValue) / averageValue) * 100);
  const roundedPercent = Math.max(1, Math.round(rawPercent));
  return `${direction === "up" ? "+" : "-"}${roundedPercent}%`;
}

function buildComparisonMetricView(params: {
  currentValue: number;
  averageValue: number;
  flatTolerance: number;
  formatter: (value: number) => string;
  upMessage: string;
  downMessage: string;
}): RecentWalkComparisonMetricView {
  const { currentValue, averageValue, flatTolerance, formatter, upMessage, downMessage } =
    params;
  const direction = buildComparisonMessage({
    currentValue,
    averageValue,
    flatTolerance,
    upMessage,
    downMessage,
  });

  return {
    currentLabel: formatter(currentValue),
    averageLabel: formatter(averageValue),
    message: direction.message,
    direction: direction.direction,
    deltaPercentLabel: buildComparisonPercentLabel({
      currentValue,
      averageValue,
      direction: direction.direction,
    }),
  };
}

export function calculateWalkingDurationSec(params: {
  startedAtMs: number | null;
  endedAtMs: number;
  walkingPaused: boolean;
  walkingPausedAt: number | null;
  walkingPausedTotalMs: number;
}) {
  const {
    startedAtMs,
    endedAtMs,
    walkingPaused,
    walkingPausedAt,
    walkingPausedTotalMs,
  } = params;

  if (startedAtMs == null) return 0;

  const effectivePausedTotalMs =
    walkingPaused && walkingPausedAt != null
      ? walkingPausedTotalMs + Math.max(0, endedAtMs - walkingPausedAt)
      : walkingPausedTotalMs;

  const elapsedMs = Math.max(
    0,
    endedAtMs - startedAtMs - Math.max(0, effectivePausedTotalMs),
  );

  return Math.floor(elapsedMs / 1000);
}

export function createWalkHistoryEntry(params: {
  startedAtMs: number;
  endedAtMs: number;
  durationSec: number;
  distanceM: number;
  source: RoutePlanningSource | null;
}) {
  const { startedAtMs, endedAtMs, durationSec, distanceM, source } = params;

  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${endedAtMs}-${Math.random().toString(36).slice(2, 10)}`,
    startedAt: new Date(startedAtMs).toISOString(),
    endedAt: new Date(endedAtMs).toISOString(),
    durationSec,
    distanceM,
    source,
  } satisfies WalkHistoryEntry;
}

export function buildRecentWalkComparisonView(params: {
  entries: WalkHistoryEntry[];
  currentWalk: Pick<
    WalkHistoryEntry,
    "startedAt" | "endedAt" | "durationSec" | "distanceM"
  >;
}): RecentWalkComparisonView {
  const { entries, currentWalk } = params;
  const endedAt = new Date(currentWalk.endedAt);
  const rangeStart = startOfDay(
    new Date(endedAt.getFullYear(), endedAt.getMonth(), endedAt.getDate() - 6),
  ).getTime();
  const rangeEnd = endedAt.getTime();
  const comparisonEntries = entries.filter((entry) => {
    if (
      entry.startedAt === currentWalk.startedAt &&
      entry.endedAt === currentWalk.endedAt
    ) {
      return false;
    }

    const entryEndedAtMs = new Date(entry.endedAt).getTime();
    return entryEndedAtMs >= rangeStart && entryEndedAtMs < rangeEnd;
  });

  if (comparisonEntries.length === 0) {
    return {
      title: "지난 7일과 비교했어요",
      description: "최근 7일의 산책 기록과 비교한 결과예요.",
      hasComparison: false,
      emptyMessage: "지난 기록이 더 쌓이면 비교해드릴게요.",
      comparedWalkCount: 0,
      duration: null,
      distance: null,
    };
  }

  const averageDurationSec =
    comparisonEntries.reduce((sum, entry) => sum + entry.durationSec, 0) /
    comparisonEntries.length;
  const averageDistanceM =
    comparisonEntries.reduce((sum, entry) => sum + entry.distanceM, 0) /
    comparisonEntries.length;

  return {
    title: "지난 7일과 비교했어요",
    description: `지난 7일 기록 ${comparisonEntries.length}회 기준이에요.`,
    hasComparison: true,
    emptyMessage: null,
    comparedWalkCount: comparisonEntries.length,
    duration: buildComparisonMetricView({
      currentValue: currentWalk.durationSec,
      averageValue: averageDurationSec,
      flatTolerance: 5 * 60,
      formatter: formatHistoryDurationLabel,
      upMessage: "평균보다 더 길어요",
      downMessage: "평균보다 더 짧아요",
    }),
    distance: buildComparisonMetricView({
      currentValue: currentWalk.distanceM,
      averageValue: averageDistanceM,
      flatTolerance: 300,
      formatter: formatHistoryDistanceLabel,
      upMessage: "평균보다 더 멀리 걸었어요",
      downMessage: "평균보다 덜 걸었어요",
    }),
  };
}

export function buildRecentWalkChartData(params: {
  entries: WalkHistoryEntry[];
  currentWalk: Pick<
    WalkHistoryEntry,
    "startedAt" | "endedAt" | "durationSec" | "distanceM"
  >;
}): RecentWalkChartDatum[] {
  const { entries, currentWalk } = params;
  const currentEndedAt = new Date(currentWalk.endedAt);
  const currentDateStart = startOfDay(currentEndedAt);
  const rangeStart = addDays(currentDateStart, -6);
  const currentWalkKey = `${currentWalk.startedAt}:${currentWalk.endedAt}`;
  const byDate = new Map<
    string,
    {
      date: Date;
      distanceM: number;
      durationSec: number;
    }
  >();

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(rangeStart, offset);
    const dateKey = getWalkDateKey(date);
    byDate.set(dateKey, {
      date,
      distanceM: 0,
      durationSec: 0,
    });
  }

  for (const entry of entries) {
    const entryKey = `${entry.startedAt}:${entry.endedAt}`;
    if (entryKey === currentWalkKey) continue;

    const entryEndedAt = new Date(entry.endedAt);
    if (entryEndedAt < rangeStart || entryEndedAt > currentEndedAt) continue;

    const dateKey = getWalkDateKey(entryEndedAt);
    const bucket = byDate.get(dateKey);
    if (!bucket) continue;
    bucket.distanceM += entry.distanceM;
    bucket.durationSec += entry.durationSec;
  }

  const currentDateKey = getWalkDateKey(currentEndedAt);
  const currentBucket = byDate.get(currentDateKey);
  if (currentBucket) {
    currentBucket.distanceM += currentWalk.distanceM;
    currentBucket.durationSec += currentWalk.durationSec;
  }

  return Array.from(byDate.entries()).map(([dateKey, bucket]) => ({
    dateKey,
    dateLabel:
      dateKey === currentDateKey ? "오늘" : getWalkDateLabel(bucket.date),
    distanceM: bucket.distanceM,
    durationSec: bucket.durationSec,
    isCurrentDay: dateKey === currentDateKey,
  }));
}

const DEFAULT_MOCK_SESSION_PATTERN: MockSessionPattern[] = [
  { daysAgo: 0, hour: 7, minute: 40, durationSec: 42 * 60, distanceM: 2800 },
  { daysAgo: 1, hour: 19, minute: 10, durationSec: 48 * 60, distanceM: 3100 },
  { daysAgo: 2, hour: 8, minute: 15, durationSec: 54 * 60, distanceM: 3900 },
  { daysAgo: 2, hour: 18, minute: 35, durationSec: 33 * 60, distanceM: 2700 },
  { daysAgo: 3, hour: 18, minute: 40, durationSec: 55 * 60, distanceM: 3700 },
  { daysAgo: 5, hour: 18, minute: 5, durationSec: 41 * 60, distanceM: 2600 },
  { daysAgo: 6, hour: 8, minute: 30, durationSec: 46 * 60, distanceM: 3000 },
  { daysAgo: 7, hour: 18, minute: 25, durationSec: 34 * 60, distanceM: 2200 },
  { daysAgo: 8, hour: 7, minute: 40, durationSec: 52 * 60, distanceM: 3400 },
  { daysAgo: 9, hour: 19, minute: 0, durationSec: 43 * 60, distanceM: 2800 },
  { daysAgo: 10, hour: 8, minute: 5, durationSec: 26 * 60, distanceM: 1700 },
  { daysAgo: 11, hour: 18, minute: 50, durationSec: 58 * 60, distanceM: 3600 },
  { daysAgo: 12, hour: 9, minute: 10, durationSec: 39 * 60, distanceM: 2500 },
  { daysAgo: 13, hour: 18, minute: 15, durationSec: 50 * 60, distanceM: 3300 },
  { daysAgo: 14, hour: 7, minute: 55, durationSec: 32 * 60, distanceM: 2100 },
];

function shiftDate(baseDate: Date, daysAgo: number, hour: number, minute: number) {
  const shifted = new Date(baseDate);
  shifted.setHours(hour, minute, 0, 0);
  shifted.setDate(shifted.getDate() - daysAgo);
  return shifted;
}

export function generateMockWalkHistoryEntries(now = new Date()) {
  return DEFAULT_MOCK_SESSION_PATTERN.map((pattern) => {
    const endedAt = shiftDate(now, pattern.daysAgo, pattern.hour, pattern.minute);
    const startedAt = new Date(endedAt.getTime() - pattern.durationSec * 1000);

    return {
      id: `mock-${getWalkDateKey(endedAt)}-${pad2(pattern.hour)}${pad2(pattern.minute)}`,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSec: pattern.durationSec,
      distanceM: pattern.distanceM,
      source: "dog-recommend",
    } satisfies WalkHistoryEntry;
  });
}

function toHistoryViewRecord(entry: WalkHistoryEntry): HistoryViewRecord {
  return {
    id: entry.id,
    walkedAt: entry.endedAt,
    dateLabel: getWalkDateLabel(entry.endedAt),
    distanceLabel: formatHistoryDistanceLabel(entry.distanceM),
    durationLabel: formatHistoryDurationLabel(entry.durationSec),
  };
}

export function buildActualHistoryView(
  entries: WalkHistoryEntry[],
  now = new Date(),
): ActualHistoryView {
  const todayDateKey = getWalkDateKey(now);
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
  );
  const todayEntries = sortedEntries.filter(
    (entry) => getWalkDateKey(entry.endedAt) === todayDateKey,
  );
  const totalDistanceM = sortedEntries.reduce(
    (sum, entry) => sum + entry.distanceM,
    0,
  );
  const totalDurationSec = sortedEntries.reduce(
    (sum, entry) => sum + entry.durationSec,
    0,
  );
  const totalDays = new Set(sortedEntries.map((entry) => getWalkDateKey(entry.endedAt)))
    .size;
  const todayDistanceM = todayEntries.reduce(
    (sum, entry) => sum + entry.distanceM,
    0,
  );
  const todayDurationSec = todayEntries.reduce(
    (sum, entry) => sum + entry.durationSec,
    0,
  );

  return {
    todaySummary: {
      walkedAt: todayEntries[0]?.endedAt ?? null,
      durationLabel: formatHistoryDurationLabel(todayDurationSec),
      distanceLabel: formatHistoryDistanceLabel(todayDistanceM),
    },
    totalDays: `${totalDays}일`,
    totalDuration: formatHistoryDurationLabel(totalDurationSec),
    totalDistance: formatHistoryDistanceLabel(totalDistanceM),
    previousWalks: sortedEntries.map(toHistoryViewRecord),
    streakDays: getStreakDays(sortedEntries.map((entry) => entry.endedAt)),
  };
}
