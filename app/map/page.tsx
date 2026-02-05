// MapPage.tsx
"use client";

import dynamic from "next/dynamic";
import BottomSheet from "@/components/BottomSheet";
import MapOverlay from "@/components/MapOverlay";
import { useShallow } from "zustand/shallow";
import { useMapStore } from "@/stores/mapStore";
import { useRouteActions } from "@/hooks/useRouteActions";
import { usePetPoiController } from "@/hooks/usePetPoiController";
import { useCmdBus } from "@/hooks/useCmdBus";
import CoordRow from "@/components/CoordRow";

const NaverMapClient = dynamic(() => import("@/components/NaverMapClient"), {
  ssr: false,
});

export default function MapPage() {
  useCmdBus();
  const {
    myPos,
    pickedPos,
    route,
    routeLoading,
    routeError,
    drawRoute,
    setDrawRoute,
    clearRoute,
    clearPicked,
  } = useMapStore(
    useShallow((s) => ({
      myPos: s.myPos,
      pickedPos: s.pickedPos,
      route: s.route,
      routeLoading: s.routeLoading,
      routeError: s.routeError,
      drawRoute: s.drawRoute,
      setDrawRoute: s.setDrawRoute,
      clearRoute: s.clearRoute,
      clearPicked: s.clearPicked,
    })),
  );

  const { requestRoute, requestTmapWalkRoute } = useRouteActions();

  const {
    petPoiOn,
    petPois,
    petPoiLoading,
    petPoiError,
    setPetPoiOn,
    refreshPetPoi,
  } = usePetPoiController({
    radius: 10000,
    numOfRows: 80,
    grid: 0.002,
    revalidate: 600, // 서버 캐시 10분
    cooldownMs: 10 * 60 * 1000, // 클라 쿨다운 10분
  });

  const canRequest = !!myPos && !!pickedPos && !routeLoading;
  const canDraw = !!route?.path?.length;

  return (
    <div className="w-full h-full">
      <NaverMapClient showPetPoi={petPoiOn} petPois={petPois} />

      <MapOverlay
        toggles={[
          {
            key: "petpoi",
            emoji: "🐶",
            labelOn: petPoiLoading ? "동반 POI 불러오는 중..." : "동반 POI ON",
            labelOff: "동반 POI OFF",
            value: petPoiOn,
            onChange: setPetPoiOn,
            disabled: !myPos,
          },
        ]}
      />

      {/* 에러 표시(원하면 토스트로 바꿔도 됨) */}
      {petPoiError && (
        <div className="absolute left-3 right-3 top-20 z-50 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">
          {petPoiError}
        </div>
      )}

      <BottomSheet peekHeight={30}>
        <div className="space-y-4">
          <CoordRow label="현재 내 위치" pos={myPos} />
          {/* ... 기존 좌표/버튼 UI ... */}
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
