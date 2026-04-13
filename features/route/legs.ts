import { projectPointToSegmentMeters } from "../../lib/geo.ts";
import type { RouteGuidanceStep, RouteLeg } from "../../domain/route/types.ts";
import type { RouteWaypoint } from "../../types/routeRecommend.ts";
import {
  ROUTE_MIN_RENDERABLE_LENGTH_M,
} from "./tracking/constants.ts";
import { haversineMeters } from "./tracking/path.ts";

type LatLng = {
  lat: number;
  lng: number;
};

type BoundaryCandidate = {
  distanceAlongRouteM: number;
  snapDistM: number;
  segmentIndex: number;
  projected: [number, number];
};

type BoundarySnap = BoundaryCandidate & {
  coordinate: [number, number];
  waypointIndex: number | null;
};

const FORWARD_PROGRESS_EPSILON_M = 0.01;

function toLatLng(coordinate: [number, number]): LatLng {
  return {
    lat: coordinate[1],
    lng: coordinate[0],
  };
}

function buildCumulativeDistances(path: [number, number][]) {
  const cumulativeDistancesM = [0];

  for (let i = 0; i < path.length - 1; i += 1) {
    cumulativeDistancesM.push(
      cumulativeDistancesM[i] +
        haversineMeters(toLatLng(path[i]), toLatLng(path[i + 1])),
    );
  }

  return cumulativeDistancesM;
}

function compareBoundaryCandidate(
  left: BoundaryCandidate,
  right: BoundaryCandidate,
) {
  if (left.snapDistM !== right.snapDistM) {
    return left.snapDistM - right.snapDistM;
  }

  return left.distanceAlongRouteM - right.distanceAlongRouteM;
}

function findBoundaryCandidates(
  path: [number, number][],
  coordinate: [number, number],
  cumulativeDistancesM: number[],
) {
  const point = toLatLng(coordinate);
  const candidates: BoundaryCandidate[] = [];

  for (let i = 0; i < path.length - 1; i += 1) {
    const start = toLatLng(path[i]);
    const end = toLatLng(path[i + 1]);
    const segmentLengthM =
      cumulativeDistancesM[i + 1] - cumulativeDistancesM[i];
    const projection = projectPointToSegmentMeters(point, start, end);

    candidates.push({
      distanceAlongRouteM:
        cumulativeDistancesM[i] + segmentLengthM * projection.t,
      snapDistM: projection.distM,
      segmentIndex: i,
      projected: [projection.point.lng, projection.point.lat],
    });
  }

  return candidates;
}

function pickBoundaryCandidate(
  candidates: BoundaryCandidate[],
  previousDistanceAlongRouteM: number,
) {
  const forwardCandidates = candidates.filter(
    (candidate) =>
      candidate.distanceAlongRouteM >
      previousDistanceAlongRouteM + FORWARD_PROGRESS_EPSILON_M,
  );
  if (forwardCandidates.length === 0) return null;

  return forwardCandidates.reduce((best, candidate) =>
    compareBoundaryCandidate(candidate, best) < 0 ? candidate : best,
  );
}

function appendUnique(path: [number, number][], coordinate: [number, number]) {
  const last = path[path.length - 1];
  if (
    last &&
    Math.abs(last[0] - coordinate[0]) <= 1e-8 &&
    Math.abs(last[1] - coordinate[1]) <= 1e-8
  ) {
    return;
  }

  path.push(coordinate);
}

function buildLegPath(
  fullPath: [number, number][],
  start: BoundarySnap,
  end: BoundarySnap,
) {
  const path: [number, number][] = [];
  appendUnique(path, start.projected);

  if (start.segmentIndex === end.segmentIndex) {
    appendUnique(path, end.projected);
    return path;
  }

  for (let pointIndex = start.segmentIndex + 1; pointIndex <= end.segmentIndex; pointIndex += 1) {
    appendUnique(path, fullPath[pointIndex]);
  }

  appendUnique(path, end.projected);
  return path;
}

function buildBoundarySnaps(
  path: [number, number][],
  waypoints: RouteWaypoint[],
) {
  if (path.length < 2) return null;

  const cumulativeDistancesM = buildCumulativeDistances(path);
  const totalDistanceM = cumulativeDistancesM[cumulativeDistancesM.length - 1] ?? 0;
  const boundarySnaps: BoundarySnap[] = [
    {
      coordinate: path[0],
      waypointIndex: null,
      distanceAlongRouteM: 0,
      snapDistM: 0,
      segmentIndex: 0,
      projected: path[0],
    },
  ];

  let previousDistanceAlongRouteM = 0;
  for (let i = 0; i < waypoints.length; i += 1) {
    const coordinate: [number, number] = [waypoints[i].lng, waypoints[i].lat];
    const candidates = findBoundaryCandidates(path, coordinate, cumulativeDistancesM);
    const bestCandidate = pickBoundaryCandidate(
      candidates,
      previousDistanceAlongRouteM,
    );
    if (!bestCandidate) {
      return null;
    }

    boundarySnaps.push({
      ...bestCandidate,
      coordinate,
      waypointIndex: i,
    });
    previousDistanceAlongRouteM = bestCandidate.distanceAlongRouteM;
  }

  const lastSegmentIndex = Math.max(0, path.length - 2);
  if (
    totalDistanceM <=
    previousDistanceAlongRouteM + FORWARD_PROGRESS_EPSILON_M
  ) {
    return null;
  }

  boundarySnaps.push({
    coordinate: path[path.length - 1],
    waypointIndex: null,
    distanceAlongRouteM: totalDistanceM,
    snapDistM: 0,
    segmentIndex: lastSegmentIndex,
    projected: path[path.length - 1],
  });

  return boundarySnaps;
}

function mapGuidanceDistances(
  path: [number, number][],
  guidance: RouteGuidanceStep[],
) {
  const cumulativeDistancesM = buildCumulativeDistances(path);
  let previousDistanceAlongRouteM = -FORWARD_PROGRESS_EPSILON_M;

  return guidance
    .map((step) => {
      const candidates = findBoundaryCandidates(path, step.coordinate, cumulativeDistancesM);
      const bestCandidate = pickBoundaryCandidate(
        candidates,
        previousDistanceAlongRouteM,
      );
      if (!bestCandidate) return null;

      previousDistanceAlongRouteM = bestCandidate.distanceAlongRouteM;
      return {
        step,
        distanceAlongRouteM: bestCandidate.distanceAlongRouteM,
      };
    })
    .filter(
      (
        item,
      ): item is {
        step: RouteGuidanceStep;
        distanceAlongRouteM: number;
      } => item != null,
    );
}

export function buildRouteLegs(params: {
  path: [number, number][];
  waypoints?: RouteWaypoint[] | null;
  guidance?: RouteGuidanceStep[] | null;
}): RouteLeg[] {
  const { path, waypoints = [], guidance = [] } = params;
  if (path.length < 2 || waypoints.length === 0) return [];

  const boundarySnaps = buildBoundarySnaps(path, waypoints);
  if (!boundarySnaps || boundarySnaps.length < 2) return [];

  const snappedGuidance = mapGuidanceDistances(path, guidance);
  const legs: RouteLeg[] = [];

  for (let i = 0; i < boundarySnaps.length - 1; i += 1) {
    const start = boundarySnaps[i];
    const end = boundarySnaps[i + 1];
    const legDistanceM = end.distanceAlongRouteM - start.distanceAlongRouteM;
    if (legDistanceM < ROUTE_MIN_RENDERABLE_LENGTH_M) {
      return [];
    }

    const legPath = buildLegPath(path, start, end);
    if (legPath.length < 2) return [];

    const legGuidance = snappedGuidance
      .filter(
        ({ distanceAlongRouteM }) =>
          distanceAlongRouteM >
            start.distanceAlongRouteM + FORWARD_PROGRESS_EPSILON_M &&
          distanceAlongRouteM <=
            end.distanceAlongRouteM + FORWARD_PROGRESS_EPSILON_M,
      )
      .map(({ step }) => step);

    legs.push({
      index: i,
      path: legPath,
      guidance: legGuidance,
      startWaypointIndex: start.waypointIndex,
      endWaypointIndex: end.waypointIndex,
      startCoordinate: start.coordinate,
      endCoordinate: end.coordinate,
      startDistanceM: start.distanceAlongRouteM,
      endDistanceM: end.distanceAlongRouteM,
    });
  }

  return legs;
}
