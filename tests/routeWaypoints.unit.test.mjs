import assert from "node:assert/strict";
import test from "node:test";

import { projectRouteWaypoints } from "../features/route/waypoints.ts";

test("projectRouteWaypoints anchors start and end before projecting pivot waypoints", () => {
  const projected = projectRouteWaypoints({
    path: [
      [127.0, 37.0],
      [127.001, 37.0],
      [127.001, 37.001],
      [127.0002, 37.0012],
      [127.0001, 37.0013],
    ],
    waypoints: [
      {
        coordinate: [127.00015, 37.00125],
        title: "출발지",
        order: 0,
        kind: "start",
        facilityKind: null,
      },
      {
        coordinate: [127.00105, 37.00005],
        title: "쓰레기통",
        order: 1,
        kind: "pivot",
        facilityKind: "trash-bin",
      },
      {
        coordinate: [127.00015, 37.00125],
        title: "도착지",
        order: 2,
        kind: "end",
        facilityKind: null,
      },
    ],
  });

  assert.equal(projected[0].distanceAlongRouteM, 0);
  assert.ok(projected[1].distanceAlongRouteM != null);
  assert.ok(projected[1].distanceAlongRouteM < 150);
  assert.deepEqual(projected[1].markerCoordinate, [127.001, 37.00005]);
  assert.ok(projected[2].distanceAlongRouteM != null);
  assert.ok(projected[2].distanceAlongRouteM > projected[1].distanceAlongRouteM);
});
