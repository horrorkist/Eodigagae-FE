import { NextRequest, NextResponse } from "next/server";
import { PETPOI_DEFAULTS } from "@/lib/petPoiDefaults";

export const runtime = "nodejs";

function toNum(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItems(raw: any) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function toShortText(value: unknown, maxLen = 180) {
  if (typeof value !== "string") return "";
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}...`;
}

/**
 * grid(도 단위)로 라운딩. 예: 0.002 ~= 200m 내외(위도 기준)
 * - decimals 방식보다 "요청에서 제어하기 쉬움"
 */
function roundByGrid(n: number, grid: number) {
  if (!Number.isFinite(grid) || grid <= 0) return n;
  return Math.round(n / grid) * grid;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const latRaw = toNum(sp.get("lat"), NaN);
  const lngRaw = toNum(sp.get("lng"), NaN);

  const radius = Math.min(Math.max(toNum(sp.get("radius"), PETPOI_DEFAULTS.radius), 100), 20000);
  const pageNo = Math.max(toNum(sp.get("pageNo"), 1), 1);
  const numOfRows = Math.min(Math.max(toNum(sp.get("numOfRows"), PETPOI_DEFAULTS.numOfRows), 1), 200);

  const grid = toNum(sp.get("grid"), PETPOI_DEFAULTS.grid);
  const revalidate = Math.min(
    Math.max(toNum(sp.get("revalidate"), PETPOI_DEFAULTS.revalidate), 60),
    3600,
  );

  if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) {
    return NextResponse.json(
      { error: "lat/lng are required (numbers)" },
      { status: 400 },
    );
  }

  if (latRaw < -90 || latRaw > 90 || lngRaw < -180 || lngRaw > 180) {
    return NextResponse.json(
      { error: "lat/lng out of range" },
      { status: 400 },
    );
  }

  // ✅ 캐시 키 묶기: 같은 동네 → 같은 라운딩 좌표
  const lat = roundByGrid(latRaw, grid);
  const lng = roundByGrid(lngRaw, grid);

  const serviceKey = process.env.KTO_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Missing KTO_SERVICE_KEY in env" },
      { status: 500 },
    );
  }

  const url = new URL(
    "http://apis.data.go.kr/B551011/KorPetTourService2/locationBasedList2",
  );

  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "eodigagae");
  url.searchParams.set("_type", "json");
  url.searchParams.set("mapX", String(lng)); // mapX=경도
  url.searchParams.set("mapY", String(lat)); // mapY=위도
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));

  try {
    const res = await fetch(url.toString(), {
      // ✅ 서버 공유 캐시 TTL (초)
      next: { revalidate },
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "Upstream returned non-JSON",
          status: res.status,
          raw: text.slice(0, 2000),
        },
        { status: 502 },
      );
    }

    // KTO 장애 시에는 response.header 대신 최상단 resultCode/resultMsg 형태로 내려올 수 있음.
    const nestedResultCode = data?.response?.header?.resultCode;
    const nestedResultMsg = data?.response?.header?.resultMsg;
    const topLevelResultCode = data?.resultCode;
    const topLevelResultMsg = data?.resultMsg;

    const resultCode =
      typeof nestedResultCode === "string"
        ? nestedResultCode
        : typeof topLevelResultCode === "string"
          ? topLevelResultCode
          : null;
    const resultMsg =
      typeof nestedResultMsg === "string"
        ? nestedResultMsg
        : typeof topLevelResultMsg === "string"
          ? topLevelResultMsg
          : null;

    if (resultCode && resultCode !== "0000") {
      return NextResponse.json(
        {
          error: `KTO API 오류(${resultCode})${
            resultMsg ? `: ${toShortText(resultMsg)}` : ""
          }`,
          resultCode,
          resultMsg: toShortText(resultMsg, 500),
        },
        { status: 502 },
      );
    }

    const body = data?.response?.body;
    if (!body) {
      return NextResponse.json(
        {
          error: "Malformed upstream payload",
          detail: toShortText(text, 500),
        },
        { status: 502 },
      );
    }

    const rawItems = body?.items?.item;
    const items = normalizeItems(rawItems);

    // ✅ 클라(usePetPoiController)가 기대하는 key/meta/items로 반환
    const key = `petpoi:${lat.toFixed(6)}:${lng.toFixed(6)}:r${radius}:n${numOfRows}:p${pageNo}`;

    return NextResponse.json(
      {
        key,
        meta: {
          rounded: { lat, lng, grid },
          radius,
          numOfRows,
          pageNo,
          revalidate,
          totalCount: body?.totalCount ?? null,
        },
        items,
      },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to fetch upstream", detail: String(e?.message ?? e) },
      { status: 502 },
    );
  }
}
