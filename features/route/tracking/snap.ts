import { projectPointToSegmentMeters } from "../../../lib/geo";
import type { LatLng } from "@/types/mapEvents";
import {
  SNAP_FALLBACK_DISTANCE_M,
  SNAP_LOCAL_BACKWARD_SEGMENTS,
  SNAP_LOCAL_FORWARD_SEGMENTS,
} from "./constants.ts";

export type SnapResult = {
  segIdx: number;
  distM: number;
};

type FindNearestSnapOptions = {
  localBackwardSegments?: number;
  localForwardSegments?: number;
  fallbackDistanceM?: number;
};

export function findNearestSnap(
  path: [number, number][],
  p: LatLng,
  idxHint: number | null,
  options: FindNearestSnapOptions = {},
): SnapResult | null {
  const segCount = path.length - 1;
  if (segCount <= 0) return null;

  const localBackwardSegments =
    options.localBackwardSegments ?? SNAP_LOCAL_BACKWARD_SEGMENTS;
  const localForwardSegments =
    options.localForwardSegments ?? SNAP_LOCAL_FORWARD_SEGMENTS;
  const fallbackDistanceM =
    options.fallbackDistanceM ?? SNAP_FALLBACK_DISTANCE_M;

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

  const localStart = Math.max(0, idxHint - localBackwardSegments);
  const localEnd = Math.min(segCount - 1, idxHint + localForwardSegments);
  const localBest = runSearch(localStart, localEnd);

  if (!localBest || localBest.distM > fallbackDistanceM) {
    return runSearch(0, segCount - 1);
  }

  return localBest;
}
