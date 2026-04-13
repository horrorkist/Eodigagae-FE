"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useModalStore } from "@/stores/modal";
import type { LatLng } from "@/types/mapEvents";
import { projectPointToSegmentMeters } from "@/lib/geo";
import { walkDebug } from "@/lib/walkDebug";
import { requestWalkStop } from "@/lib/walkSession";
import {
  ROUTE_ARRIVAL_PROMPT_DISTANCE_M,
  ROUTE_ARRIVAL_ROUND_TRIP_ENDPOINT_DISTANCE_M,
  ROUTE_OFF_ROUTE_DISTANCE_M,
} from "@/features/route/tracking/constants";
import {
  buildRemainingPath,
  hasRenderablePolyline,
  haversineMeters,
} from "@/features/route/tracking/path";
import {
  shouldPromptArrival,
  shouldPromptReroute,
  shouldResetArrivalPrompt,
  shouldSkipRouteRedraw,
} from "@/features/route/tracking/policy";
import { findNearestSnap } from "@/features/route/tracking/snap";
import {
  findMatchCandidates,
  resolveBestCursor,
  type TrackingCursor,
  type TrackingPendingCandidate,
} from "@/features/route/tracking/matcher";
import {
  buildTrackingRouteModel,
  type TrackingRouteModel,
} from "@/features/route/tracking/model";
import {
  clearGuidanceMarkers as clearGuidanceMarkersNaver,
  clearRouteVisuals as clearRouteVisualsNaver,
  drawRouteGuidanceMarkers as drawRouteGuidanceMarkersNaver,
  drawRouteLine as drawRouteLineNaver,
  resolveRouteOptions,
  type RouteVisualStyle,
  type UseMapRouteOptions,
} from "@/adapters/map/naver/routeRenderer";

export type { UseMapRouteOptions };

export function useMapRoute(
  mapRef: RefObject<naver.maps.Map | null>,
  options: UseMapRouteOptions = {},
  sdkReady = true,
) {
  const routeBorderRef = useRef<naver.maps.Polyline | null>(null);
  const routeLineRef = useRef<naver.maps.Polyline | null>(null);
  const guidanceMarkersRef = useRef<naver.maps.Marker[]>([]);
  const lastDrawnPathRef = useRef<[number, number][] | null>(null);
  const lastMarkerVisibleRef = useRef(false);
  const trackingModelRef = useRef<TrackingRouteModel | null>(null);
  const lastConfirmedCursorRef = useRef<TrackingCursor | null>(null);
  const lastRenderedCursorRef = useRef<TrackingCursor | null>(null);
  const pendingCandidateRef = useRef<TrackingPendingCandidate | null>(null);
  const legacyProgressSegIdxRef = useRef<number | null>(null);
  const wasOffRouteRef = useRef(false);
  const offRoutePromptShownRef = useRef(false);
  const lastOffRoutePromptAtRef = useRef(0);
  const arrivalPromptShownRef = useRef(false);
  const arrivalPromptSuppressedUntilExitRef = useRef(false);
  const route = useMapStore((s) => s.route);
  const drawRoute = useMapStore((s) => s.drawRoute);
  const myPos = useMapStore((s) => s.myPos);
  const walking = useMapStore((s) => s.walking);
  const heading = useMapStore((s) => s.heading);
  const routeExperienceSource = useMapStore((s) => s.routeExperienceSource);
  const activeRouteLegIndex = useMapStore((s) => s.activeRouteLegIndex);
  const setActiveRouteLegIndex = useMapStore((s) => s.setActiveRouteLegIndex);
  const setWalkingGuidanceProgressM = useMapStore(
    (s) => s.setWalkingGuidanceProgressM,
  );
  const routeLoading = useMapStore((s) => s.routeLoading);
  const isModalOpen = useModalStore((s) => s.isOpen);
  const openModal = useModalStore((s) => s.open);
  const {
    fullRouteStyle,
    activeRouteStyle,
    lineStrokeWeight,
    borderStrokeWeight,
    guidanceMarkerSpacingPx,
    guidanceMarkerHardMax,
    guidanceMarkerSizePx,
  } = useMemo(() => resolveRouteOptions(options), [options]);
  const routeLegs = route?.legs ?? [];
  const activeDogRecommendLeg =
    routeExperienceSource === "dog-recommend" && routeLegs.length > 0
      ? routeLegs[Math.min(activeRouteLegIndex, routeLegs.length - 1)] ?? null
      : null;
  const trackedPath =
    walking && routeExperienceSource === "dog-recommend" && activeDogRecommendLeg
      ? activeDogRecommendLeg.path
      : route?.path ?? null;

  const clearGuidanceMarkers = useCallback(() => {
    clearGuidanceMarkersNaver(guidanceMarkersRef);
  }, []);

  const drawRouteGuidanceMarkers = useCallback(
    (path: [number, number][]) => {
      if (!mapRef.current || !window.naver?.maps) return;

      drawRouteGuidanceMarkersNaver({
        map: mapRef.current,
        path,
        guidanceMarkersRef,
        guidanceMarkerSpacingPx,
        guidanceMarkerHardMax,
        guidanceMarkerSizePx,
      });
    },
    [
      guidanceMarkerHardMax,
      guidanceMarkerSizePx,
      guidanceMarkerSpacingPx,
      mapRef,
    ],
  );

  const resetRouteTracking = useCallback(() => {
    lastConfirmedCursorRef.current = null;
    lastRenderedCursorRef.current = null;
    pendingCandidateRef.current = null;
    legacyProgressSegIdxRef.current = null;
    wasOffRouteRef.current = false;
    offRoutePromptShownRef.current = false;
    lastOffRoutePromptAtRef.current = 0;
    arrivalPromptShownRef.current = false;
    arrivalPromptSuppressedUntilExitRef.current = false;
  }, []);

  const resetOffRoutePromptState = useCallback(() => {
    wasOffRouteRef.current = false;
    offRoutePromptShownRef.current = false;
  }, []);

  const maybeAdvanceDogRecommendLeg = useCallback(
    () => {
      if (!walking || routeExperienceSource !== "dog-recommend") return false;
      if (!activeDogRecommendLeg || !myPos || routeLegs.length === 0) {
        return false;
      }
      if (activeRouteLegIndex >= routeLegs.length - 1) return false;

      const distanceToLegEndM = haversineMeters(myPos, {
        lat: activeDogRecommendLeg.endCoordinate[1],
        lng: activeDogRecommendLeg.endCoordinate[0],
      });
      if (distanceToLegEndM > ROUTE_ARRIVAL_PROMPT_DISTANCE_M) return false;

      setActiveRouteLegIndex(activeRouteLegIndex + 1);
      setWalkingGuidanceProgressM(null);
      resetRouteTracking();
      resetOffRoutePromptState();
      return true;
    },
    [
      activeDogRecommendLeg,
      activeRouteLegIndex,
      myPos,
      resetOffRoutePromptState,
      resetRouteTracking,
      routeExperienceSource,
      routeLegs.length,
      setActiveRouteLegIndex,
      setWalkingGuidanceProgressM,
      walking,
    ],
  );

  const maybePromptOffRoute = useCallback(
    (snapDistM: number, isOffRoute: boolean) => {
      if (!isOffRoute) {
        offRoutePromptShownRef.current = false;
        return false;
      }

      const now = Date.now();
      if (
        !shouldPromptReroute({
          isOffRoute,
          snapDistM,
          promptShown: offRoutePromptShownRef.current,
          routeLoading,
          isModalOpen,
          lastPromptAt: lastOffRoutePromptAtRef.current,
          now,
        })
      ) {
        return false;
      }

      const stopLabel =
        routeExperienceSource === "poi-route" ? "길안내 종료" : "산책 종료";

      offRoutePromptShownRef.current = true;
      lastOffRoutePromptAtRef.current = now;
      openModal({
        title: "경로를 벗어났어요",
        body: `현재 경로에서 약 ${Math.round(snapDistM)}m 벗어났어요. 지금 상태를 유지할까요, 아니면 ${stopLabel}할까요?`,
        confirmLabel: "유지",
        cancelLabel: stopLabel,
        onCancel: () => {
          requestWalkStop();
        },
      });
      return true;
    },
    [isModalOpen, openModal, routeExperienceSource, routeLoading],
  );

  const maybePromptArrival = useCallback(
    (distanceAlongRouteM: number, totalDistanceM: number, path: [number, number][]) => {
      if (path.length < 2 || totalDistanceM <= 0) return false;

      const remainingDistanceM = Math.max(0, totalDistanceM - distanceAlongRouteM);
      if (
        shouldResetArrivalPrompt({
          remainingDistanceM,
        })
      ) {
        arrivalPromptShownRef.current = false;
        arrivalPromptSuppressedUntilExitRef.current = false;
        return false;
      }

      const start = path[0];
      const end = path[path.length - 1];
      const isRoundTrip =
        haversineMeters(
          { lat: start[1], lng: start[0] },
          { lat: end[1], lng: end[0] },
        ) <= ROUTE_ARRIVAL_ROUND_TRIP_ENDPOINT_DISTANCE_M;
      const progressRatio = Math.min(
        1,
        Math.max(0, distanceAlongRouteM / totalDistanceM),
      );

      if (
        !shouldPromptArrival({
          walking,
          remainingDistanceM,
          promptShown: arrivalPromptShownRef.current,
          suppressedUntilExit: arrivalPromptSuppressedUntilExitRef.current,
          isModalOpen,
          isRoundTrip,
          progressRatio,
        })
      ) {
        return false;
      }

      const isPoiRoute = routeExperienceSource === "poi-route";
      arrivalPromptShownRef.current = true;
      openModal({
        title: isPoiRoute
          ? "도착지에 거의 도착했어요"
          : "산책 코스가 거의 끝났어요",
        body: isPoiRoute
          ? "길안내를 종료할까요?"
          : "산책을 종료할까요?",
        confirmLabel: isPoiRoute ? "길안내 종료" : "산책 종료",
        cancelLabel: isPoiRoute ? "계속 안내" : "계속 산책",
        onConfirm: () => {
          requestWalkStop();
        },
        onCancel: () => {
          arrivalPromptSuppressedUntilExitRef.current = true;
        },
        onDismiss: () => {
          arrivalPromptSuppressedUntilExitRef.current = true;
        },
      });
      return true;
    },
    [isModalOpen, openModal, routeExperienceSource, walking],
  );

  const clearRouteVisuals = useCallback(() => {
    clearRouteVisualsNaver({
      routeBorderRef,
      routeLineRef,
      guidanceMarkersRef,
      lastDrawnPathRef,
      lastMarkerVisibleRef,
      resetRouteTracking,
    });
  }, [resetRouteTracking]);

  const drawRouteLine = useCallback(
    (path: [number, number][], visualStyle: RouteVisualStyle) => {
      if (!mapRef.current || !window.naver?.maps) return;

      drawRouteLineNaver({
        map: mapRef.current,
        path,
        visualStyle,
        routeBorderRef,
        routeLineRef,
        guidanceMarkersRef,
        lastDrawnPathRef,
        lastMarkerVisibleRef,
        lineStrokeWeight,
        borderStrokeWeight,
        guidanceMarkerSpacingPx,
        guidanceMarkerHardMax,
        guidanceMarkerSizePx,
      });
    },
    [
      borderStrokeWeight,
      guidanceMarkerHardMax,
      guidanceMarkerSizePx,
      guidanceMarkerSpacingPx,
      lineStrokeWeight,
      mapRef,
    ],
  );

  useEffect(() => {
    if (!sdkReady) return;
    if (!mapRef.current || !window.naver?.maps) return;

    const map = mapRef.current;
    let rafId: number | null = null;
    const queueRedraw = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (!drawRoute) {
          clearGuidanceMarkers();
          return;
        }
        const path = lastDrawnPathRef.current;
        if (!path?.length) return;
        if (!lastMarkerVisibleRef.current) {
          clearGuidanceMarkers();
          return;
        }
        drawRouteGuidanceMarkers(path);
      });
    };
    const syncListener = naver.maps.Event.addListener(
      map,
      "zoom_changed",
      () => {
        queueRedraw();
      },
    );

    return () => {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
      naver.maps.Event.removeListener(syncListener);
    };
  }, [
    mapRef,
    drawRoute,
    drawRouteGuidanceMarkers,
    clearGuidanceMarkers,
    sdkReady,
  ]);

  useEffect(() => {
    trackingModelRef.current =
      trackedPath?.length && trackedPath.length >= 2
        ? buildTrackingRouteModel({
            path: trackedPath,
          })
        : null;
  }, [trackedPath]);

  useEffect(() => {
    setActiveRouteLegIndex(0);
    resetRouteTracking();
    setWalkingGuidanceProgressM(null);
  }, [
    route?.path,
    resetRouteTracking,
    setActiveRouteLegIndex,
    setWalkingGuidanceProgressM,
  ]);

  useEffect(() => {
    if (walking && drawRoute) return;
    setActiveRouteLegIndex(0);
    resetRouteTracking();
    setWalkingGuidanceProgressM(null);
  }, [
    drawRoute,
    resetRouteTracking,
    setActiveRouteLegIndex,
    setWalkingGuidanceProgressM,
    walking,
  ]);

  useEffect(() => {
    if (walking && routeExperienceSource === "dog-recommend" && drawRoute) {
      return;
    }

    setWalkingGuidanceProgressM(null);
  }, [
    drawRoute,
    routeExperienceSource,
    setWalkingGuidanceProgressM,
    walking,
  ]);

  useEffect(() => {
    if (!sdkReady) return;
    if (!drawRoute || !walking) return;
    if (routeExperienceSource !== "dog-recommend") return;
    if (!activeDogRecommendLeg || trackedPath.length < 2) return;

    lastRenderedCursorRef.current = null;
    drawRouteLine(trackedPath, fullRouteStyle);
  }, [
    activeDogRecommendLeg,
    drawRoute,
    drawRouteLine,
    fullRouteStyle,
    routeExperienceSource,
    sdkReady,
    trackedPath,
    walking,
  ]);

  useEffect(() => {
    if (!sdkReady) return;

    if (!drawRoute || !trackedPath?.length) {
      setWalkingGuidanceProgressM(null);
      clearRouteVisuals();
      return;
    }

    const drawFullRoute = () => {
      lastRenderedCursorRef.current = null;
      resetOffRoutePromptState();
      drawRouteLine(trackedPath, fullRouteStyle);
    };

    if (!walking || !myPos || trackedPath.length < 2) {
      setWalkingGuidanceProgressM(null);
      drawFullRoute();
      return;
    }

    const trackingModel = trackingModelRef.current;
    if (!trackingModel || trackingModel.segments.length === 0) {
      setWalkingGuidanceProgressM(null);
      drawFullRoute();
      return;
    }

    const candidates = findMatchCandidates(
      trackingModel,
      myPos,
      lastConfirmedCursorRef.current,
      heading,
    );
    const resolution = resolveBestCursor(
      trackingModel,
      candidates,
      lastConfirmedCursorRef.current,
      pendingCandidateRef.current,
    );
    pendingCandidateRef.current = resolution.pendingCandidate;
    if (!resolution.confirmedCursor) {
      setWalkingGuidanceProgressM(null);
      drawFullRoute();
      return;
    }

    lastConfirmedCursorRef.current = resolution.confirmedCursor;
    const activeCursor = resolution.confirmedCursor;

    if (routeExperienceSource === "dog-recommend") {
      setWalkingGuidanceProgressM(activeCursor.distanceAlongRouteM);
    } else {
      setWalkingGuidanceProgressM(null);
    }

    const legacySnap = findNearestSnap(
      trackedPath,
      myPos,
      legacyProgressSegIdxRef.current,
    );
    if (legacySnap) {
      const legacyProgressSegIdx = Math.max(
        legacySnap.segIdx,
        legacyProgressSegIdxRef.current ?? 0,
      );
      legacyProgressSegIdxRef.current = legacyProgressSegIdx;

      const legacySegA: LatLng = {
        lat: trackedPath[legacyProgressSegIdx][1],
        lng: trackedPath[legacyProgressSegIdx][0],
      };
      const legacySegB: LatLng = {
        lat: trackedPath[legacyProgressSegIdx + 1][1],
        lng: trackedPath[legacyProgressSegIdx + 1][0],
      };
      const legacyProjected = projectPointToSegmentMeters(
        myPos,
        legacySegA,
        legacySegB,
      ).point;
      const divergenceM = haversineMeters(
        legacyProjected,
        activeCursor.projected,
      );

      if (
        legacyProgressSegIdx !== activeCursor.segmentIndex ||
        divergenceM > 3 ||
        resolution.ambiguous
      ) {
        walkDebug("route-tracker:compare", {
          legacySegmentIndex: legacyProgressSegIdx,
          legacyProjected,
          legacySnapDistM: legacySnap.distM,
          sequenceSegmentIndex: activeCursor.segmentIndex,
          sequenceProjected: activeCursor.projected,
          sequenceDistanceAlongRouteM: activeCursor.distanceAlongRouteM,
          sequenceSnapDistM: activeCursor.snapDistM,
          confidence: activeCursor.confidence,
          overlapOccurrenceIndex: activeCursor.overlapOccurrenceIndex,
          ambiguous: resolution.ambiguous,
          leadingCandidateSegmentIndex:
            resolution.leadingCandidate?.segment.index ?? null,
        });
      }
    }

    const isOffRoute =
      !resolution.ambiguous &&
      activeCursor.snapDistM > ROUTE_OFF_ROUTE_DISTANCE_M;
    const didPromptOffRoute = maybePromptOffRoute(
      activeCursor.snapDistM,
      isOffRoute,
    );
    if (!didPromptOffRoute) {
      if (maybeAdvanceDogRecommendLeg()) {
        return;
      }

      maybePromptArrival(
        activeCursor.distanceAlongRouteM,
        trackingModel.totalDistanceM,
        trackedPath,
      );
    }
    const wasOffRoute = wasOffRouteRef.current;
    const prevRenderedCursor = lastRenderedCursorRef.current;

    if (
      shouldSkipRouteRedraw({
        isOffRoute,
        wasOffRoute,
        prevCursor: prevRenderedCursor,
        cursor: activeCursor,
      })
    ) {
      return;
    }

    lastRenderedCursorRef.current = activeCursor;
    wasOffRouteRef.current = isOffRoute;

    const remainingPath = buildRemainingPath({
      isOffRoute,
      snapDistM: activeCursor.snapDistM,
      myPos,
      path: trackedPath,
      cursor: activeCursor,
    });

    if (!hasRenderablePolyline(remainingPath)) {
      drawFullRoute();
      return;
    }

    drawRouteLine(remainingPath, activeRouteStyle);
  }, [
    activeRouteStyle,
    route,
    drawRoute,
    fullRouteStyle,
    myPos,
    walking,
    heading,
    maybePromptOffRoute,
    maybePromptArrival,
    resetOffRoutePromptState,
    drawRouteLine,
    clearRouteVisuals,
    sdkReady,
    maybeAdvanceDogRecommendLeg,
    routeExperienceSource,
    setWalkingGuidanceProgressM,
    trackedPath,
  ]);

  useEffect(() => {
    return () => {
      clearRouteVisuals();
    };
  }, [clearRouteVisuals]);
}
