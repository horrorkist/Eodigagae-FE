// MapPage.tsx
"use client";

import dynamic from "next/dynamic";
import BottomSheet from "@/components/BottomSheet";
import MapOverlay from "@/components/MapOverlay";
import { useShallow } from "zustand/shallow";
import { useMapStore } from "@/stores/mapStore";
import { useRouteActions } from "@/hooks/useRouteActions";
import { usePetPoiController } from "@/hooks/usePetPoiController";
import CoordRow from "@/components/CoordRow";
import DogInfoForm from "@/components/DogInfoForm";
import { useDogStore } from "@/stores/dogStore";
import { useBusDispatcher } from "@/hooks/useEventBus";
import { getWalkRecommendation } from "@/lib/walkRecommendation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRoute,
  faPersonWalking,
  faDrawPolygon,
  faRotateLeft,
  faEraser,
  faPaw,
  faPenToSquare,
  faCircleInfo,
  faTriangleExclamation,
  faCircleCheck,
  faArrowTrendDown,
  faArrowTrendUp,
  faSpinner,
  faRulerHorizontal,
  faClock,
} from "@fortawesome/free-solid-svg-icons";

const NaverMapClient = dynamic(() => import("@/components/NaverMapClient"), {
  ssr: false,
});

export default function MapPage() {
  useBusDispatcher(true);
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

  const dog = useDogStore((s) => s.dog);
  const walkRec = dog ? getWalkRecommendation(dog) : null;

  const { requestRoute, requestTmapWalkRoute } = useRouteActions();

  const {
    petPoiOn,
    petPois,
    petPoiTotalCount,
    petPoiLoading,
    petPoiError,
    setPetPoiOn,
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
            labelOn: petPoiLoading ? "동반 POI 불러오는 중..." : "동반 POI ON",
            labelOff: "동반 POI OFF",
            value: petPoiOn,
            onChange: setPetPoiOn,
            disabled: !myPos,
          },
        ]}
      />

      {/* 에러 표시 */}
      {petPoiError && (
        <div className="absolute left-3 right-3 top-20 z-50 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="w-3.5 h-3.5 shrink-0"
          />
          <span>{petPoiError}</span>
        </div>
      )}

      <BottomSheet peekHeight={30}>
        <div className="space-y-4">
          {petPoiOn && (
            <div className="border border-amber-200 bg-amber-50 rounded-md p-3 flex items-center gap-2 text-sm">
              <FontAwesomeIcon
                icon={faPaw}
                className="w-3.5 h-3.5 text-amber-600 shrink-0"
              />
              <span className="font-semibold text-amber-800">
                반려동물 동반 시설
              </span>
              <span className="ml-auto text-amber-700 font-bold">
                {petPoiLoading
                  ? "..."
                  : petPoiTotalCount != null
                    ? `${petPoiTotalCount}곳`
                    : "-"}
              </span>
            </div>
          )}
          {!dog ? (
            <div className="border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FontAwesomeIcon
                  icon={faPaw}
                  className="w-3.5 h-3.5 text-blue-500"
                />
                강아지 정보를 입력해주세요
              </div>
              <DogInfoForm />
            </div>
          ) : (
            <div className="border rounded-md p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FontAwesomeIcon
                  icon={faPaw}
                  className="w-3.5 h-3.5 text-blue-500"
                />
                <span className="font-semibold">{dog.name}</span>
                <span className="text-gray-500">
                  {dog.ageInMonths < 12
                    ? `${dog.ageInMonths}개월`
                    : `${Math.floor(dog.ageInMonths / 12)}살`}{" "}
                  · {dog.breed}
                </span>
              </div>
              <button
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                onClick={() => useDogStore.getState().clearDog()}
              >
                <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3" />
                수정
              </button>
            </div>
          )}

          {walkRec && (
            <div className="border border-blue-200 bg-blue-50 rounded-md p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <FontAwesomeIcon
                  icon={faPersonWalking}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                추천 산책 거리 ({walkRec.ageGroup})
              </div>
              <div className="text-blue-700 mt-0.5 ml-5.5">
                {walkRec.minKm}~{walkRec.maxKm}km
              </div>
            </div>
          )}

          <CoordRow label="현재 내 위치" pos={myPos} />
          <CoordRow label="도착지" pos={pickedPos} />

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              className="flex items-center gap-1.5 border px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors hover:bg-gray-50"
              onClick={requestRoute}
              disabled={!canRequest}
            >
              <FontAwesomeIcon
                icon={routeLoading ? faSpinner : faRoute}
                className="w-3.5 h-3.5"
                spin={routeLoading}
              />
              {routeLoading ? "요청 중..." : "경로 요청"}
            </button>

            <button
              className="flex items-center gap-1.5 border px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors hover:bg-gray-50"
              onClick={requestTmapWalkRoute}
              disabled={!canRequest}
            >
              <FontAwesomeIcon
                icon={routeLoading ? faSpinner : faPersonWalking}
                className="w-3.5 h-3.5"
                spin={routeLoading}
              />
              {routeLoading ? "요청 중..." : "티맵 도보"}
            </button>

            <button
              className={[
                "flex items-center gap-1.5 border px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors",
                drawRoute
                  ? "bg-blue-500 text-white border-blue-500"
                  : "hover:bg-gray-50",
              ].join(" ")}
              onClick={() => setDrawRoute(!drawRoute)}
              disabled={!canDraw}
            >
              <FontAwesomeIcon icon={faDrawPolygon} className="w-3.5 h-3.5" />
              {drawRoute ? "그리기 끄기" : "그리기"}
            </button>

            <button
              className="flex items-center gap-1.5 border px-3 py-2 rounded text-sm disabled:opacity-50 transition-colors hover:bg-gray-50"
              onClick={clearRoute}
              disabled={!route && !routeError}
            >
              <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
              경로 초기화
            </button>

            <button
              className="flex items-center gap-1.5 border px-3 py-2 rounded text-sm transition-colors hover:bg-gray-50"
              onClick={clearPicked}
            >
              <FontAwesomeIcon icon={faEraser} className="w-3.5 h-3.5" />
              클릭 초기화
            </button>
          </div>

          {routeError && (
            <div className="flex items-center gap-2 text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="w-3.5 h-3.5 shrink-0"
              />
              <span>{routeError}</span>
            </div>
          )}

          {route && (
            <div className="text-sm border rounded p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="w-3.5 h-3.5 text-blue-500"
                />
                경로 정보
              </div>
              <div className="ml-5.5 space-y-1 text-gray-700">
                <div>path points: {route.path.length}</div>
                {route.summary?.distance != null && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon
                        icon={faRulerHorizontal}
                        className="w-3 h-3 text-gray-400"
                      />
                      {(route.summary.distance / 1000).toFixed(2)} km
                    </div>
                    {walkRec &&
                      (() => {
                        const km = route.summary!.distance! / 1000;
                        if (km < walkRec.minKm)
                          return (
                            <div className="flex items-center gap-1.5 text-orange-600">
                              <FontAwesomeIcon
                                icon={faArrowTrendDown}
                                className="w-3 h-3"
                              />
                              추천보다 {(walkRec.minKm - km).toFixed(1)}km
                              짧아요
                            </div>
                          );
                        if (km > walkRec.maxKm)
                          return (
                            <div className="flex items-center gap-1.5 text-red-600">
                              <FontAwesomeIcon
                                icon={faArrowTrendUp}
                                className="w-3 h-3"
                              />
                              추천보다 {(km - walkRec.maxKm).toFixed(1)}km
                              길어요
                            </div>
                          );
                        return (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <FontAwesomeIcon
                              icon={faCircleCheck}
                              className="w-3 h-3"
                            />
                            추천 범위에 적합해요!
                          </div>
                        );
                      })()}
                  </>
                )}
                {route.summary?.duration != null && (
                  <div className="flex items-center gap-1.5">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="w-3 h-3 text-gray-400"
                    />
                    {Math.round(route.summary.duration / 60000)} min
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
