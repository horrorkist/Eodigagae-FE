import type { LatLng } from "@/types/mapEvents";
import { appIconPaw } from "@/components/icons/definitions.generated";

const DEFAULT_ROUTE_STROKE_WEIGHT = 10;
const DEFAULT_ROUTE_BORDER_STROKE_WEIGHT = 14;
const DEFAULT_ROUTE_GUIDANCE_MARKER_SPACING_PX = 40;
const DEFAULT_ROUTE_GUIDANCE_MARKER_HARD_MAX = 2400;

export type RouteVisualStyle = {
  lineColor: string;
  borderColor: string;
  showGuidanceMarkers: boolean;
};

export type UseMapRouteOptions = {
  fullRoute?: Partial<RouteVisualStyle>;
  activeRoute?: Partial<RouteVisualStyle>;
  lineStrokeWeight?: number;
  borderStrokeWeight?: number;
  guidanceMarkerSpacingPx?: number;
  guidanceMarkerHardMax?: number;
  guidanceMarkerIconSizePx?: number;
};

export type ResolvedRouteOptions = {
  fullRouteStyle: RouteVisualStyle;
  activeRouteStyle: RouteVisualStyle;
  lineStrokeWeight: number;
  borderStrokeWeight: number;
  guidanceMarkerSpacingPx: number;
  guidanceMarkerHardMax: number;
  guidanceMarkerSizePx: number;
};

type RefLike<T> = {
  current: T;
};

const DEFAULT_FULL_ROUTE_STYLE: RouteVisualStyle = {
  lineColor: "#0bdc00",
  borderColor: "#08a400",
  showGuidanceMarkers: true,
};

const DEFAULT_ACTIVE_ROUTE_STYLE: RouteVisualStyle = {
  lineColor: "#0bdc00",
  borderColor: "#08a400",
  showGuidanceMarkers: true,
};

type ScreenPoint = {
  x: number;
  y: number;
};

type PathSegmentPx = {
  a: LatLng;
  b: LatLng;
  lenPx: number;
};

type PathSegmentsResult = {
  segments: PathSegmentPx[];
  totalLenPx: number;
};

type DrawRouteGuidanceMarkersParams = {
  map: naver.maps.Map;
  path: [number, number][];
  guidanceMarkersRef: RefLike<naver.maps.Marker[]>;
  guidanceMarkerSpacingPx: number;
  guidanceMarkerHardMax: number;
  guidanceMarkerSizePx: number;
};

type DrawRouteLineParams = {
  map: naver.maps.Map;
  path: [number, number][];
  visualStyle: RouteVisualStyle;
  routeBorderRef: RefLike<naver.maps.Polyline | null>;
  routeLineRef: RefLike<naver.maps.Polyline | null>;
  guidanceMarkersRef: RefLike<naver.maps.Marker[]>;
  lastDrawnPathRef: RefLike<[number, number][] | null>;
  lastMarkerVisibleRef: RefLike<boolean>;
  lineStrokeWeight: number;
  borderStrokeWeight: number;
  guidanceMarkerSpacingPx: number;
  guidanceMarkerHardMax: number;
  guidanceMarkerSizePx: number;
};

type ClearRouteVisualsParams = {
  routeBorderRef: RefLike<naver.maps.Polyline | null>;
  routeLineRef: RefLike<naver.maps.Polyline | null>;
  guidanceMarkersRef: RefLike<naver.maps.Marker[]>;
  lastDrawnPathRef: RefLike<[number, number][] | null>;
  lastMarkerVisibleRef: RefLike<boolean>;
  resetRouteTracking: () => void;
};

function distancePx(a: ScreenPoint, b: ScreenPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
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

function buildGuidanceMarkerHtml(
  directionDeg: number,
  sizePx: number,
  color = "#ffffff",
) {
  return `
    <div style="width:${sizePx}px;height:${sizePx}px;position:relative;transform:rotate(${directionDeg.toFixed(1)}deg);transform-origin:50% 50%;pointer-events:none;color:${color}">
      <svg width="${sizePx}" height="${sizePx}" viewBox="${appIconPaw.viewBox}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        ${appIconPaw.body}
      </svg>
    </div>
  `;
}

function createGuidanceMarker(params: {
  map: naver.maps.Map;
  point: LatLng;
  direction: number;
  sizePx: number;
}): naver.maps.Marker {
  const { map, point, direction, sizePx } = params;

  return new window.naver.maps.Marker({
    map,
    position: new window.naver.maps.LatLng(point.lat, point.lng),
    clickable: false,
    zIndex: 320,
    icon: {
      content: buildGuidanceMarkerHtml(direction, sizePx),
      anchor: new window.naver.maps.Point(sizePx / 2, sizePx / 2),
    },
  });
}

function toNaverLatLngPath(path: [number, number][]) {
  return path.map(([lng, lat]) => new window.naver.maps.LatLng(lat, lng));
}

function toPathSegmentsPx(
  path: [number, number][],
  projection: naver.maps.MapSystemProjection,
): PathSegmentsResult {
  const segments: PathSegmentPx[] = [];
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
    const lenPx = distancePx(
      { x: aOffset.x, y: aOffset.y },
      { x: bOffset.x, y: bOffset.y },
    );

    if (lenPx <= 0.001) continue;

    segments.push({ a, b, lenPx });
    totalLenPx += lenPx;
  }

  return { segments, totalLenPx };
}

function upsertRoutePolyline(params: {
  current: naver.maps.Polyline | null;
  map: naver.maps.Map;
  path: naver.maps.LatLng[];
  strokeWeight: number;
  strokeColor: string;
  strokeOpacity: number;
  zIndex: number;
}): naver.maps.Polyline {
  const {
    current,
    map,
    path,
    strokeWeight,
    strokeColor,
    strokeOpacity,
    zIndex,
  } = params;

  if (!current) {
    return new window.naver.maps.Polyline({
      map,
      path,
      strokeWeight,
      strokeColor,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      strokeOpacity,
      zIndex,
    });
  }

  current.setOptions({
    path,
    strokeWeight,
    strokeColor,
    strokeLineCap: "round",
    strokeLineJoin: "round",
    strokeOpacity,
    zIndex,
  });
  current.setMap(map);
  return current;
}

export function resolveRouteOptions(
  options: UseMapRouteOptions,
): ResolvedRouteOptions {
  const lineStrokeWeight =
    options.lineStrokeWeight ?? DEFAULT_ROUTE_STROKE_WEIGHT;
  const borderStrokeWeight =
    options.borderStrokeWeight ?? DEFAULT_ROUTE_BORDER_STROKE_WEIGHT;

  return {
    fullRouteStyle: { ...DEFAULT_FULL_ROUTE_STYLE, ...options.fullRoute },
    activeRouteStyle: { ...DEFAULT_ACTIVE_ROUTE_STYLE, ...options.activeRoute },
    lineStrokeWeight,
    borderStrokeWeight,
    guidanceMarkerSpacingPx:
      options.guidanceMarkerSpacingPx ??
      DEFAULT_ROUTE_GUIDANCE_MARKER_SPACING_PX,
    guidanceMarkerHardMax:
      options.guidanceMarkerHardMax ?? DEFAULT_ROUTE_GUIDANCE_MARKER_HARD_MAX,
    guidanceMarkerSizePx:
      options.guidanceMarkerIconSizePx ??
      Math.max(6, Math.floor(lineStrokeWeight * 0.72)),
  };
}

export function clearGuidanceMarkers(
  guidanceMarkersRef: RefLike<naver.maps.Marker[]>,
) {
  for (const marker of guidanceMarkersRef.current) {
    marker.setMap(null);
  }
  guidanceMarkersRef.current = [];
}

export function drawRouteGuidanceMarkers({
  map,
  path,
  guidanceMarkersRef,
  guidanceMarkerSpacingPx,
  guidanceMarkerHardMax,
  guidanceMarkerSizePx,
}: DrawRouteGuidanceMarkersParams) {
  clearGuidanceMarkers(guidanceMarkersRef);
  if (!path?.length || path.length < 2) return;

  const projection = map.getProjection();
  const { segments, totalLenPx } = toPathSegmentsPx(path, projection);
  if (segments.length === 0 || totalLenPx <= 0) return;

  const expectedCount = totalLenPx / guidanceMarkerSpacingPx;
  const spacingPx =
    expectedCount > guidanceMarkerHardMax
      ? totalLenPx / guidanceMarkerHardMax
      : guidanceMarkerSpacingPx;

  let distanceFromStartPx = 0;
  let nextMarkerAtPx = spacingPx;

  for (const segment of segments) {
    const { a, b, lenPx } = segment;
    while (distanceFromStartPx + lenPx >= nextMarkerAtPx) {
      const t = (nextMarkerAtPx - distanceFromStartPx) / lenPx;
      const point = lerpLatLng(a, b, t);
      const direction = bearingDeg(a, b);
      guidanceMarkersRef.current.push(
        createGuidanceMarker({
          map,
          point,
          direction,
          sizePx: guidanceMarkerSizePx,
        }),
      );
      nextMarkerAtPx += spacingPx;
    }

    distanceFromStartPx += lenPx;
  }
}

export function drawRouteLine({
  map,
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
}: DrawRouteLineParams) {
  if (!path?.length) return;

  lastDrawnPathRef.current = path;
  lastMarkerVisibleRef.current = visualStyle.showGuidanceMarkers;
  const pts = toNaverLatLngPath(path);

  routeBorderRef.current = upsertRoutePolyline({
    current: routeBorderRef.current,
    map,
    path: pts,
    strokeWeight: borderStrokeWeight,
    strokeColor: visualStyle.borderColor,
    strokeOpacity: 0.95,
    zIndex: 290,
  });

  routeLineRef.current = upsertRoutePolyline({
    current: routeLineRef.current,
    map,
    path: pts,
    strokeWeight: lineStrokeWeight,
    strokeColor: visualStyle.lineColor,
    strokeOpacity: 0.9,
    zIndex: 300,
  });

  if (visualStyle.showGuidanceMarkers) {
    drawRouteGuidanceMarkers({
      map,
      path,
      guidanceMarkersRef,
      guidanceMarkerSpacingPx,
      guidanceMarkerHardMax,
      guidanceMarkerSizePx,
    });
  } else {
    clearGuidanceMarkers(guidanceMarkersRef);
  }
}

export function clearRouteVisuals({
  routeBorderRef,
  routeLineRef,
  guidanceMarkersRef,
  lastDrawnPathRef,
  lastMarkerVisibleRef,
  resetRouteTracking,
}: ClearRouteVisualsParams) {
  if (routeBorderRef.current) {
    routeBorderRef.current.setMap(null);
    routeBorderRef.current = null;
  }
  if (routeLineRef.current) {
    routeLineRef.current.setMap(null);
    routeLineRef.current = null;
  }
  clearGuidanceMarkers(guidanceMarkersRef);
  lastDrawnPathRef.current = null;
  lastMarkerVisibleRef.current = false;
  resetRouteTracking();
}
