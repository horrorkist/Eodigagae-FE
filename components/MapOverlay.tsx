"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEmit } from "@/hooks/useEventBus";
import { requestOrientationPermissionIfNeeded } from "@/hooks/useWalkHeading";
import { useMapStore } from "@/stores/mapStore";
import { useUiChromeStore } from "@/stores/uiChrome";
import { useMapControlStore } from "@/stores/mapControlStore";
import type { FABMenuItem } from "@/components/FloatingFABMenu";
import type { RouteRecommendation } from "@/types/routeRecommend";
import {
  faFlagCheckered,
  faMapLocationDot,
  faPersonWalking,
} from "@fortawesome/free-solid-svg-icons";
import type { ToggleItem } from "@/components/map-overlay/types";
import TopOverlay from "@/components/map-overlay/TopOverlay";
import RoutePlanningOverlay from "@/components/map-overlay/RoutePlanningOverlay";
import FloatingControlsOverlay from "@/components/map-overlay/FloatingControlsOverlay";
import WalkingOverlay from "@/components/map-overlay/WalkingOverlay";

type MapOverlayProps = {
  topOffsetPx?: number;
  floatingControlsBottomOffsetPx?: number;
  floatingControlsBottomTransitionMs?: number;
  floatingControlsBottomTransitionEasing?: "linear" | "ease-in-out" | "ease-out";
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
};

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
}: MapOverlayProps) {
  const emit = useEmit();
  const isBottomChromeVisible = useUiChromeStore(
    (s) => s.isBottomChromeVisible,
  );
  const markerPlacementMode = useMapControlStore((s) => s.markerPlacementMode);
  const startMoveMyMarker = useMapControlStore((s) => s.startMoveMyMarker);
  const startMoveDest = useMapControlStore((s) => s.startMoveDest);
  const cancelMarkerPlacement = useMapControlStore(
    (s) => s.cancelMarkerPlacement,
  );
  const requestMyLocation = useMapControlStore((s) => s.requestMyLocation);
  const walking = useMapStore((s) => s.walking);
  const route = useMapStore((s) => s.route);
  const walkingPaused = useMapStore((s) => s.walkingPaused);
  const walkingStartedAt = useMapStore((s) => s.walkingStartedAt);
  const walkingPausedAt = useMapStore((s) => s.walkingPausedAt);
  const walkingPausedTotalMs = useMapStore((s) => s.walkingPausedTotalMs);
  const walkedDistanceM = useMapStore((s) => s.walkedDistanceM);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const canStartWalking = useMemo(
    () => !!route?.path && route.path.length > 1,
    [route],
  );
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

  const isMovingMyMarker = markerPlacementMode === "my";
  const isSettingDest = markerPlacementMode === "dest";

  const cancelMoveMyMarker = useCallback(() => {
    cancelMarkerPlacement();
  }, [cancelMarkerPlacement]);

  const cancelMoveDest = useCallback(() => {
    cancelMarkerPlacement();
  }, [cancelMarkerPlacement]);

  const onToggleMoveMyMarker = useCallback(() => {
    if (isMovingMyMarker) {
      cancelMoveMyMarker();
      return;
    }

    startMoveMyMarker();
  }, [cancelMoveMyMarker, isMovingMyMarker, startMoveMyMarker]);

  const onToggleMoveDest = useCallback(() => {
    if (isSettingDest) {
      cancelMoveDest();
      return;
    }

    startMoveDest();
  }, [cancelMoveDest, isSettingDest, startMoveDest]);

  const onToggleWalking = useCallback(() => {
    if (!canStartWalking) return;
    if (!walking) requestOrientationPermissionIfNeeded();

    emit({
      type: walking ? "STOP_WALKING" : "START_WALKING",
      channel: "map",
    });
  }, [canStartWalking, emit, walking]);

  const onTogglePauseWalking = useCallback(() => {
    emit({
      type: walkingPaused ? "RESUME_WALKING" : "PAUSE_WALKING",
      channel: "map",
    });
  }, [emit, walkingPaused]);

  const onStopWalking = useCallback(() => {
    emit({ type: "STOP_WALKING", channel: "map" });
  }, [emit]);

  const onRequestMyLocation = useCallback(() => {
    requestMyLocation();
  }, [requestMyLocation]);

  const fabItems = useMemo<FABMenuItem[]>(
    () => [
      {
        key: "move-marker",
        icon: faMapLocationDot,
        label: "내 위치 변경",
        active: isMovingMyMarker,
        onClick: onToggleMoveMyMarker,
      },
      {
        key: "set-dest",
        icon: faFlagCheckered,
        label: "도착지 설정",
        active: isSettingDest,
        onClick: onToggleMoveDest,
      },
      {
        key: "start-walking",
        icon: faPersonWalking,
        label: walking ? "산책 종료" : "산책 시작",
        active: walking,
        disabled: !canStartWalking,
        onClick: onToggleWalking,
      },
    ],
    [
      isMovingMyMarker,
      isSettingDest,
      onToggleMoveMyMarker,
      onToggleMoveDest,
      onToggleWalking,
      walking,
      canStartWalking,
    ],
  );

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
        <WalkingOverlay
          elapsedSec={elapsedSec}
          walkedDistanceM={walkedDistanceM}
          walkingPaused={walkingPaused}
          onTogglePause={onTogglePauseWalking}
          onStop={onStopWalking}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {!isRoutePlanningMode && (
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

      {isRoutePlanningMode ? (
        <RoutePlanningOverlay
          recommendations={routePlanningRecommendations}
          selectedRouteId={routePlanningSelectedRouteId}
          loading={routePlanningLoading}
          error={routePlanningError}
          onRouteSelect={onRoutePlanningSelect}
          onRouteEdit={onRouteEdit}
          onGuideStart={onGuideStart}
        />
      ) : (
        <FloatingControlsOverlay
          isBottomChromeVisible={isBottomChromeVisible}
          bottomOffsetPx={floatingControlsBottomOffsetPx}
          bottomTransitionMs={floatingControlsBottomTransitionMs}
          bottomTransitionEasing={floatingControlsBottomTransitionEasing}
          leftSlot={bottomLeftSlot}
          fabItems={fabItems}
          onRequestMyLocation={onRequestMyLocation}
        />
      )}
    </div>
  );
}
