"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useModalStore } from "@/stores/modal";
import { useRouteActions } from "@/hooks/useRouteActions";
import type { LatLng } from "@/types/mapEvents";
import { projectPointToSegmentMeters } from "@/lib/geo";
import { appIconPaw } from "@/components/icons/definitions.generated";

const ROUTE_STROKE_WEIGHT = 10;
const ROUTE_BORDER_STROKE_WEIGHT = 14;
const ROUTE_MAIN_COLOR = "#0bdc00";
const ROUTE_BORDER_COLOR = "#08a400";
const ROUTE_DIRECTION_MARKER_SPACING_PX = 40;
const ROUTE_DIRECTION_MARKER_HARD_MAX = 2400;
const ROUTE_DIRECTION_MARKER_SIZE_PX = Math.max(
  6,
  Math.floor(ROUTE_STROKE_WEIGHT * 0.72),
);
const SNAP_LOCAL_BACKWARD_SEGMENTS = 30;
const SNAP_LOCAL_FORWARD_SEGMENTS = 120;
const SNAP_FALLBACK_DISTANCE_M = 35;
const ROUTE_REDRAW_MIN_MOVE_M = 5;
const ROUTE_OFF_ROUTE_DISTANCE_M = 25;
const ROUTE_OFF_ROUTE_CONNECTOR_MAX_M = 45;
const ROUTE_REROUTE_PROMPT_DISTANCE_M = 60;
const ROUTE_REROUTE_PROMPT_COOLDOWN_MS = 20_000;
const ROUTE_MIN_RENDERABLE_LENGTH_M = 3;

type SnapResult = {
  segIdx: number;
  distM: number;
};

type ReroutePromptConditionInput = {
  isOffRoute: boolean;
  snapDistM: number;
  promptShown: boolean;
  routeLoading: boolean;
  isModalOpen: boolean;
  lastPromptAt: number;
  now: number;
};

type RouteRedrawSkipConditionInput = {
  isOffRoute: boolean;
  wasOffRoute: boolean;
  prevProjected: LatLng | null;
  prevProgressSegIdx: number | null;
  progressedSegIdx: number;
  projected: LatLng;
};

type BuildRemainingPathInput = {
  isOffRoute: boolean;
  snapDistM: number;
  myPos: LatLng;
  projected: LatLng;
  path: [number, number][];
  progressedSegIdx: number;
};

function shouldPromptReroute({
  isOffRoute,
  snapDistM,
  promptShown,
  routeLoading,
  isModalOpen,
  lastPromptAt,
  now,
}: ReroutePromptConditionInput) {
  return (
    isOffRoute &&
    snapDistM >= ROUTE_REROUTE_PROMPT_DISTANCE_M &&
    !promptShown &&
    !routeLoading &&
    !isModalOpen &&
    now - lastPromptAt > ROUTE_REROUTE_PROMPT_COOLDOWN_MS
  );
}

function findNearestSnap(
  path: [number, number][],
  p: LatLng,
  idxHint: number | null,
): SnapResult | null {
  const segCount = path.length - 1;
  if (segCount <= 0) return null;

  const runSearch = (start: number, end: number) => {
    let best: SnapResult | null = null;

    for (let i = start; i <= end; i++) {
      const a: LatLng = { lat: path[i][1], lng: path[i][0] };
      const b: LatLng = { lat: path[i + 1][1], lng: path[i + 1][0] };
      const proj = projectPointToSegmentMeters(p, a, b);

      if (!best || proj.distM < best.distM) {
        best = { segIdx: i, distM: proj.distM };
      }
    }

    return best;
  };

  if (idxHint == null) {
    return runSearch(0, segCount - 1);
  }

  const localStart = Math.max(0, idxHint - SNAP_LOCAL_BACKWARD_SEGMENTS);
  const localEnd = Math.min(
    segCount - 1,
    idxHint + SNAP_LOCAL_FORWARD_SEGMENTS,
  );
  const localBest = runSearch(localStart, localEnd);

  if (!localBest || localBest.distM > SNAP_FALLBACK_DISTANCE_M) {
    return runSearch(0, segCount - 1);
  }

  return localBest;
}

function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function shouldSkipRouteRedraw({
  isOffRoute,
  wasOffRoute,
  prevProjected,
  prevProgressSegIdx,
  progressedSegIdx,
  projected,
}: RouteRedrawSkipConditionInput) {
  if (isOffRoute || wasOffRoute) return false;
  if (!prevProjected || prevProgressSegIdx == null) return false;
  if (progressedSegIdx !== prevProgressSegIdx) return false;

  return haversineMeters(prevProjected, projected) < ROUTE_REDRAW_MIN_MOVE_M;
}

function buildRemainingPath({
  isOffRoute,
  snapDistM,
  myPos,
  projected,
  path,
  progressedSegIdx,
}: BuildRemainingPathInput): [number, number][] {
  const shouldDrawOffRouteConnector =
    isOffRoute && snapDistM <= ROUTE_OFF_ROUTE_CONNECTOR_MAX_M;
  if (!shouldDrawOffRouteConnector) {
    return [
      [projected.lng, projected.lat],
      ...path.slice(progressedSegIdx + 1),
    ];
  }

  return [
    [myPos.lng, myPos.lat],
    [projected.lng, projected.lat],
    ...path.slice(progressedSegIdx + 1),
  ];
}

function hasRenderablePolyline(path: [number, number][]) {
  if (path.length < 2) return false;

  let lengthM = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a: LatLng = { lat: path[i][1], lng: path[i][0] };
    const b: LatLng = { lat: path[i + 1][1], lng: path[i + 1][0] };
    lengthM += haversineMeters(a, b);

    if (lengthM >= ROUTE_MIN_RENDERABLE_LENGTH_M) {
      return true;
    }
  }

  return false;
}

function bearingDeg(from: LatLng, to: LatLng) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const toDeg = (v: number) => (v * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

type ScreenPoint = {
  x: number;
  y: number;
};

function distancePx(a: ScreenPoint, b: ScreenPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function buildDirectionMarkerHtml(directionDeg: number, sizePx: number) {
  return `
    <div style="width:${sizePx}px;height:${sizePx}px;position:relative;transform:rotate(${directionDeg.toFixed(1)}deg);transform-origin:50% 50%;pointer-events:none;">
      <svg width="${sizePx}" height="${sizePx}" viewBox="${appIconPaw.viewBox}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        ${appIconPaw.body}
      </svg>
    </div>
  `;
}

export function useMapRoute(mapRef: RefObject<naver.maps.Map | null>) {
  const routeBorderRef = useRef<naver.maps.Polyline | null>(null);
  const routeLineRef = useRef<naver.maps.Polyline | null>(null);
  const chevronMarkersRef = useRef<naver.maps.Marker[]>([]);
  const lastDrawnPathRef = useRef<[number, number][] | null>(null);
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

  const clearChevronMarkers = useCallback(() => {
    for (const marker of chevronMarkersRef.current) {
      marker.setMap(null);
    }
    chevronMarkersRef.current = [];
  }, []);

  const drawRouteChevrons = useCallback(
    (path: [number, number][]) => {
      clearChevronMarkers();
      if (!mapRef.current || !window.naver?.maps) return;
      if (!path?.length || path.length < 2) return;
      const projection = mapRef.current.getProjection();
      const segments: Array<{
        a: LatLng;
        b: LatLng;
        lenPx: number;
      }> = [];
      let totalLenPx = 0;

      for (let i = 0; i < path.length - 1; i++) {
        const a: LatLng = { lat: path[i][1], lng: path[i][0] };
        const b: LatLng = { lat: path[i + 1][1], lng: path[i + 1][0] };
        const aOffset = projection.fromCoordToOffset(
          new window.naver.maps.LatLng(a.lat, a.lng),
        );
        const bOffset = projection.fromCoordToOffset(
          new window.naver.maps.LatLng(b.lat, b.lng),
        );
        const aPx: ScreenPoint = { x: aOffset.x, y: aOffset.y };
        const bPx: ScreenPoint = { x: bOffset.x, y: bOffset.y };
        const lenPx = distancePx(aPx, bPx);
        if (lenPx <= 0.001) continue;

        segments.push({ a, b, lenPx });
        totalLenPx += lenPx;
      }

      if (segments.length === 0 || totalLenPx <= 0) return;

      const expectedCount = totalLenPx / ROUTE_DIRECTION_MARKER_SPACING_PX;
      const spacingPx =
        expectedCount > ROUTE_DIRECTION_MARKER_HARD_MAX
          ? totalLenPx / ROUTE_DIRECTION_MARKER_HARD_MAX
          : ROUTE_DIRECTION_MARKER_SPACING_PX;

      let distanceFromStartPx = 0;
      let nextChevronAtPx = spacingPx;

      for (const segment of segments) {
        const { a, b, lenPx } = segment;
        while (distanceFromStartPx + lenPx >= nextChevronAtPx) {
          const t = (nextChevronAtPx - distanceFromStartPx) / lenPx;
          const point = lerpLatLng(a, b, t);
          const direction = bearingDeg(a, b);

          const marker = new window.naver.maps.Marker({
            map: mapRef.current,
            position: new window.naver.maps.LatLng(point.lat, point.lng),
            clickable: false,
            zIndex: 320,
            icon: {
              content: buildDirectionMarkerHtml(
                direction,
                ROUTE_DIRECTION_MARKER_SIZE_PX,
              ),
              anchor: new window.naver.maps.Point(
                ROUTE_DIRECTION_MARKER_SIZE_PX / 2,
                ROUTE_DIRECTION_MARKER_SIZE_PX / 2,
              ),
            },
          });

          chevronMarkersRef.current.push(marker);
          nextChevronAtPx += spacingPx;
        }

        distanceFromStartPx += lenPx;
      }
    },
    [clearChevronMarkers, mapRef],
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
    if (routeBorderRef.current) {
      routeBorderRef.current.setMap(null);
      routeBorderRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }
    clearChevronMarkers();
    lastDrawnPathRef.current = null;
    resetRouteTracking();
  }, [clearChevronMarkers, resetRouteTracking]);

  const drawRouteLine = useCallback(
    (path: [number, number][], showChevrons: boolean) => {
      if (!mapRef.current || !window.naver?.maps) return;
      if (!path?.length) return;
      lastDrawnPathRef.current = path;

      const pts = path.map(
        ([lng, lat]) => new window.naver.maps.LatLng(lat, lng),
      );

      if (!routeBorderRef.current) {
        routeBorderRef.current = new window.naver.maps.Polyline({
          map: mapRef.current,
          path: pts,
          strokeWeight: ROUTE_BORDER_STROKE_WEIGHT,
          strokeColor: ROUTE_BORDER_COLOR,
          strokeLineCap: "round",
          strokeLineJoin: "round",
          strokeOpacity: 0.95,
          zIndex: 290,
        });
      } else {
        routeBorderRef.current.setPath(pts);
        routeBorderRef.current.setMap(mapRef.current);
      }

      if (!routeLineRef.current) {
        routeLineRef.current = new window.naver.maps.Polyline({
          map: mapRef.current,
          path: pts,
          strokeWeight: ROUTE_STROKE_WEIGHT,
          strokeColor: ROUTE_MAIN_COLOR,
          strokeLineCap: "round",
          strokeLineJoin: "round",
          strokeOpacity: 0.9,
          zIndex: 300,
        });
      } else {
        routeLineRef.current.setPath(pts);
        routeLineRef.current.setMap(mapRef.current);
      }

      if (showChevrons) {
        drawRouteChevrons(path);
      } else {
        clearChevronMarkers();
      }
    },
    [drawRouteChevrons, clearChevronMarkers, mapRef],
  );

  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;

    const map = mapRef.current;
    let rafId: number | null = null;
    const queueRedraw = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (!drawRoute) {
          clearChevronMarkers();
          return;
        }
        const path = lastDrawnPathRef.current;
        if (!path?.length) return;
        drawRouteChevrons(path);
      });
    };
    const syncListener = naver.maps.Event.addListener(
      map,
      "zoom_changed",
      () => {
        if (walking) {
          clearChevronMarkers();
          return;
        }
        queueRedraw();
      },
    );

    return () => {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
      naver.maps.Event.removeListener(syncListener);
    };
  }, [mapRef, drawRoute, drawRouteChevrons, clearChevronMarkers, walking]);

  useEffect(() => {
    resetRouteTracking();
  }, [route?.path, resetRouteTracking]);

  useEffect(() => {
    if (!drawRoute || !route?.path?.length) {
      clearRouteVisuals();
      return;
    }

    const showChevrons = !walking;

    if (!walking || !myPos || route.path.length < 2) {
      lastProjectedHeadRef.current = null;
      resetOffRoutePromptState();
      drawRouteLine(route.path, showChevrons);
      return;
    }

    const snap = findNearestSnap(
      route.path,
      myPos,
      lastProgressSegIdxRef.current,
    );
    if (!snap) {
      lastProjectedHeadRef.current = null;
      resetOffRoutePromptState();
      drawRouteLine(route.path, showChevrons);
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
      drawRouteLine(route.path, showChevrons);
      return;
    }

    drawRouteLine(remainingPath, showChevrons);
  }, [
    route,
    drawRoute,
    myPos,
    walking,
    maybePromptReroute,
    resetOffRoutePromptState,
    drawRouteLine,
    clearRouteVisuals,
  ]);

  useEffect(() => {
    return () => {
      clearRouteVisuals();
    };
  }, [clearRouteVisuals]);
}
