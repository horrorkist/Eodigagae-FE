import { projectPointToSegmentMeters } from "../../lib/geo.ts";
import type {
  RouteWaypointKind,
  RouteWaypointMeta,
} from "../../domain/route/types.ts";
import { haversineMeters } from "./tracking/path.ts";

type LatLng = {
  lat: number;
  lng: number;
};

type RouteWaypointProjectionInput = {
  coordinate: [number, number];
  title: string;
  order: number;
  kind: RouteWaypointKind;
};

type ProjectionCandidate = {
  distanceAlongRouteM: number;
  snapDistM: number;
  projected: [number, number];
};

const PROJECTION_FORWARD_EPSILON_M = 0.01;

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

function compareProjectionCandidates(
  left: ProjectionCandidate,
  right: ProjectionCandidate,
) {
  if (left.snapDistM !== right.snapDistM) {
    return left.snapDistM - right.snapDistM;
  }

  return left.distanceAlongRouteM - right.distanceAlongRouteM;
}

function findProjectionCandidates(
  path: [number, number][],
  coordinate: [number, number],
  cumulativeDistancesM: number[],
) {
  const point = toLatLng(coordinate);
  const candidates: ProjectionCandidate[] = [];

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
      projected: [projection.point.lng, projection.point.lat],
    });
  }

  return candidates;
}

function resolveProjectionCandidate(
  candidates: ProjectionCandidate[],
  previousDistanceAlongRouteM: number,
) {
  const forwardCandidates = candidates.filter(
    (candidate) =>
      candidate.distanceAlongRouteM >
      previousDistanceAlongRouteM + PROJECTION_FORWARD_EPSILON_M,
  );
  if (forwardCandidates.length === 0) return null;

  return forwardCandidates.reduce((best, candidate) =>
    compareProjectionCandidates(candidate, best) < 0 ? candidate : best,
  );
}

export function projectRouteWaypoints(params: {
  path: [number, number][];
  waypoints: RouteWaypointProjectionInput[];
}): RouteWaypointMeta[] {
  const { path, waypoints } = params;
  if (path.length < 2) {
    return waypoints.map((waypoint) => ({
      ...waypoint,
      markerCoordinate: waypoint.coordinate,
      distanceAlongRouteM: null,
    }));
  }

  const cumulativeDistancesM = buildCumulativeDistances(path);
  const totalDistanceM = cumulativeDistancesM[cumulativeDistancesM.length - 1] ?? 0;
  let previousDistanceAlongRouteM = -PROJECTION_FORWARD_EPSILON_M * 2;

  return waypoints.map((waypoint) => {
    if (waypoint.kind === "start") {
      previousDistanceAlongRouteM = Math.max(previousDistanceAlongRouteM, 0);

      return {
        ...waypoint,
        markerCoordinate: waypoint.coordinate,
        distanceAlongRouteM: 0,
      };
    }

    if (waypoint.kind === "end") {
      previousDistanceAlongRouteM = Math.max(
        previousDistanceAlongRouteM,
        totalDistanceM,
      );

      return {
        ...waypoint,
        markerCoordinate: waypoint.coordinate,
        distanceAlongRouteM: totalDistanceM,
      };
    }

    const candidate = resolveProjectionCandidate(
      findProjectionCandidates(path, waypoint.coordinate, cumulativeDistancesM),
      previousDistanceAlongRouteM,
    );

    if (!candidate) {
      return {
        ...waypoint,
        markerCoordinate: waypoint.coordinate,
        distanceAlongRouteM: null,
      };
    }

    previousDistanceAlongRouteM = candidate.distanceAlongRouteM;

    return {
      ...waypoint,
      markerCoordinate: candidate.projected,
      distanceAlongRouteM: candidate.distanceAlongRouteM,
    };
  });
}
