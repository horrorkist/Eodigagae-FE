"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useModalStore } from "@/stores/modal";
import type { LatLng } from "@/types/mapEvents";
import { projectPointToSegmentMeters } from "@/lib/geo";
import { walkDebug } from "@/lib/walkDebug";
import { requestWalkStop } from "@/lib/walkSession";
import { ROUTE_OFF_ROUTE_DISTANCE_M } from "@/features/route/tracking/constants";
import {
  buildRemainingPath,
  hasRenderablePolyline,
  haversineMeters,
} from "@/features/route/tracking/path";
import { shouldPromptReroute, shouldSkipRouteRedraw } from "@/features/route/tracking/policy";
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
  const route = useMapStore((s) => s.route);
  const drawRoute = useMapStore((s) => s.drawRoute);
  const myPos = useMapStore((s) => s.myPos);
  const walking = useMapStore((s) => s.walking);
  const heading = useMapStore((s) => s.heading);
  const routeExperienceSource = useMapStore((s) => s.routeExperienceSource);
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
  }, []);

  const resetOffRoutePromptState = useCallback(() => {
    wasOffRouteRef.current = false;
    offRoutePromptShownRef.current = false;
  }, []);

  const maybePromptOffRoute = useCallback(
    (snapDistM: number, isOffRoute: boolean) => {
      if (!isOffRoute) {
        offRoutePromptShownRef.current = false;
        return;
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
        return;
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
    },
    [isModalOpen, openModal, routeExperienceSource, routeLoading],
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
      route?.path?.length && route.path.length >= 2
        ? buildTrackingRouteModel(route)
        : null;
  }, [route]);

  useEffect(() => {
    resetRouteTracking();
  }, [route?.path, resetRouteTracking]);

  useEffect(() => {
    if (!sdkReady) return;

    if (!drawRoute || !route?.path?.length) {
      clearRouteVisuals();
      return;
    }

    const drawFullRoute = () => {
      lastRenderedCursorRef.current = null;
      resetOffRoutePromptState();
      drawRouteLine(route.path, fullRouteStyle);
    };

    if (!walking || !myPos || route.path.length < 2) {
      drawFullRoute();
      return;
    }

    const trackingModel = trackingModelRef.current;
    if (!trackingModel || trackingModel.segments.length === 0) {
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
      drawFullRoute();
      return;
    }

    lastConfirmedCursorRef.current = resolution.confirmedCursor;
    const activeCursor = resolution.confirmedCursor;

    const legacySnap = findNearestSnap(
      route.path,
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
        lat: route.path[legacyProgressSegIdx][1],
        lng: route.path[legacyProgressSegIdx][0],
      };
      const legacySegB: LatLng = {
        lat: route.path[legacyProgressSegIdx + 1][1],
        lng: route.path[legacyProgressSegIdx + 1][0],
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
    maybePromptOffRoute(activeCursor.snapDistM, isOffRoute);
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
      path: route.path,
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
    resetOffRoutePromptState,
    drawRouteLine,
    clearRouteVisuals,
    sdkReady,
  ]);

  useEffect(() => {
    return () => {
      clearRouteVisuals();
    };
  }, [clearRouteVisuals]);
}
