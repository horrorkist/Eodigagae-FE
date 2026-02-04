"use client";
import BottomSheet from "@/components/BottomSheet";
import dynamic from "next/dynamic";
import { useMapStore } from "@/stores/mapStore";

const NaverMapClient = dynamic(() => import("@/components/NaverMapClient"), {
  ssr: false,
});

function CoordRow({
  label,
  pos,
}: {
  label: string;
  pos: { lat: number; lng: number } | null;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold">{label}</div>
      {pos ? (
        <div className="text-sm font-mono">
          lat: {pos.lat.toFixed(6)}
          <br />
          lng: {pos.lng.toFixed(6)}
        </div>
      ) : (
        <div className="text-sm text-gray-500">좌표 없음</div>
      )}
    </div>
  );
}

export default function MapPage() {
  const myPos = useMapStore((s) => s.myPos);
  const pickedPos = useMapStore((s) => s.pickedPos);

  const route = useMapStore((s) => s.route);
  const routeLoading = useMapStore((s) => s.routeLoading);
  const routeError = useMapStore((s) => s.routeError);

  const requestRoute = useMapStore((s) => s.requestRoute);
  const requestTmapWalkRoute = useMapStore((s) => s.requestTmapWalkRoute);
  const drawRoute = useMapStore((s) => s.drawRoute);
  const setDrawRoute = useMapStore((s) => s.setDrawRoute);
  const clearRoute = useMapStore((s) => s.clearRoute);
  const clearPicked = useMapStore((s) => s.clearPicked);

  const canRequest = !!myPos && !!pickedPos && !routeLoading;
  const canDraw = !!route?.path?.length;

  return (
    <div className="w-full h-full">
      <NaverMapClient />

      <BottomSheet peekHeight={30}>
        <div className="space-y-4">
          <CoordRow label="현재 내 위치" pos={myPos} />
          <div className="h-px bg-gray-200" />
          <CoordRow label="클릭한 위치" pos={pickedPos} />

          <div className="flex gap-2 pt-2">
            <button
              className="border px-3 py-2 rounded disabled:opacity-50"
              onClick={requestRoute}
              disabled={!canRequest}
            >
              {routeLoading ? "요청 중..." : "경로 요청"}
            </button>
            <button
              className="border px-3 py-2 rounded disabled:opacity-50"
              onClick={requestTmapWalkRoute}
              disabled={!canRequest}
            >
              {routeLoading ? "요청 중..." : "티맵 도보 경로 요청"}
            </button>

            <button
              className="border px-3 py-2 rounded disabled:opacity-50"
              onClick={() => setDrawRoute(!drawRoute)}
              disabled={!canDraw}
            >
              {drawRoute ? "그리기 끄기" : "그리기"}
            </button>

            <button
              className="border px-3 py-2 rounded disabled:opacity-50"
              onClick={clearRoute}
              disabled={!route && !routeError}
            >
              경로 초기화
            </button>

            <button className="border px-3 py-2 rounded" onClick={clearPicked}>
              클릭 초기화
            </button>
          </div>

          {routeError && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">
              {routeError}
            </div>
          )}

          {route && (
            <div className="text-sm border rounded p-2">
              <div className="font-semibold mb-1">경로 정보</div>
              <div>path points: {route.path.length}</div>
              {route.summary?.distance != null && (
                <div>
                  distance: {(route.summary.distance / 1000).toFixed(2)} km
                </div>
              )}
              {route.summary?.duration != null && (
                <div>
                  duration: {Math.round(route.summary.duration / 60000)} min
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
