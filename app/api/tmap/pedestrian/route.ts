import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const appKey = process.env.TMAP_APP_KEY; // ✅ 서버 전용
  if (!appKey) {
    return NextResponse.json(
      { error: "TMAP_APP_KEY missing" },
      { status: 500 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const startX = Number(body?.startX);
  const startY = Number(body?.startY);
  const endX = Number(body?.endX);
  const endY = Number(body?.endY);

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
        startName: encodeURIComponent("출발지"),
        endName: encodeURIComponent("목적지"),
        // 필요 옵션 있으면 여기 추가
      }),
      // cache: "no-store", // 필요시
    },
  );

  const text = await upstream.text();

  // JSON 파싱 시도 (실패해도 그대로 반환)
  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {}

  // 업스트림이 실패면 error 형태로 통일
  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: data?.error ?? data?.message ?? "TMAP upstream error",
        raw: data,
      },
      { status: upstream.status },
    );
  }

  // 성공이면 원문 그대로 반환
  return NextResponse.json(data, { status: upstream.status });
}
