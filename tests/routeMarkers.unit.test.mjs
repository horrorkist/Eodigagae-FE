import assert from "node:assert/strict";
import test from "node:test";

import { resolveRouteMarkers } from "../lib/routeMarker.ts";

function createDogRoute() {
  return {
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.003, 37.5],
      [127.004, 37.5],
    ],
    waypoints: [
      {
        coordinate: [127.0, 37.5],
        markerCoordinate: [127.0, 37.5],
        title: "출발지",
        order: 0,
        kind: "start",
        distanceAlongRouteM: 0,
      },
      {
        coordinate: [127.0005, 37.5002],
        markerCoordinate: [127.001, 37.5],
        title: "경유지 1",
        order: 1,
        kind: "pivot",
        distanceAlongRouteM: 100,
      },
      {
        coordinate: [127.0016, 37.5004],
        markerCoordinate: [127.002, 37.5],
        title: "쓰레기통",
        order: 2,
        kind: "pivot",
        facilityKind: "trash-bin",
        distanceAlongRouteM: 200,
      },
      {
        coordinate: [127.0027, 37.5003],
        markerCoordinate: [127.003, 37.5],
        title: "음수대",
        order: 3,
        kind: "pivot",
        facilityKind: "fountain",
        distanceAlongRouteM: 300,
      },
      {
        coordinate: [127.004, 37.5],
        markerCoordinate: [127.004, 37.5],
        title: "도착지",
        order: 4,
        kind: "end",
        distanceAlongRouteM: 400,
      },
    ],
    legs: [
      {
        index: 0,
        path: [
          [127.0, 37.5],
          [127.001, 37.5],
        ],
        startWaypointIndex: null,
        endWaypointIndex: 0,
        startCoordinate: [127.0, 37.5],
        endCoordinate: [127.001, 37.5],
        startDistanceM: 0,
        endDistanceM: 100,
      },
      {
        index: 1,
        path: [
          [127.001, 37.5],
          [127.002, 37.5],
        ],
        startWaypointIndex: 0,
        endWaypointIndex: 1,
        startCoordinate: [127.001, 37.5],
        endCoordinate: [127.002, 37.5],
        startDistanceM: 100,
        endDistanceM: 200,
      },
      {
        index: 2,
        path: [
          [127.002, 37.5],
          [127.003, 37.5],
        ],
        startWaypointIndex: 1,
        endWaypointIndex: 2,
        startCoordinate: [127.002, 37.5],
        endCoordinate: [127.003, 37.5],
        startDistanceM: 200,
        endDistanceM: 300,
      },
      {
        index: 3,
        path: [
          [127.003, 37.5],
          [127.004, 37.5],
        ],
        startWaypointIndex: 2,
        endWaypointIndex: null,
        startCoordinate: [127.003, 37.5],
        endCoordinate: [127.004, 37.5],
        startDistanceM: 300,
        endDistanceM: 400,
      },
    ],
  };
}

test("resolveRouteMarkers returns a destination marker for poi-route", () => {
  const markers = resolveRouteMarkers({
    route: {
      path: [
        [127.0, 37.5],
        [127.002, 37.502],
      ],
      waypoints: [
        {
          coordinate: [127.002, 37.502],
          markerCoordinate: [127.002, 37.502],
          title: "도착지",
          order: 0,
          kind: "end",
          distanceAlongRouteM: null,
        },
      ],
    },
    drawRoute: true,
    pickedPos: null,
    routeExperienceSource: "poi-route",
    walking: false,
    activeRouteLegIndex: 0,
  });

  assert.deepEqual(markers, [
    {
      key: "destination",
      coordinate: [127.002, 37.502],
      title: "도착지",
      variant: "destination",
    },
  ]);
});

test("resolveRouteMarkers shows snapped waypoint markers and raw facility markers in preview", () => {
  const markers = resolveRouteMarkers({
    route: createDogRoute(),
    drawRoute: true,
    pickedPos: { lat: 37.5, lng: 127.0 },
    routeExperienceSource: "dog-recommend",
    walking: false,
    activeRouteLegIndex: 0,
  });

  assert.deepEqual(markers, [
    {
      key: "start",
      coordinate: [127.0, 37.5],
      title: "출발지",
      variant: "start",
    },
    {
      key: "pivot-1",
      coordinate: [127.001, 37.5],
      title: "경유지 1",
      variant: "pivot",
      label: "1",
    },
    {
      key: "pivot-2",
      coordinate: [127.002, 37.5],
      title: "쓰레기통",
      variant: "pivot",
      label: "2",
    },
    {
      key: "pivot-3",
      coordinate: [127.003, 37.5],
      title: "음수대",
      variant: "pivot",
      label: "3",
    },
    {
      key: "facility-2",
      coordinate: [127.0016, 37.5004],
      title: "쓰레기통",
      variant: "facility",
      facilitySource: "trash-bin",
    },
    {
      key: "facility-3",
      coordinate: [127.0027, 37.5003],
      title: "음수대",
      variant: "facility",
      facilitySource: "fountain",
    },
  ]);
});

test("resolveRouteMarkers shows the current waypoint marker while walking", () => {
  const markers = resolveRouteMarkers({
    route: createDogRoute(),
    drawRoute: true,
    pickedPos: { lat: 37.5, lng: 127.0 },
    routeExperienceSource: "dog-recommend",
    walking: true,
    activeRouteLegIndex: 1,
  });

  assert.deepEqual(markers, [
    {
      key: "pivot-2",
      coordinate: [127.002, 37.5],
      title: "쓰레기통",
      variant: "pivot",
      label: "2",
    },
    {
      key: "facility-2",
      coordinate: [127.0016, 37.5004],
      title: "쓰레기통",
      variant: "facility",
      facilitySource: "trash-bin",
    },
  ]);
});

test("resolveRouteMarkers shows the final destination on the last dog leg", () => {
  const markers = resolveRouteMarkers({
    route: createDogRoute(),
    drawRoute: true,
    pickedPos: { lat: 37.5, lng: 127.0 },
    routeExperienceSource: "dog-recommend",
    walking: true,
    activeRouteLegIndex: 3,
  });

  assert.deepEqual(markers, [
    {
      key: "destination",
      coordinate: [127.004, 37.5],
      title: "도착지",
      variant: "destination",
    },
  ]);
});
