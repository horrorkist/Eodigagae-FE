import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_FACILITY_API_BASE_URL } from "@/lib/facilityProxy";
import {
  buildRouteRecommendResponse,
  describeFirstItemShape,
  getUpstreamRouteRecommendError,
  normalizeUpstreamRoutes,
  parseRouteRecommendRequest,
} from "@/lib/strollRouteRecommend";

export const runtime = "nodejs";

const STROLL_ROUTE_RECOMMEND_PATH = "/api/v1/stroll/route/recommend";
const DEFAULT_LOG_PREFIX = "[route-recommend]";

function getStrollApiBaseUrl() {
  return (
    process.env.STROLL_API_BASE_URL ??
    process.env.FACILITY_API_BASE_URL ??
    DEFAULT_FACILITY_API_BASE_URL
  );
}

function logRequestSummary(body: {
  latitude: number;
  longitude: number;
  dogSize: string;
  dogAge: number;
  walkingTime?: number;
  walkingDistance?: number;
}) {
  console.log(DEFAULT_LOG_PREFIX, "request", {
    latitude: body.latitude,
    longitude: body.longitude,
    dogSize: body.dogSize,
    dogAge: body.dogAge,
    walkingTime: body.walkingTime ?? null,
    walkingDistance: body.walkingDistance ?? null,
  });
}

function logResponseSummary(status: number, payload: unknown) {
  const isArrayPayload = Array.isArray(payload);
  const firstItem = isArrayPayload ? payload[0] : payload;
  const count = isArrayPayload ? payload.length : payload == null ? 0 : 1;

  console.log(DEFAULT_LOG_PREFIX, "response", {
    status,
    isArray: isArrayPayload,
    count,
    firstItemShape: describeFirstItemShape(firstItem),
  });
  console.dir(payload, { depth: 6 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = parseRouteRecommendRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  logRequestSummary(parsed.value);

  const upstreamUrl = new URL(STROLL_ROUTE_RECOMMEND_PATH, getStrollApiBaseUrl());

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(parsed.value),
    });

    const text = await upstream.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        console.log(DEFAULT_LOG_PREFIX, "response-non-json", {
          status: upstream.status,
          body: text,
        });
        return NextResponse.json(
          { error: "추천 경로 응답 형식이 올바르지 않아요." },
          { status: 502 },
        );
      }
    }

    logResponseSummary(upstream.status, payload);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: getUpstreamRouteRecommendError(payload, upstream.status) },
        { status: 502 },
      );
    }

    const routes = normalizeUpstreamRoutes(payload);
    if (routes == null) {
      return NextResponse.json(
        { error: "추천 경로 응답 형식이 올바르지 않아요." },
        { status: 502 },
      );
    }

    const response = buildRouteRecommendResponse(routes, parsed.value);
    if (response == null) {
      return NextResponse.json(
        { error: "추천 경로 응답 형식이 올바르지 않아요." },
        { status: 502 },
      );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "추천 경로를 불러오지 못했어요.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
