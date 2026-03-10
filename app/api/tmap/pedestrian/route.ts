import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const appKey = process.env.TMAP_APP_KEY; // ✅ 서버 전용
  if (!appKey) {
    return NextResponse.json(
      { error: "TMAP_APP_KEY missing" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const startX = Number(payload.startX);
  const startY = Number(payload.startY);
  const endX = Number(payload.endX);
  const endY = Number(payload.endY);
  const searchOptionRaw = payload.searchOption;
  const searchOption =
    searchOptionRaw == null || searchOptionRaw === ""
      ? 0
      : Number(searchOptionRaw);

  if (
    !Number.isFinite(startX) ||
    !Number.isFinite(startY) ||
    !Number.isFinite(endX) ||
    !Number.isFinite(endY)
  ) {
    return NextResponse.json(
      { error: "startX,startY,endX,endY must be numbers" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(searchOption)) {
    return NextResponse.json(
      { error: "searchOption must be a number when provided" },
      { status: 400 },
    );
  }

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
        startX,
        startY,
        endX,
        endY,
        searchOption,
        startName: encodeURIComponent("출발지"),
        endName: encodeURIComponent("목적지"),
      }),
    },
  );

  const text = await upstream.text();

  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {}

  if (!upstream.ok) {
    const upstreamPayload =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    return NextResponse.json(
      {
        error: upstreamPayload.error ?? upstreamPayload.message ?? "TMAP upstream error",
        raw: data,
      },
      { status: upstream.status },
    );
  }

  return NextResponse.json(data, { status: upstream.status });
}
