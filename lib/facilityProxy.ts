import { NextResponse } from "next/server";

// export const DEFAULT_FACILITY_API_BASE_URL = "http://jhin.iptime.org:8080";
export const DEFAULT_FACILITY_API_BASE_URL = "https://api.dogoodogoo.com";
const DEFAULT_SIZE = 200;
const MIN_SIZE = 1;
const MAX_SIZE = 500;
const DEFAULT_LOG_PREFIX = "[facility-proxy]";

export type FacilityEndpoint = "fountains" | "trash-bins";

type BoundsRequest = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  size: number;
};

export type FountainsRequest = BoundsRequest;

export type TrashBinsRequest = BoundsRequest & {
  centerLat: number;
  centerLng: number;
};

type FacilityRequest = FountainsRequest | TrashBinsRequest;

type FacilityResponseMeta<TReq extends FacilityRequest> = {
  endpoint: FacilityEndpoint;
  request: TReq;
  upstreamStatus: number | null;
  receivedAt: number;
};

export type FacilityProxyResponse<TReq extends FacilityRequest> = {
  meta: FacilityResponseMeta<TReq>;
  items: unknown[];
  raw: Record<string, unknown> | unknown[] | null;
  error: string | null;
};

type ParseResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      message: string;
    };

function parseFiniteNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureLatRange(value: number, key: string): string | null {
  if (value < -90 || value > 90) return `${key} out of range`;
  return null;
}

function ensureLngRange(value: number, key: string): string | null {
  if (value < -180 || value > 180) return `${key} out of range`;
  return null;
}

function parseBaseBoundsParams(
  sp: URLSearchParams,
): ParseResult<BoundsRequest> {
  const minLat = parseFiniteNumber(sp.get("minLat"));
  const maxLat = parseFiniteNumber(sp.get("maxLat"));
  const minLng = parseFiniteNumber(sp.get("minLng"));
  const maxLng = parseFiniteNumber(sp.get("maxLng"));

  if (minLat == null || maxLat == null || minLng == null || maxLng == null) {
    return { ok: false, message: "minLat,maxLat,minLng,maxLng are required" };
  }

  const latErrors = [
    ensureLatRange(minLat, "minLat"),
    ensureLatRange(maxLat, "maxLat"),
  ].filter((item): item is string => typeof item === "string");
  if (latErrors.length > 0) return { ok: false, message: latErrors[0] };

  const lngErrors = [
    ensureLngRange(minLng, "minLng"),
    ensureLngRange(maxLng, "maxLng"),
  ].filter((item): item is string => typeof item === "string");
  if (lngErrors.length > 0) return { ok: false, message: lngErrors[0] };

  if (minLat > maxLat) {
    return {
      ok: false,
      message: "minLat must be less than or equal to maxLat",
    };
  }
  if (minLng > maxLng) {
    return {
      ok: false,
      message: "minLng must be less than or equal to maxLng",
    };
  }

  const rawSize = sp.get("size");
  const size = rawSize == null ? DEFAULT_SIZE : parseFiniteNumber(rawSize);

  if (size == null) {
    return { ok: false, message: "size must be a number" };
  }
  if (size < MIN_SIZE || size > MAX_SIZE) {
    return {
      ok: false,
      message: `size must be between ${MIN_SIZE} and ${MAX_SIZE}`,
    };
  }

  return {
    ok: true,
    value: {
      minLat,
      maxLat,
      minLng,
      maxLng,
      size,
    },
  };
}

export function parseFountainsRequest(
  sp: URLSearchParams,
): ParseResult<FountainsRequest> {
  return parseBaseBoundsParams(sp);
}

export function parseTrashBinsRequest(
  sp: URLSearchParams,
): ParseResult<TrashBinsRequest> {
  const base = parseBaseBoundsParams(sp);
  if (!base.ok) return base;

  const centerLat = parseFiniteNumber(sp.get("centerLat"));
  const centerLng = parseFiniteNumber(sp.get("centerLng"));

  if (centerLat == null || centerLng == null) {
    return { ok: false, message: "centerLat,centerLng are required" };
  }

  const centerLatError = ensureLatRange(centerLat, "centerLat");
  if (centerLatError) return { ok: false, message: centerLatError };

  const centerLngError = ensureLngRange(centerLng, "centerLng");
  if (centerLngError) return { ok: false, message: centerLngError };

  return {
    ok: true,
    value: {
      ...base.value,
      centerLat,
      centerLng,
    },
  };
}

function pickItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (!payload || typeof payload !== "object") return [];
  const obj = payload as { items?: unknown; data?: unknown };

  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.data)) return obj.data;

  return [];
}

function pickRaw(payload: unknown): Record<string, unknown> | unknown[] | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as Record<string, unknown> | unknown[];
}

function createPayload<TReq extends FacilityRequest>(
  endpoint: FacilityEndpoint,
  request: TReq,
  upstreamStatus: number | null,
  raw: unknown,
  error: string | null,
): FacilityProxyResponse<TReq> {
  return {
    meta: {
      endpoint,
      request,
      upstreamStatus,
      receivedAt: Date.now(),
    },
    items: pickItems(raw),
    raw: pickRaw(raw),
    error,
  };
}

function describePayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return {
      type: "array",
      count: payload.length,
      firstItemType:
        payload.length > 0 && payload[0] != null ? typeof payload[0] : null,
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      type: payload == null ? "null" : typeof payload,
    };
  }

  return {
    type: "object",
    keys: Object.keys(payload as Record<string, unknown>).slice(0, 12),
  };
}

export function toValidationErrorResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function proxyFacilityRequest<TReq extends FacilityRequest>(
  endpoint: FacilityEndpoint,
  request: TReq,
) {
  const baseUrl =
    process.env.FACILITY_API_BASE_URL ?? DEFAULT_FACILITY_API_BASE_URL;
  const upstreamUrl = new URL(`/api/v1/${endpoint}`, baseUrl);

  for (const [key, value] of Object.entries(request)) {
    upstreamUrl.searchParams.set(key, String(value));
  }

  console.log(DEFAULT_LOG_PREFIX, "request", {
    endpoint,
    request,
    upstreamUrl: upstreamUrl.toString(),
  });

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    const text = await upstream.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.log(DEFAULT_LOG_PREFIX, "response-non-json", {
        endpoint,
        upstreamUrl: upstreamUrl.toString(),
        upstreamStatus: upstream.status,
        bodyPreview: text.slice(0, 500),
      });
      const payload = createPayload(
        endpoint,
        request,
        upstream.status,
        null,
        "Upstream returned non-JSON payload",
      );
      return NextResponse.json(payload, { status: 502 });
    }

    console.log(DEFAULT_LOG_PREFIX, "response", {
      endpoint,
      upstreamUrl: upstreamUrl.toString(),
      upstreamStatus: upstream.status,
      ok: upstream.ok,
      payload: describePayload(parsed),
    });
    if (!upstream.ok) {
      console.dir(parsed, { depth: 6 });
    }

    if (!upstream.ok) {
      const payload = createPayload(
        endpoint,
        request,
        upstream.status,
        parsed,
        `Upstream request failed with HTTP ${upstream.status}`,
      );
      return NextResponse.json(payload, { status: 502 });
    }

    const payload = createPayload(
      endpoint,
      request,
      upstream.status,
      parsed,
      null,
    );
    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch upstream";
    console.error(DEFAULT_LOG_PREFIX, "fetch-error", {
      endpoint,
      upstreamUrl: upstreamUrl.toString(),
      message,
      error,
    });
    const payload = createPayload(endpoint, request, null, null, message);
    return NextResponse.json(payload, { status: 502 });
  }
}
