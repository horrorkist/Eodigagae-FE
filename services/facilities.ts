import type { FountainItem, TrashBinItem } from "@/types/facilities";

const DEFAULT_SIZE = 200;

export type FacilityEndpoint = "fountains" | "trash-bins";

export type FacilityProbeResponse<TItem> = {
  meta: {
    endpoint: FacilityEndpoint;
    request: Record<string, number>;
    upstreamStatus: number | null;
    receivedAt: number;
  };
  items: TItem[];
  raw: Record<string, unknown> | unknown[] | null;
  error: string | null;
};

type BoundsParams = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  size?: number;
};

type TrashBinsParams = BoundsParams & {
  centerLat: number;
  centerLng: number;
};

type RequestOptions = {
  signal?: AbortSignal;
};

type RawFacilityResponse = {
  meta: {
    endpoint: FacilityEndpoint;
    request: Record<string, number>;
    upstreamStatus: number | null;
    receivedAt: number;
  };
  items: unknown[];
  raw: Record<string, unknown> | unknown[] | null;
  error: string | null;
};

function toStringValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toFiniteNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toCoordKey(value: number) {
  if (!Number.isFinite(value)) return "nan";
  return value.toFixed(7);
}

function isRawFacilityResponse(value: unknown): value is RawFacilityResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    meta?: unknown;
    items?: unknown;
    raw?: unknown;
    error?: unknown;
  };

  if (!candidate.meta || typeof candidate.meta !== "object") return false;
  if (!Array.isArray(candidate.items)) return false;
  if (
    candidate.raw !== null &&
    candidate.raw !== undefined &&
    typeof candidate.raw !== "object"
  ) {
    return false;
  }
  if (candidate.error !== null && typeof candidate.error !== "string") return false;

  const meta = candidate.meta as {
    endpoint?: unknown;
    request?: unknown;
    upstreamStatus?: unknown;
    receivedAt?: unknown;
  };

  if (meta.endpoint !== "fountains" && meta.endpoint !== "trash-bins") {
    return false;
  }
  if (!meta.request || typeof meta.request !== "object") return false;
  if (
    meta.upstreamStatus !== null &&
    typeof meta.upstreamStatus !== "number"
  ) {
    return false;
  }
  if (typeof meta.receivedAt !== "number") return false;

  return true;
}

function isFountainItem(value: unknown): value is FountainItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;

  return (
    toStringValue(item.fountainName).length > 0 &&
    toStringValue(item.address).length > 0 &&
    toFiniteNumber(item.latitude) != null &&
    toFiniteNumber(item.longitude) != null
  );
}

function isTrashBinItem(value: unknown): value is TrashBinItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;

  return (
    toStringValue(item.address).length > 0 &&
    toFiniteNumber(item.latitude) != null &&
    toFiniteNumber(item.longitude) != null
  );
}

export function normalizeFountainItems(raw: unknown[]): FountainItem[] {
  const normalized: FountainItem[] = [];
  const dedupeKeys = new Set<string>();

  for (const value of raw) {
    if (!isFountainItem(value)) continue;
    const item = value as Record<string, unknown>;
    const fountainName = toStringValue(item.fountainName);
    const address = toStringValue(item.address);
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    const managedBy = toStringValue(item.managedBy);
    const key = [
      toCoordKey(latitude),
      toCoordKey(longitude),
      fountainName,
      address,
      managedBy,
    ].join("|");

    if (dedupeKeys.has(key)) continue;
    dedupeKeys.add(key);

    normalized.push({
      fountainName,
      address,
      latitude,
      longitude,
      managedBy,
    });
  }

  return normalized;
}

export function normalizeTrashBinItems(raw: unknown[]): TrashBinItem[] {
  const normalized: TrashBinItem[] = [];
  const dedupeKeys = new Set<string>();

  for (const value of raw) {
    if (!isTrashBinItem(value)) continue;
    const item = value as Record<string, unknown>;
    const cityName = toStringValue(item.cityName);
    const address = toStringValue(item.address);
    const locationDesc = toStringValue(item.locationDesc);
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    const binType = toStringValue(item.binType);
    const key = [
      toCoordKey(latitude),
      toCoordKey(longitude),
      address,
      locationDesc,
      binType,
    ].join("|");

    if (dedupeKeys.has(key)) continue;
    dedupeKeys.add(key);

    normalized.push({
      cityName,
      address,
      locationDesc,
      latitude,
      longitude,
      binType,
    });
  }

  return normalized;
}

function buildQuery(params: Record<string, number>) {
  const sp = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    sp.set(key, String(value));
  }

  return sp.toString();
}

async function requestFacility<TItem>(
  endpoint: FacilityEndpoint,
  params: Record<string, number>,
  normalizeItems: (raw: unknown[]) => TItem[],
  options?: RequestOptions,
): Promise<FacilityProbeResponse<TItem>> {
  const query = buildQuery(params);
  const res = await fetch(`/api/${endpoint}?${query}`, {
    cache: "no-store",
    signal: options?.signal,
  });

  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "")
        : "";
    throw new Error(
      message || `${endpoint} 요청에 실패했어요. (HTTP ${res.status})`,
    );
  }

  if (!isRawFacilityResponse(payload)) {
    throw new Error("시설물 응답 형식이 올바르지 않아요.");
  }

  return {
    ...payload,
    items: normalizeItems(payload.items),
  };
}

export async function fetchFountainsByBounds(
  params: BoundsParams,
  options?: RequestOptions,
) {
  return requestFacility(
    "fountains",
    {
      ...params,
      size: params.size ?? DEFAULT_SIZE,
    },
    normalizeFountainItems,
    options,
  );
}

export async function fetchTrashBinsByBounds(
  params: TrashBinsParams,
  options?: RequestOptions,
) {
  return requestFacility(
    "trash-bins",
    {
      ...params,
      size: params.size ?? DEFAULT_SIZE,
    },
    normalizeTrashBinItems,
    options,
  );
}
