import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRouteProgressGuidanceSteps,
  getWalkingGuidanceSteps,
  resolveCurrentGuidanceIndex,
  resolveCurrentGuidanceIndexFromProgress,
  toDisplayStep,
} from "../components/map-overlay/walkingGuidance.ts";

test("getWalkingGuidanceSteps excludes start points", () => {
  const steps = getWalkingGuidanceSteps([
    {
      order: 0,
      coordinate: [127.0, 37.5],
      pointType: "SP",
      description: "출발",
    },
    {
      order: 1,
      coordinate: [127.0005, 37.5001],
      description: "우회전",
    },
  ]);

  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.description, "우회전");
});

test("resolveCurrentGuidanceIndex keeps the current step until the next step is reached", () => {
  const steps = [
    {
      order: 0,
      coordinate: [127.0, 37.5],
      description: "첫 안내",
    },
    {
      order: 1,
      coordinate: [127.0002, 37.5],
      description: "둘째 안내",
    },
    {
      order: 2,
      coordinate: [127.0005, 37.5],
      description: "셋째 안내",
    },
  ];

  const advancedIndex = resolveCurrentGuidanceIndex({
    steps,
    myPos: { lat: 37.5, lng: 127.00019 },
    lastResolvedIndex: 0,
  });
  const stableForwardIndex = resolveCurrentGuidanceIndex({
    steps,
    myPos: { lat: 37.5, lng: 127.00002 },
    lastResolvedIndex: 2,
  });

  assert.equal(advancedIndex, 1);
  assert.equal(stableForwardIndex, 2);
});

test("buildRouteProgressGuidanceSteps keeps round-trip guidance in route order", () => {
  const progressSteps = buildRouteProgressGuidanceSteps({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.001, 37.5],
      [127.0, 37.5],
    ],
    guidance: [
      {
        order: 0,
        coordinate: [127.0015, 37.5],
        description: "왕복-1",
      },
      {
        order: 1,
        coordinate: [127.0015, 37.5],
        description: "왕복-2",
      },
    ],
  });

  assert.equal(progressSteps.length, 2);
  assert.ok(progressSteps[0].distanceAlongRouteM < progressSteps[1].distanceAlongRouteM);
  assert.equal(progressSteps[0].segmentIndex, 1);
  assert.equal(progressSteps[1].segmentIndex, 2);
});

test("resolveCurrentGuidanceIndexFromProgress keeps the current instruction until the next step threshold", () => {
  const steps = buildRouteProgressGuidanceSteps({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.003, 37.5],
    ],
    guidance: [
      {
        order: 0,
        coordinate: [127.0006, 37.5],
        description: "첫 안내",
      },
      {
        order: 1,
        coordinate: [127.0016, 37.5],
        description: "둘째 안내",
      },
      {
        order: 2,
        coordinate: [127.0026, 37.5],
        description: "셋째 안내",
      },
    ],
  });

  const firstIndex = resolveCurrentGuidanceIndexFromProgress({
    steps,
    progressM: 30,
    lastResolvedIndex: 0,
  });
  const secondIndex = resolveCurrentGuidanceIndexFromProgress({
    steps,
    progressM: steps[0].distanceAlongRouteM + 5,
    lastResolvedIndex: firstIndex,
  });
  const thirdIndex = resolveCurrentGuidanceIndexFromProgress({
    steps,
    progressM: steps[1].distanceAlongRouteM - 5,
    lastResolvedIndex: secondIndex,
  });
  const fourthIndex = resolveCurrentGuidanceIndexFromProgress({
    steps,
    progressM: steps[2].distanceAlongRouteM + 5,
    lastResolvedIndex: thirdIndex,
  });

  assert.equal(firstIndex, 0);
  assert.equal(secondIndex, 0);
  assert.equal(thirdIndex, 1);
  assert.equal(fourthIndex, 2);
});

test("resolveCurrentGuidanceIndexFromProgress can skip multiple reached steps", () => {
  const steps = buildRouteProgressGuidanceSteps({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
      [127.003, 37.5],
      [127.004, 37.5],
    ],
    guidance: [
      {
        order: 0,
        coordinate: [127.0007, 37.5],
        description: "첫 안내",
      },
      {
        order: 1,
        coordinate: [127.0016, 37.5],
        description: "둘째 안내",
      },
      {
        order: 2,
        coordinate: [127.0025, 37.5],
        description: "셋째 안내",
      },
      {
        order: 3,
        coordinate: [127.0035, 37.5],
        description: "넷째 안내",
      },
    ],
  });

  const nextIndex = resolveCurrentGuidanceIndexFromProgress({
    steps,
    progressM: steps[3].distanceAlongRouteM + 3,
    lastResolvedIndex: 0,
  });

  assert.equal(nextIndex, 3);
});

test("resolveCurrentGuidanceIndexFromProgress keeps last index when progress is temporarily null", () => {
  const steps = buildRouteProgressGuidanceSteps({
    path: [
      [127.0, 37.5],
      [127.001, 37.5],
      [127.002, 37.5],
    ],
    guidance: [
      {
        order: 0,
        coordinate: [127.0006, 37.5],
        description: "첫 안내",
      },
      {
        order: 1,
        coordinate: [127.0016, 37.5],
        description: "둘째 안내",
      },
    ],
  });

  const stableIndex = resolveCurrentGuidanceIndexFromProgress({
    steps,
    progressM: null,
    lastResolvedIndex: 1,
  });

  assert.equal(stableIndex, 1);
});

test("toDisplayStep uses EP copy for destination guidance", () => {
  const display = toDisplayStep({
    order: 3,
    coordinate: [127.001, 37.501],
    pointType: "EP",
  });

  assert.deepEqual(display, {
    title: "목적지 근처예요",
    subtitle: "안내를 마무리하고 있어요",
  });
});
