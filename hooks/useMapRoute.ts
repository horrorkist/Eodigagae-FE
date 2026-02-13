"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import type { LatLng } from "@/types/mapEvents";

const ROUTE_STROKE_WEIGHT = 10;
const ROUTE_BORDER_STROKE_WEIGHT = 14;
const ROUTE_MAIN_COLOR = "#1d4ed8";
const ROUTE_BORDER_COLOR = "#ffffff";
const CHEVRON_MIN_SPACING_M = 55;
const CHEVRON_MAX_SPACING_M = 220;
const CHEVRON_MIN_SIZE_PX = 10;
const CHEVRON_MAX_SIZE_PX = 20;
const CHEVRON_MIN_COUNT = 20;
const CHEVRON_MAX_COUNT = 120;
const SNAP_LOCAL_BACKWARD_SEGMENTS = 30;
const SNAP_LOCAL_FORWARD_SEGMENTS = 120;
const SNAP_FALLBACK_DISTANCE_M = 35;

type SnapResult = {
  segIdx: number;
  distM: number;
};

type ChevronStyle = {
  visible: boolean;
  spacingM: number;
  sizePx: number;
  maxCount: number;
  strokeWidth: number;
};

function projectPointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng) {
  const meanLatRad = (((a.lat + b.lat + p.lat) / 3) * Math.PI) / 180;
  const mPerDegLat = 111132;
  const mPerDegLng = 111320 * Math.cos(meanLatRad);

  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;

  const len2 = bx * bx + by * by;
  if (len2 <= 1e-6) {
    return {
      t: 0,
      distM: Math.hypot(px, py),
      point: { lat: a.lat, lng: a.lng },
    };
  }

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  const projX = bx * t;
  const projY = by * t;

  return {
    t,
    distM: Math.hypot(px - projX, py - projY),
    point: {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    },
  };
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
  const localEnd = Math.min(segCount - 1, idxHint + SNAP_LOCAL_FORWARD_SEGMENTS);
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

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function getChevronStyleForZoom(zoom: number): ChevronStyle {
  if (zoom <= 12) {
    return {
      visible: false,
      spacingM: CHEVRON_MAX_SPACING_M,
      sizePx: CHEVRON_MIN_SIZE_PX,
      maxCount: CHEVRON_MIN_COUNT,
      strokeWidth: 2.2,
    };
  }

  const z = clamp(zoom, 13, 18);
  const t = (z - 13) / 5; // 0..1

  const spacingM = Math.round(
    CHEVRON_MAX_SPACING_M - (CHEVRON_MAX_SPACING_M - CHEVRON_MIN_SPACING_M) * t,
  );
  const sizePx = Math.round(
    CHEVRON_MIN_SIZE_PX + (CHEVRON_MAX_SIZE_PX - CHEVRON_MIN_SIZE_PX) * t,
  );
  const maxCount = Math.round(
    CHEVRON_MIN_COUNT + (CHEVRON_MAX_COUNT - CHEVRON_MIN_COUNT) * t,
  );
  const strokeWidth = 2.2 + 0.6 * t;

  return { visible: true, spacingM, sizePx, maxCount, strokeWidth };
}

function buildChevronHtml(
  directionDeg: number,
  sizePx: number,
  strokeWidth: number,
) {
  return `
    <div style="width:${sizePx}px;height:${sizePx}px;position:relative;transform:rotate(${directionDeg.toFixed(1)}deg);transform-origin:50% 50%;pointer-events:none;">
      <svg width="${sizePx}" height="${sizePx}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <path d="M5.5 9.5 L8 7 L10.5 9.5" stroke="#ffffff" stroke-width="${strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />
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

      const zoom = mapRef.current.getZoom();
      const style = getChevronStyleForZoom(zoom);
      if (!style.visible) return;

      let distanceFromStartM = 0;
      let nextChevronAtM = style.spacingM;
      let created = 0;

      for (let i = 0; i < path.length - 1; i++) {
        const a: LatLng = { lat: path[i][1], lng: path[i][0] };
        const b: LatLng = { lat: path[i + 1][1], lng: path[i + 1][0] };
        const segLenM = haversineMeters(a, b);
        if (segLenM <= 0.001) continue;

        while (distanceFromStartM + segLenM >= nextChevronAtM) {
          const t = (nextChevronAtM - distanceFromStartM) / segLenM;
          const point = lerpLatLng(a, b, t);
          const direction = bearingDeg(a, b);

          const marker = new window.naver.maps.Marker({
            map: mapRef.current,
            position: new window.naver.maps.LatLng(point.lat, point.lng),
            clickable: false,
            zIndex: 320,
            icon: {
              content: buildChevronHtml(
                direction,
                style.sizePx,
                style.strokeWidth,
              ),
              anchor: new window.naver.maps.Point(
                style.sizePx / 2,
                style.sizePx / 2,
              ),
            },
          });

          chevronMarkersRef.current.push(marker);

          created += 1;
          if (created >= style.maxCount) return;
          nextChevronAtM += style.spacingM;
        }

        distanceFromStartM += segLenM;
      }
    },
    [clearChevronMarkers, mapRef],
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
  }, [clearChevronMarkers]);

  const drawRouteLine = useCallback(
    (path: [number, number][]) => {
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

      drawRouteChevrons(path);
    },
    [drawRouteChevrons, mapRef],
  );

  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;

    const map = mapRef.current;
    const listener = naver.maps.Event.addListener(map, "zoom_changed", () => {
      const path = lastDrawnPathRef.current;
      if (!path?.length) {
        clearChevronMarkers();
        return;
      }
      drawRouteChevrons(path);
    });

    return () => {
      naver.maps.Event.removeListener(listener);
    };
  }, [mapRef, drawRouteChevrons, clearChevronMarkers]);

  const route = useMapStore((s) => s.route);
  const drawRoute = useMapStore((s) => s.drawRoute);
  const myPos = useMapStore((s) => s.myPos);
  const walking = useMapStore((s) => s.walking);

  useEffect(() => {
    lastProgressSegIdxRef.current = null;
  }, [route?.path]);

  useEffect(() => {
    if (!drawRoute || !route?.path?.length) {
      clearRouteVisuals();
      return;
    }

    if (!walking || !myPos || route.path.length < 2) {
      drawRouteLine(route.path);
      return;
    }

    const snap = findNearestSnap(
      route.path,
      myPos,
      lastProgressSegIdxRef.current,
    );
    if (!snap) {
      drawRouteLine(route.path);
      return;
    }

    const progressedSegIdx = Math.max(
      snap.segIdx,
      lastProgressSegIdxRef.current ?? 0,
    );
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

    const remainingPath: [number, number][] = [
      [projected.lng, projected.lat],
      ...route.path.slice(progressedSegIdx + 1),
    ];

    drawRouteLine(remainingPath);
  }, [route, drawRoute, myPos, walking, drawRouteLine, clearRouteVisuals]);

  useEffect(() => {
    return () => {
      clearRouteVisuals();
    };
  }, [clearRouteVisuals]);
}
