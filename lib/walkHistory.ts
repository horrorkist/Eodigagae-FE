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
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
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
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0분";

  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${totalMinutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
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

const DEFAULT_MOCK_SESSION_PATTERN: MockSessionPattern[] = [
  { daysAgo: 0, hour: 7, minute: 40, durationSec: 42 * 60, distanceM: 2800 },
  { daysAgo: 1, hour: 19, minute: 10, durationSec: 48 * 60, distanceM: 3100 },
  { daysAgo: 2, hour: 8, minute: 15, durationSec: 37 * 60, distanceM: 2400 },
  { daysAgo: 3, hour: 18, minute: 40, durationSec: 55 * 60, distanceM: 3700 },
  { daysAgo: 4, hour: 7, minute: 50, durationSec: 29 * 60, distanceM: 1900 },
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
