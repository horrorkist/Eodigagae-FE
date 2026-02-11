import { NextRequest, NextResponse } from "next/server";
import { extractTmapPedestrian } from "@/lib/extractTmapPedestrian";
import type {
  RouteRecommendation,
  RouteRecommendationSource,
  RouteWaypoint,
} from "@/types/routeRecommend";

export const runtime = "nodejs";

type Point = { lat: number; lng: number };

type Candidate = {
  waypoint: RouteWaypoint;
  estimatedDistance: number;
  preScore: number;
};

function toNum(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function haversineMeters(a: Point, b: Point) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function pathDistanceMeters(path: [number, number][]) {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    sum += haversineMeters(
      { lat: prev[1], lng: prev[0] },
      { lat: curr[1], lng: curr[0] },
    );
  }
  return sum;
}

function scoreDistance(distanceM: number, minM: number, maxM: number) {
  if (distanceM >= minM && distanceM <= maxM) return 1;
  const edge = distanceM < minM ? minM : maxM;
  const diff = Math.abs(distanceM - edge);
  const tolerance = Math.max(500, (maxM - minM) * 0.75);
  return Math.max(0, 1 - diff / tolerance);
}

function roundPointKey(p: Point) {
  return `${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`;
}

function toSyntheticWaypoint(start: Point, minM: number, maxM: number) {
  const minR = Math.max(250, minM * 0.2);
  const maxR = Math.max(minR + 100, maxM * 0.35);
  const radius = minR + Math.random() * (maxR - minR);
  const bearing = Math.random() * Math.PI * 2;
  const dLat = (radius / 111_320) * Math.cos(bearing);
  const cosLat = Math.max(Math.cos((start.lat * Math.PI) / 180), 0.1);
  const dLng = (radius / (111_320 * cosLat)) * Math.sin(bearing);
  const lat = clamp(start.lat + dLat, -85, 85);
  const lng = clamp(start.lng + dLng, -180, 180);

  return {
    lat,
    lng,
    title: "랜덤 산책 포인트",
    source: "synthetic" as const,
  };
}

function normalizeItems(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  return [raw as Record<string, unknown>];
}

async function fetchNearbyPetPoi(
  start: Point,
  radius: number,
  numOfRows: number,
) {
  const serviceKey = process.env.KTO_SERVICE_KEY;
  if (!serviceKey) return [];

  const url = new URL(
    "http://apis.data.go.kr/B551011/KorPetTourService2/locationBasedList2",
  );
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "eodigagae");
  url.searchParams.set("_type", "json");
  url.searchParams.set("mapX", String(start.lng));
  url.searchParams.set("mapY", String(start.lat));
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", String(numOfRows));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    response?: {
      header?: { resultCode?: string };
      body?: { items?: { item?: unknown } };
    };
  };

  const resultCode = data?.response?.header?.resultCode;
  if (resultCode && resultCode !== "0000") return [];

  const items = normalizeItems(data?.response?.body?.items?.item);
  const out: RouteWaypoint[] = [];

  for (const item of items) {
    const lat = Number(item.mapy);
    const lng = Number(item.mapx);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      lat,
      lng,
      title:
        typeof item.title === "string" && item.title.trim().length > 0
          ? item.title
          : "반려동물 동반 지점",
      source: "petpoi",
      contentid:
        typeof item.contentid === "string" ? item.contentid : undefined,
    });
  }

  return out;
}

async function fetchTmapWalkRoute(
  appKey: string,
  start: Point,
  end: Point,
) {
  const upstream = await fetch(
    "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        appKey,
      },
      body: JSON.stringify({
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startX: start.lng,
        startY: start.lat,
        endX: end.lng,
        endY: end.lat,
        startName: "출발지",
        endName: "경유지",
      }),
      cache: "no-store",
    },
  );

  const text = await upstream.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {}

  if (!upstream.ok) {
    throw new Error("TMAP route fetch failed");
  }

  return extractTmapPedestrian(data);
}

function weightedPick(candidates: RouteRecommendation[], temperature: number) {
  const maxScore = Math.max(...candidates.map((c) => c.metrics.score));
  const weights = candidates.map((c) => {
    const w = Math.exp((c.metrics.score - maxScore) / temperature);
    return Number.isFinite(w) && w > 0 ? w : 0.000001;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return candidates.length - 1;
}

function weightedSampleWithoutReplacement(
  candidates: RouteRecommendation[],
  count: number,
  temperature: number,
) {
  const pool = [...candidates];
  const picked: RouteRecommendation[] = [];
  while (pool.length > 0 && picked.length < count) {
    const idx = weightedPick(pool, temperature);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

export async function POST(req: NextRequest) {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) {
    return NextResponse.json({ error: "TMAP_APP_KEY missing" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const startX = toNum(body.startX, NaN);
  const startY = toNum(body.startY, NaN);

  if (
    !Number.isFinite(startX) ||
    !Number.isFinite(startY) ||
    startY < -90 ||
    startY > 90 ||
    startX < -180 ||
    startX > 180
  ) {
    return NextResponse.json(
      { error: "startX/startY are required and must be valid coordinates" },
      { status: 400 },
    );
  }

  const targetMinKm = clamp(toNum(body.targetMinKm, 1.2), 0.5, 8);
  const targetMaxKm = clamp(
    toNum(body.targetMaxKm, Math.max(targetMinKm + 0.3, 2.5)),
    targetMinKm + 0.3,
    12,
  );
  const radius = clamp(toNum(body.radius, 3000), 800, 12000);
  const candidateCount = Math.round(clamp(toNum(body.candidateCount, 14), 6, 24));
  const shortlistCount = Math.round(
    clamp(toNum(body.shortlistCount, 5), 3, 8),
  );
  const maxResults = Math.round(clamp(toNum(body.maxResults, 3), 1, 3));
  const temperature = clamp(toNum(body.temperature, 0.8), 0.4, 2.0);

  const start: Point = { lat: startY, lng: startX };
  const minM = targetMinKm * 1000;
  const maxM = targetMaxKm * 1000;

  let poiWaypoints: RouteWaypoint[] = [];
  try {
    poiWaypoints = await fetchNearbyPetPoi(start, radius, 80);
  } catch {
    poiWaypoints = [];
  }

  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const poi of poiWaypoints) {
    const key = roundPointKey(poi);
    if (seen.has(key)) continue;
    seen.add(key);
    const direct = haversineMeters(start, poi);
    const estimatedDistance = direct * 2.5;
    const distanceFit = scoreDistance(estimatedDistance, minM, maxM);
    const preScore = distanceFit * 0.85 + 0.1 + Math.random() * 0.05;
    candidates.push({ waypoint: poi, estimatedDistance, preScore });
  }

  while (candidates.length < candidateCount) {
    const synthetic = toSyntheticWaypoint(start, minM, maxM);
    const key = roundPointKey(synthetic);
    if (seen.has(key)) continue;
    seen.add(key);

    const direct = haversineMeters(start, synthetic);
    const estimatedDistance = direct * 2.4;
    const distanceFit = scoreDistance(estimatedDistance, minM, maxM);
    const preScore = distanceFit * 0.9 + Math.random() * 0.1;
    candidates.push({ waypoint: synthetic, estimatedDistance, preScore });
  }

  candidates.sort((a, b) => b.preScore - a.preScore);
  const shortlist = candidates.slice(0, shortlistCount);

  const validated: RouteRecommendation[] = [];

  for (let i = 0; i < shortlist.length; i++) {
    const candidate = shortlist[i];
    try {
      const legOut = await fetchTmapWalkRoute(appKey, start, candidate.waypoint);
      const legBack = await fetchTmapWalkRoute(appKey, candidate.waypoint, start);

      const path = [...legOut.path, ...legBack.path.slice(1)];
      if (path.length < 2) continue;

      const outDist = legOut.summary?.distance;
      const backDist = legBack.summary?.distance;
      const distance =
        typeof outDist === "number" && typeof backDist === "number"
          ? outDist + backDist
          : pathDistanceMeters(path);

      const outDur = legOut.summary?.duration;
      const backDur = legBack.summary?.duration;
      const duration =
        typeof outDur === "number" && typeof backDur === "number"
          ? outDur + backDur
          : undefined;

      const distanceFit = scoreDistance(distance, minM, maxM);
      const poiBoost = candidate.waypoint.source === "petpoi" ? 1 : 0;
      const score =
        distanceFit * 0.8 + poiBoost * 0.15 + candidate.preScore * 0.05;

      const source: RouteRecommendationSource = candidate.waypoint.source;
      validated.push({
        id: `routerecv1-${Date.now()}-${i}-${Math.round(Math.random() * 1000)}`,
        title:
          source === "petpoi"
            ? `${candidate.waypoint.title} 경유 루프`
            : "랜덤 루프 산책 코스",
        source,
        waypoint: candidate.waypoint,
        route: { summary: { distance, duration }, path },
        metrics: { score, distanceFit, poiBoost },
      });
    } catch {
      continue;
    }
  }

  validated.sort((a, b) => b.metrics.score - a.metrics.score);
  const recommendations = weightedSampleWithoutReplacement(
    validated,
    Math.min(maxResults, validated.length),
    temperature,
  );

  return NextResponse.json({
    recommendations,
    meta: {
      poiCount: poiWaypoints.length,
      candidateCount,
      shortlistCount,
      validatedCount: validated.length,
      temperature,
      targetMinKm,
      targetMaxKm,
    },
  });
}
