"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useUiChromeStore } from "@/stores/uiChrome";
import { useMapControlStore } from "@/stores/mapControlStore";
import type { RoutePlanningSource } from "@/types/routePlanning";
import type { RouteRecommendation } from "@/types/routeRecommend";
import type { ToggleItem } from "@/components/map-overlay/types";
import TopOverlay from "@/components/map-overlay/TopOverlay";
import RoutePlanningOverlay from "@/components/map-overlay/RoutePlanningOverlay";
import RouteLoadingSplash from "@/components/map-overlay/RouteLoadingSplash";
import FloatingControlsOverlay from "@/components/map-overlay/FloatingControlsOverlay";
import WalkingOverlay from "@/components/map-overlay/WalkingOverlay";
import WalkingGuidanceOverlay from "@/components/map-overlay/WalkingGuidanceOverlay";
import StartPointCenterMarker from "@/components/map-overlay/StartPointCenterMarker";
import StartPointPromptSheet from "@/components/map-overlay/StartPointPromptSheet";
import {
  BOTTOM_CHROME_HEIGHT_PX,
  FLOATING_CONTROLS_BASE_BOTTOM_WITH_CHROME_PX,
} from "@/lib/bottomChromeMetrics";
import { requestWalkStop } from "@/lib/walkSession";

function formatElapsed(totalSec: number) {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "00:00";
  const sec = Math.floor(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDistance(meter: number) {
  if (!Number.isFinite(meter) || meter <= 0) return "0 m";
  if (meter >= 1000) return `${(meter / 1000).toFixed(2)} km`;
  return `${Math.round(meter)} m`;
}

type MapOverlayProps = {
  topOffsetPx?: number;
  floatingControlsBottomOffsetPx?: number;
  floatingControlsBottomTransitionMs?: number;
  floatingControlsBottomTransitionEasing?:
    | "linear"
    | "ease-in-out"
    | "ease-out";
  bottomLeftSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  searchKeyword?: string;
  showSearchResultClearButton?: boolean;
  onClearSearchResults?: () => void;
  toggles?: ToggleItem[];
  isRoutePlanningMode?: boolean;
  onRouteEdit?: () => void;
  onGuideStart?: () => void;
  routePlanningRecommendations?: RouteRecommendation[];
  routePlanningSelectedRouteId?: string | null;
  routePlanningLoading?: boolean;
  routePlanningError?: string | null;
  onRoutePlanningSelect?: (routeId: string) => void;
  routePlanningSource?: RoutePlanningSource | null;
  isStartPointSelectionMode?: boolean;
  startPointAddressText?: string;
};

function getRouteExperienceCopy(
  source: RoutePlanningSource | null | undefined,
) {
  if (source === "poi-route") {
    return {
      routeEditLabel: "돌아가기",
      routeLoadingLabel: "길찾기 경로를 불러오는 중...",
      routeEmptyLabel: "길찾기 경로가 없어요.",
      routeStartLabel: "길안내 시작",
      walkingElapsedLabel: "이동 시간",
      walkingStopLabel: "길안내 종료",
      loadingSplashTitle: "길찾기 경로를 찾고 있어요",
      loadingSplashDescription:
        "목적지까지 갈 수 있는 도보 경로를 정리하고 있어요.",
    };
  }

  return {
    routeEditLabel: "돌아가기",
    routeLoadingLabel: "추천 경로를 불러오는 중...",
    routeEmptyLabel: "추천 경로가 없어요.",
    routeStartLabel: "산책 시작",
    walkingElapsedLabel: "산책 시간",
    walkingStopLabel: "산책 종료",
    loadingSplashTitle: "추천 경로를 찾고 있어요",
    loadingSplashDescription:
      "반려견에게 맞는 산책 코스를 준비하고 있어요. 잠시만 기다려 주세요.",
  };
}

export default function MapOverlay({
  topOffsetPx = 12,
  floatingControlsBottomOffsetPx = 0,
  floatingControlsBottomTransitionMs = 0,
  floatingControlsBottomTransitionEasing = "linear",
  bottomLeftSlot,
  leftSlot,
  rightSlot,
  searchKeyword = "",
  showSearchResultClearButton = false,
  onClearSearchResults,
  toggles = [],
  isRoutePlanningMode = false,
  onRouteEdit,
  onGuideStart,
  routePlanningRecommendations = [],
  routePlanningSelectedRouteId = null,
  routePlanningLoading = false,
  routePlanningError = null,
  onRoutePlanningSelect,
  routePlanningSource = null,
  isStartPointSelectionMode = false,
  startPointAddressText = "주소를 확인하는 중...",
}: MapOverlayProps) {
  const isBottomChromeVisible = useUiChromeStore(
    (s) => s.isBottomChromeVisible,
  );
  const requestMyLocation = useMapControlStore((s) => s.requestMyLocation);
  const walking = useMapStore((s) => s.walking);
  const route = useMapStore((s) => s.route);
  const myPos = useMapStore((s) => s.myPos);
  const walkingPaused = useMapStore((s) => s.walkingPaused);
  const walkingStartedAt = useMapStore((s) => s.walkingStartedAt);
  const walkingPausedAt = useMapStore((s) => s.walkingPausedAt);
  const walkingPausedTotalMs = useMapStore((s) => s.walkingPausedTotalMs);
  const walkedDistanceM = useMapStore((s) => s.walkedDistanceM);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [startPointPromptSheetHeightPx, setStartPointPromptSheetHeightPx] =
    useState(0);
  const startPointFloatingControlsExtraBottomPx = useMemo(() => {
    const floatingBaseGapPx =
      FLOATING_CONTROLS_BASE_BOTTOM_WITH_CHROME_PX - BOTTOM_CHROME_HEIGHT_PX;
    const requiredExtraPx =
      startPointPromptSheetHeightPx - floatingBaseGapPx + 12;
    return Math.max(0, requiredExtraPx);
  }, [startPointPromptSheetHeightPx]);
  const routeExperienceCopy = useMemo(
    () => getRouteExperienceCopy(routePlanningSource),
    [routePlanningSource],
  );
  const shouldShowRouteLoadingSplash =
    routePlanningLoading &&
    routePlanningRecommendations.length === 0 &&
    ((routePlanningSource === "poi-route" && isRoutePlanningMode) ||
      (routePlanningSource === "dog-recommend" && isStartPointSelectionMode)) &&
    !walking;
  const isPoiRouteWalking = walking && routePlanningSource === "poi-route";

  const elapsedSec = useMemo(() => {
    if (!walkingStartedAt) return 0;
    const effectiveNow =
      walkingPaused && walkingPausedAt ? walkingPausedAt : nowMs;
    const elapsedMs = Math.max(
      0,
      effectiveNow - walkingStartedAt - walkingPausedTotalMs,
    );
    return elapsedMs / 1000;
  }, [
    walkingStartedAt,
    walkingPaused,
    walkingPausedAt,
    walkingPausedTotalMs,
    nowMs,
  ]);

  const onStopWalking = useCallback(() => {
    requestWalkStop();
  }, []);

  const onRequestMyLocation = useCallback(() => {
    requestMyLocation();
  }, [requestMyLocation]);

  useEffect(() => {
    if (!walking || walkingPaused || !walkingStartedAt) return;

    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [walking, walkingPaused, walkingStartedAt]);

  if (walking) {
    return (
      <div className="pointer-events-none absolute inset-0 z-50">
        {isPoiRouteWalking ? (
          <WalkingGuidanceOverlay
            topOffsetPx={topOffsetPx}
            myPos={myPos}
            guidance={route?.guidance}
          />
        ) : null}
        <FloatingControlsOverlay
          isBottomChromeVisible={false}
          bottomOffsetPx={floatingControlsBottomOffsetPx + 72}
          bottomTransitionMs={floatingControlsBottomTransitionMs}
          bottomTransitionEasing={floatingControlsBottomTransitionEasing}
          leftSlot={
            isPoiRouteWalking ? null : (
            <div className="rounded-xl bg-white px-3 py-4 flex flex-col text-dg-black space-y-4 shadow-lg shadow-black/20 backdrop-blur">
              <div className="flex space-x-2 items-center">
                <div className="leading-none">
                  {routeExperienceCopy.walkingElapsedLabel}
                </div>
                <div className="border-l border-dg-gray-400 h-3.5"></div>
                <div className="tabular-nums">{formatElapsed(elapsedSec)}</div>
              </div>
              <div className="flex space-x-2 items-center">
                <div className="leading-none">이동 거리</div>
                <div className="border-l border-dg-gray-400 h-3.5"></div>
                <div className="tabular-nums">
                  {formatDistance(walkedDistanceM)}
                </div>
              </div>
            </div>
            )
          }
          onRequestMyLocation={onRequestMyLocation}
        />
        <WalkingOverlay
          stopLabel={routeExperienceCopy.walkingStopLabel}
          onStop={onStopWalking}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {shouldShowRouteLoadingSplash ? (
        <RouteLoadingSplash
          title={routeExperienceCopy.loadingSplashTitle}
          description={routeExperienceCopy.loadingSplashDescription}
        />
      ) : null}

      {!isRoutePlanningMode && !isStartPointSelectionMode && (
        <TopOverlay
          topOffsetPx={topOffsetPx}
          leftSlot={leftSlot}
          rightSlot={rightSlot}
          searchKeyword={searchKeyword}
          showSearchResultClearButton={showSearchResultClearButton}
          onClearSearchResults={onClearSearchResults}
          toggles={toggles}
        />
      )}

      {isStartPointSelectionMode && !shouldShowRouteLoadingSplash ? (
        <>
          <FloatingControlsOverlay
            isBottomChromeVisible={isBottomChromeVisible}
            bottomOffsetPx={
              floatingControlsBottomOffsetPx +
              startPointFloatingControlsExtraBottomPx
            }
            bottomTransitionMs={floatingControlsBottomTransitionMs}
            bottomTransitionEasing={floatingControlsBottomTransitionEasing}
            onRequestMyLocation={onRequestMyLocation}
          />
          <StartPointCenterMarker />
          <StartPointPromptSheet
            addressText={startPointAddressText}
            onHeightChange={setStartPointPromptSheetHeightPx}
          />
        </>
      ) : shouldShowRouteLoadingSplash ? null : isRoutePlanningMode ? (
        <RoutePlanningOverlay
          recommendations={routePlanningRecommendations}
          selectedRouteId={routePlanningSelectedRouteId}
          loading={routePlanningLoading}
          error={routePlanningError}
          onRouteSelect={onRoutePlanningSelect}
          onRouteEdit={onRouteEdit}
          onGuideStart={onGuideStart}
          routeEditLabel={routeExperienceCopy.routeEditLabel}
          loadingLabel={routeExperienceCopy.routeLoadingLabel}
          emptyLabel={routeExperienceCopy.routeEmptyLabel}
          startLabel={routeExperienceCopy.routeStartLabel}
        />
      ) : (
        <FloatingControlsOverlay
          isBottomChromeVisible={isBottomChromeVisible}
          bottomOffsetPx={floatingControlsBottomOffsetPx}
          bottomTransitionMs={floatingControlsBottomTransitionMs}
          bottomTransitionEasing={floatingControlsBottomTransitionEasing}
          leftSlot={bottomLeftSlot}
          onRequestMyLocation={onRequestMyLocation}
        />
      )}
    </div>
  );
}
