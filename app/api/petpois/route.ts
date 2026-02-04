import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 좌표 라운딩: decimals=3이면 대략 0.001도 단위(수백 m 이내 수준)로 묶임
function roundCoord(n: number, decimals = 3) {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function toNumber(v: string | null) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const latRaw = toNumber(sp.get("lat"));
  const lngRaw = toNumber(sp.get("lng"));

  const radius = toNumber(sp.get("radius")) ?? 1000;
  const pageNo = toNumber(sp.get("pageNo")) ?? 1;
  const numOfRows = toNumber(sp.get("numOfRows")) ?? 50;

  if (latRaw == null || lngRaw == null) {
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

  // ✅ 캐시 키 묶기: 같은 동네 = 같은 lat/lng로 강제
  // radius=1000m 기준이면 decimals=3 정도가 보통 무난
  const decimals = 3;
  const lat = roundCoord(latRaw, decimals);
  const lng = roundCoord(lngRaw, decimals);

  // 과한 요청 방지
  const safeRadius = Math.max(100, Math.min(radius, 20000));
  const safeNumOfRows = Math.max(1, Math.min(numOfRows, 200));

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
  url.searchParams.set("radius", String(safeRadius));
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(safeNumOfRows));

  try {
    const res = await fetch(url.toString(), {
      // ✅ 서버 공유 캐시 TTL: 6시간 (원하면 12시간/24시간로 늘려도 됨)
      next: { revalidate: 60 * 60 * 6 },
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

    const resultCode = data?.response?.header?.resultCode;
    const resultMsg = data?.response?.header?.resultMsg;

    if (resultCode && resultCode !== "0000") {
      return NextResponse.json(
        { error: "Upstream error", resultCode, resultMsg, upstream: data },
        { status: 502 },
      );
    }

    // (선택) 디버그용: 라운딩된 좌표를 같이 내려주면 확인이 쉬움
    data.__cacheKeyHint = {
      latRounded: lat,
      lngRounded: lng,
      decimals,
      radius: safeRadius,
      numOfRows: safeNumOfRows,
      pageNo,
    };

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to fetch upstream", detail: String(e?.message ?? e) },
      { status: 502 },
    );
  }
}
