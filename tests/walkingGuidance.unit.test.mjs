import assert from "node:assert/strict";
import test from "node:test";

import {
  getWalkingGuidanceSteps,
  resolveCurrentGuidanceIndex,
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

test("resolveCurrentGuidanceIndex advances only forward when a step is reached", () => {
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
      coordinate: [127.0004, 37.5],
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

  assert.equal(advancedIndex, 2);
  assert.equal(stableForwardIndex, 2);
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
