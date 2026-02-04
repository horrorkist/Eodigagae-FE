import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // start/goal: "lng,lat" 형태로 받는다고 가정
  const start = searchParams.get("start");
  const goal = searchParams.get("goal");
  const option = searchParams.get("option") ?? "traoptimal";

  if (!start || !goal) {
    return NextResponse.json(
      { error: "start and goal are required" },
      { status: 400 },
    );
  }

  const url =
    `https://maps.apigw.ntruss.com/map-direction/v1/driving` +
    `?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}&option=${encodeURIComponent(option)}`;

  const res = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAPS_KEY_ID!, // client id
      "X-NCP-APIGW-API-KEY": process.env.NAVER_MAPS_KEY_SECRET!, // client secret
    },
    // 필요하면 캐싱 전략 추가
  });

  const data = await res.json();

  // 보통 traoptimal / trafast 등 option에 따라 키가 달라짐
  const routeKey = option.split(":")[0]; // "traoptimal" 같은 첫 옵션 기준 단순 처리
  const first = data?.route?.[routeKey]?.[0];

  if (!first?.path) {
    return NextResponse.json(
      { error: "No route path", raw: data },
      { status: 502 },
    );
  }

  return NextResponse.json({
    summary: first.summary,
    path: first.path, // [[lng,lat], [lng,lat], ...]
  });
}
