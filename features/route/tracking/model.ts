import type { RouteResult } from "@/domain/route/types";
import type { LatLng } from "@/types/mapEvents";
import { haversineMeters } from "./path.ts";

export type TrackingSegment = {
  index: number;
  start: LatLng;
  end: LatLng;
  lengthM: number;
  bearingDeg: number;
  startDistanceM: number;
  endDistanceM: number;
  canonicalKey: string;
  overlapGroupIndex: number;
  overlapOccurrenceIndex: number;
  overlapOccurrenceCount: number;
};

export type TrackingOverlapGroup = {
  index: number;
  canonicalKey: string;
  segmentIndices: number[];
};

export type TrackingRouteModel = {
  path: [number, number][];
  cumulativeDistancesM: number[];
  segments: TrackingSegment[];
  overlapGroups: TrackingOverlapGroup[];
  totalDistanceM: number;
};

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

function toLatLng(coord: [number, number]): LatLng {
  return { lat: coord[1], lng: coord[0] };
}

function toCoordKey(coord: LatLng) {
  return `${coord.lng.toFixed(6)},${coord.lat.toFixed(6)}`;
}

function toCanonicalSegmentKey(start: LatLng, end: LatLng) {
  const startKey = toCoordKey(start);
  const endKey = toCoordKey(end);
  return startKey < endKey
    ? `${startKey}|${endKey}`
    : `${endKey}|${startKey}`;
}

export function buildTrackingRouteModel(route: RouteResult): TrackingRouteModel {
  const path = route.path ?? [];
  if (path.length === 0) {
    return {
      path: [],
      cumulativeDistancesM: [],
      segments: [],
      overlapGroups: [],
      totalDistanceM: 0,
    };
  }

  const cumulativeDistancesM: number[] = [0];
  const segments: TrackingSegment[] = [];
  const overlapGroupMap = new Map<
    string,
    {
      index: number;
      segmentIndices: number[];
    }
  >();

  let runningDistanceM = 0;

  for (let i = 0; i < path.length - 1; i += 1) {
    const start = toLatLng(path[i]);
    const end = toLatLng(path[i + 1]);
    const lengthM = haversineMeters(start, end);
    runningDistanceM += lengthM;
    cumulativeDistancesM.push(runningDistanceM);

    const canonicalKey = toCanonicalSegmentKey(start, end);
    let overlapGroup = overlapGroupMap.get(canonicalKey);
    if (!overlapGroup) {
      overlapGroup = {
        index: overlapGroupMap.size,
        segmentIndices: [],
      };
      overlapGroupMap.set(canonicalKey, overlapGroup);
    }

    overlapGroup.segmentIndices.push(i);
    segments.push({
      index: i,
      start,
      end,
      lengthM,
      bearingDeg: bearingDeg(start, end),
      startDistanceM: cumulativeDistancesM[i],
      endDistanceM: runningDistanceM,
      canonicalKey,
      overlapGroupIndex: overlapGroup.index,
      overlapOccurrenceIndex: 0,
      overlapOccurrenceCount: 1,
    });
  }

  const overlapGroups = [...overlapGroupMap.entries()].map(
    ([canonicalKey, group]) => ({
      index: group.index,
      canonicalKey,
      segmentIndices: group.segmentIndices,
    }),
  );

  for (const group of overlapGroups) {
    const occurrenceCount = group.segmentIndices.length;
    group.segmentIndices.forEach((segmentIndex, occurrenceIndex) => {
      segments[segmentIndex] = {
        ...segments[segmentIndex],
        overlapOccurrenceIndex: occurrenceIndex,
        overlapOccurrenceCount: occurrenceCount,
      };
    });
  }

  return {
    path: path.slice(),
    cumulativeDistancesM,
    segments,
    overlapGroups,
    totalDistanceM: runningDistanceM,
  };
}
