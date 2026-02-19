import type { LatLng } from "@/types/mapEvents";
import {
  ROUTE_MIN_RENDERABLE_LENGTH_M,
  ROUTE_OFF_ROUTE_CONNECTOR_MAX_M,
} from "./constants.ts";

export type BuildRemainingPathInput = {
  isOffRoute: boolean;
  snapDistM: number;
  myPos: LatLng;
  projected: LatLng;
  path: [number, number][];
  progressedSegIdx: number;
  offRouteConnectorMaxM?: number;
};

export function haversineMeters(a: LatLng, b: LatLng) {
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

export function buildRemainingPath({
  isOffRoute,
  snapDistM,
  myPos,
  projected,
  path,
  progressedSegIdx,
  offRouteConnectorMaxM = ROUTE_OFF_ROUTE_CONNECTOR_MAX_M,
}: BuildRemainingPathInput): [number, number][] {
  const shouldDrawOffRouteConnector =
    isOffRoute && snapDistM <= offRouteConnectorMaxM;
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

export function hasRenderablePolyline(
  path: [number, number][],
  minLengthM = ROUTE_MIN_RENDERABLE_LENGTH_M,
) {
  if (path.length < 2) return false;

  let lengthM = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a: LatLng = { lat: path[i][1], lng: path[i][0] };
    const b: LatLng = { lat: path[i + 1][1], lng: path[i + 1][0] };
    lengthM += haversineMeters(a, b);

    if (lengthM >= minLengthM) {
      return true;
    }
  }

  return false;
}
