import assert from "node:assert/strict";
import test from "node:test";

import { buildRouteLegs } from "../features/route/legs.ts";

test("buildRouteLegs splits a one-way path by waypoint boundaries", () => {
  const legs = buildRouteLegs({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.003, 37.5],
    ],
    waypoints: [
      {
        lat: 37.5,
        lng: 127.0012,
        title: "경유지 1",
        source: "stroll-api",
      },
      {
        lat: 37.5,
        lng: 127.0022,
        title: "경유지 2",
        source: "stroll-api",
      },
    ],
  });

  assert.equal(legs.length, 3);
  assert.equal(legs[0].endWaypointIndex, 0);
  assert.equal(legs[1].startWaypointIndex, 0);
  assert.equal(legs[1].endWaypointIndex, 1);
  assert.equal(legs[2].endWaypointIndex, null);
});

test("buildRouteLegs keeps increasing leg order on an out-and-back path", () => {
  const legs = buildRouteLegs({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.001, 37.5],
      [127.0, 37.5],
    ],
    waypoints: [
      {
        lat: 37.5,
        lng: 127.0016,
        title: "왕복-1",
        source: "stroll-api",
      },
      {
        lat: 37.5,
        lng: 127.0014,
        title: "왕복-2",
        source: "stroll-api",
      },
    ],
  });

  assert.equal(legs.length, 3);
  assert.ok(legs[0].endDistanceM < legs[1].endDistanceM);
  assert.ok(legs[1].endDistanceM < legs[2].endDistanceM);
  assert.ok(legs[1].path.length >= 2);
});

test("buildRouteLegs keeps the first round-trip leg on the outbound segment only", () => {
  const legs = buildRouteLegs({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.001, 37.5],
      [127.0, 37.5],
    ],
    waypoints: [
      {
        lat: 37.5,
        lng: 127.002,
        title: "반환점",
        source: "stroll-api",
      },
    ],
  });

  assert.equal(legs.length, 2);
  assert.deepEqual(legs[0].path, [
    [127.0, 37.5],
    [127.001, 37.5],
    [127.002, 37.5],
  ]);
  assert.deepEqual(legs[1].path, [
    [127.002, 37.5],
    [127.001, 37.5],
    [127.0, 37.5],
  ]);
});

test("buildRouteLegs returns empty legs when waypoints are missing", () => {
  const legs = buildRouteLegs({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
    ],
    waypoints: [],
  });

  assert.deepEqual(legs, []);
});

test("buildRouteLegs assigns guidance to the matching leg range", () => {
  const legs = buildRouteLegs({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.003, 37.5],
    ],
    waypoints: [
      {
        lat: 37.5,
        lng: 127.0015,
        title: "경유지 1",
        source: "stroll-api",
      },
    ],
    guidance: [
      {
        order: 0,
        coordinate: [127.0008, 37.5],
        description: "첫 안내",
      },
      {
        order: 1,
        coordinate: [127.0022, 37.5],
        description: "둘째 안내",
      },
    ],
  });

  assert.equal(legs.length, 2);
  assert.equal(legs[0].guidance?.length, 1);
  assert.equal(legs[0].guidance?.[0].description, "첫 안내");
  assert.equal(legs[1].guidance?.length, 1);
  assert.equal(legs[1].guidance?.[0].description, "둘째 안내");
});
