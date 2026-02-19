import { NextRequest, NextResponse } from "next/server";
import type {
  TmapPoi,
  TmapPoiSearchUpstreamResponse,
  TmapPoiSearchResponse,
  TmapPoiSearchSort,
  TmapPoiUpstream,
} from "@/types/tmapPoi";

export const runtime = "nodejs";

const DEFAULT_COUNT = 15;
const MAX_COUNT = 50;
const MAX_PAGE = 50;
const ALLOWED_SEARCH_SORTS: TmapPoiSearchSort[] = ["R", "A"];
const WALK_SPEED_M_PER_MIN = 67; // 약 4.0km/h

function toNum(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toArray<T>(raw: T | T[] | null | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function stripTags(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\\\//g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function toFlag(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim().toUpperCase();
  if (["Y", "YES", "1", "TRUE", "T"].includes(normalized)) return true;
  if (["N", "NO", "0", "FALSE", "F"].includes(normalized)) return false;
  return null;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function calcStraightDistanceM(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
) {
  const earthRadiusM = 6371000;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0, Math.round(earthRadiusM * c));
}

function toCategoryPath(raw: TmapPoiUpstream): string[] {
  const categories = [
    raw?.upperBizName,
    raw?.middleBizName,
    raw?.lowerBizName,
    raw?.detailBizName,
  ]
    .map((v) =>
      String(v ?? "")
        .replace(/\\\//g, "/")
        .trim(),
    )
    .filter((v) => v.length > 0);

  return categories.filter(
    (value, index) => categories.indexOf(value) === index,
  );
}

function createJibunAddress(raw: TmapPoiUpstream) {
  const firstNo = String(raw?.firstNo ?? "").trim();
  const secondNo = String(raw?.secondNo ?? "").trim();
  const lotNo =
    secondNo && secondNo !== "0" ? `${firstNo}-${secondNo}` : firstNo;

  return [
    raw?.upperAddrName,
    raw?.middleAddrName,
    raw?.lowerAddrName,
    raw?.detailAddrName ?? raw?.detailAddrname,
    lotNo,
  ]
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .join(" ")
    .trim();
}

function createRoadAddress(raw: TmapPoiUpstream) {
  const newAddress = raw?.newAddressList?.newAddress;
  const first = Array.isArray(newAddress) ? newAddress[0] : newAddress;

  if (!first) return "";

  const bldNo1 = String(first?.bldNo1 ?? "").trim();
  const bldNo2 = String(first?.bldNo2 ?? "").trim();
  const buildingNo =
    bldNo1 && bldNo2 && bldNo2 !== "0" ? `${bldNo1}-${bldNo2}` : bldNo1;

  return [
    first?.fullAddressRoad,
    first?.centerName,
    first?.roadName,
    buildingNo,
    first?.buildingIndex,
  ]
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .join(" ")
    .trim();
}

function deriveBizCategory(raw: TmapPoiUpstream): string {
  if (!raw) return "";

  if (typeof raw.detailBizName === "string" && raw.detailBizName !== "기타") {
    return raw.detailBizName;
  }

  if (typeof raw.lowerBizName === "string") return raw.lowerBizName;

  return "";
}

function normalizePoi(
  raw: TmapPoiUpstream,
  centerLat: number,
  centerLon: number,
): TmapPoi | null {
  const name = stripTags(String(raw?.name ?? ""));
  const lat = Number(raw?.frontLat ?? raw?.noorLat);
  const lng = Number(raw?.frontLon ?? raw?.noorLon);

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const roadAddress = createRoadAddress(raw);
  const address = createJibunAddress(raw);
  const middleAddress = String(raw?.middleAddrName ?? "").trim();
  const id = String(raw?.id ?? `${name}:${lat}:${lng}`);
  const categoryPath = toCategoryPath(raw);
  const distanceM = calcStraightDistanceM(centerLat, centerLon, lat, lng);
  const estimatedWalkMin =
    distanceM != null
      ? Math.max(1, Math.round(distanceM / WALK_SPEED_M_PER_MIN))
      : null;
  const hasDetailInfo = toFlag(raw?.detailInfoFlag);

  return {
    id,
    name,
    lat,
    lng,
    middleAddress,
    address,
    roadAddress,
    categoryPath,
    bizCategory: deriveBizCategory(raw),
    telNo: String(raw?.telNo ?? "").trim(),
    distanceM,
    estimatedWalkMin,
    hasDetailInfo,
  };
}

export async function GET(req: NextRequest) {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) {
    return NextResponse.json(
      { error: "TMAP_APP_KEY missing" },
      { status: 500 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const keyword = String(sp.get("keyword") ?? "").trim();
  const searchtypCdRaw = String(sp.get("searchtypCd") ?? "R")
    .trim()
    .toUpperCase();
  const page = Math.min(Math.max(toNum(sp.get("page"), 1), 1), MAX_PAGE);
  const count = Math.min(
    Math.max(toNum(sp.get("count"), DEFAULT_COUNT), 1),
    MAX_COUNT,
  );
  const centerLat = Number(sp.get("centerLat"));
  const centerLon = Number(sp.get("centerLon"));

  if (keyword.length < 2) {
    return NextResponse.json(
      { error: "keyword must be at least 2 chars" },
      { status: 400 },
    );
  }

  if (!ALLOWED_SEARCH_SORTS.includes(searchtypCdRaw as TmapPoiSearchSort)) {
    return NextResponse.json(
      { error: "searchtypCd must be one of: R, A" },
      { status: 400 },
    );
  }
  const searchtypCd = searchtypCdRaw as TmapPoiSearchSort;

  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLon)) {
    return NextResponse.json(
      { error: "centerLat/centerLon are required (numbers)" },
      { status: 400 },
    );
  }

  const url = new URL("https://apis.openapi.sk.com/tmap/pois");
  url.searchParams.set("version", "1");
  url.searchParams.set("searchKeyword", keyword);
  url.searchParams.set("searchType", "all");
  url.searchParams.set("searchtypCd", searchtypCd);
  url.searchParams.set("radius", "10");
  url.searchParams.set("reqCoordType", "WGS84GEO");
  url.searchParams.set("resCoordType", "WGS84GEO");
  url.searchParams.set("multiPoint", "N");
  url.searchParams.set("count", String(count));
  url.searchParams.set("page", String(page));

  url.searchParams.set("centerLat", String(centerLat));
  url.searchParams.set("centerLon", String(centerLon));

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        appKey,
      },
      cache: "no-store",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
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
  const payload =
    typeof parsed === "object" && parsed !== null
      ? (parsed as TmapPoiSearchUpstreamResponse)
      : null;

  if (!upstream.ok) {
    const upstreamError =
      typeof payload?.error === "string"
        ? payload.error
        : (payload?.error?.message ?? "TMAP upstream error");

    return NextResponse.json(
      {
        error: upstreamError,
        raw: payload ?? parsed,
      },
      { status: upstream.status },
    );
  }

  const rawPois = toArray<TmapPoiUpstream>(payload?.searchPoiInfo?.pois?.poi);
  const items = rawPois
    .map((rawPoi) => normalizePoi(rawPoi, centerLat, centerLon))
    .filter((item): item is TmapPoi => item !== null);
  const totalCountRaw = Number(payload?.searchPoiInfo?.totalCount);
  const totalCount = Number.isFinite(totalCountRaw)
    ? totalCountRaw
    : items.length;

  const response: TmapPoiSearchResponse = {
    meta: {
      keyword,
      searchtypCd,
      page,
      count,
      totalCount,
    },
    items,
  };

  return NextResponse.json(response, { status: 200 });
}
