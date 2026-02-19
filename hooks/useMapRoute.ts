"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useModalStore } from "@/stores/modal";
import { useRouteActions } from "@/hooks/useRouteActions";
import type { LatLng } from "@/types/mapEvents";
import { projectPointToSegmentMeters } from "@/lib/geo";
import { ROUTE_OFF_ROUTE_DISTANCE_M } from "@/features/route/tracking/constants";
import { buildRemainingPath, hasRenderablePolyline } from "@/features/route/tracking/path";
import { shouldPromptReroute, shouldSkipRouteRedraw } from "@/features/route/tracking/policy";
import { findNearestSnap } from "@/features/route/tracking/snap";
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
  const lastProgressSegIdxRef = useRef<number | null>(null);
  const lastProjectedHeadRef = useRef<LatLng | null>(null);
  const wasOffRouteRef = useRef(false);
  const reroutePromptShownRef = useRef(false);
  const lastReroutePromptAtRef = useRef(0);
  const route = useMapStore((s) => s.route);
  const drawRoute = useMapStore((s) => s.drawRoute);
  const myPos = useMapStore((s) => s.myPos);
  const walking = useMapStore((s) => s.walking);
  const routeLoading = useMapStore((s) => s.routeLoading);
  const isModalOpen = useModalStore((s) => s.isOpen);
  const openModal = useModalStore((s) => s.open);
  const { requestTmapWalkRoute } = useRouteActions();
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
    lastProgressSegIdxRef.current = null;
    lastProjectedHeadRef.current = null;
    wasOffRouteRef.current = false;
    reroutePromptShownRef.current = false;
    lastReroutePromptAtRef.current = 0;
  }, []);

  const resetOffRoutePromptState = useCallback(() => {
    wasOffRouteRef.current = false;
    reroutePromptShownRef.current = false;
  }, []);

  const maybePromptReroute = useCallback(
    (snapDistM: number, isOffRoute: boolean) => {
      if (!isOffRoute) {
        reroutePromptShownRef.current = false;
        return;
      }

      const now = Date.now();
      if (
        !shouldPromptReroute({
          isOffRoute,
          snapDistM,
          promptShown: reroutePromptShownRef.current,
          routeLoading,
          isModalOpen,
          lastPromptAt: lastReroutePromptAtRef.current,
          now,
        })
      ) {
        return;
      }

      reroutePromptShownRef.current = true;
      lastReroutePromptAtRef.current = now;
      openModal({
        title: "경로를 많이 이탈했어요",
        body: `현재 경로에서 약 ${Math.round(snapDistM)}m 벗어났습니다. 새 경로를 받을까요?`,
        confirmLabel: "재탐색",
        cancelLabel: "유지",
        onConfirm: () => {
          requestTmapWalkRoute();
        },
      });
    },
    [routeLoading, isModalOpen, openModal, requestTmapWalkRoute],
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
    resetRouteTracking();
  }, [route?.path, resetRouteTracking]);

  useEffect(() => {
    if (!sdkReady) return;

    if (!drawRoute || !route?.path?.length) {
      clearRouteVisuals();
      return;
    }

    const drawFullRoute = () => {
      lastProjectedHeadRef.current = null;
      resetOffRoutePromptState();
      drawRouteLine(route.path, fullRouteStyle);
    };

    if (!walking || !myPos || route.path.length < 2) {
      drawFullRoute();
      return;
    }

    const snap = findNearestSnap(
      route.path,
      myPos,
      lastProgressSegIdxRef.current,
    );
    if (!snap) {
      drawFullRoute();
      return;
    }

    const isOffRoute = snap.distM > ROUTE_OFF_ROUTE_DISTANCE_M;
    maybePromptReroute(snap.distM, isOffRoute);
    const wasOffRoute = wasOffRouteRef.current;
    const progressedSegIdx = Math.max(
      snap.segIdx,
      lastProgressSegIdxRef.current ?? 0,
    );
    const prevProgressSegIdx = lastProgressSegIdxRef.current;
    lastProgressSegIdxRef.current = progressedSegIdx;

    const segA: LatLng = {
      lat: route.path[progressedSegIdx][1],
      lng: route.path[progressedSegIdx][0],
    };
    const segB: LatLng = {
      lat: route.path[progressedSegIdx + 1][1],
      lng: route.path[progressedSegIdx + 1][0],
    };

    const projected = projectPointToSegmentMeters(myPos, segA, segB).point;
    const prevProjected = lastProjectedHeadRef.current;

    if (
      shouldSkipRouteRedraw({
        isOffRoute,
        wasOffRoute,
        prevProjected,
        prevProgressSegIdx,
        progressedSegIdx,
        projected,
      })
    ) {
      return;
    }

    lastProjectedHeadRef.current = projected;
    wasOffRouteRef.current = isOffRoute;

    const remainingPath = buildRemainingPath({
      isOffRoute,
      snapDistM: snap.distM,
      myPos,
      projected,
      path: route.path,
      progressedSegIdx,
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
    maybePromptReroute,
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
