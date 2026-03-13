import { NextRequest, NextResponse } from "next/server.js";
import {
  extractReverseGeocodeErrorMessage,
  normalizeReverseGeocodeResponse,
  parseReverseGeocodeCoords,
} from "../../../../lib/tmapReverseGeocode";
import type { TmapReverseGeocodeUpstreamResponse } from "../../../../types/tmapReverseGeocode";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) {
    return NextResponse.json(
      { error: "TMAP_APP_KEY missing" },
      { status: 500 },
    );
  }

  const coords = parseReverseGeocodeCoords(req.nextUrl.searchParams);
  if (!coords) {
    return NextResponse.json(
      { error: "lat/lng must be numbers" },
      { status: 400 },
    );
  }

  const url = new URL("https://apis.openapi.sk.com/tmap/geo/reversegeocoding");
  url.searchParams.set("version", "1");
  url.searchParams.set("lat", String(coords.lat));
  url.searchParams.set("lon", String(coords.lng));
  url.searchParams.set("coordType", "WGS84GEO");
  url.searchParams.set("addressType", "A10");
  url.searchParams.set("newAddressExtend", "Y");

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        appKey,
      },
      cache: "no-store",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "TMAP fetch failed", detail: message },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {}

  if (!upstream.ok) {
    const payload =
      parsed && typeof parsed === "object"
        ? (parsed as TmapReverseGeocodeUpstreamResponse)
        : null;

    return NextResponse.json(
      {
        error: extractReverseGeocodeErrorMessage(payload),
        raw: parsed,
      },
      { status: upstream.status },
    );
  }

  return NextResponse.json(normalizeReverseGeocodeResponse(parsed), {
    status: 200,
  });
}
