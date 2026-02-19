import assert from "node:assert/strict";
import test from "node:test";

import { buildRemainingPath, hasRenderablePolyline } from "../features/route/tracking/path.ts";
import { shouldPromptReroute, shouldSkipRouteRedraw } from "../features/route/tracking/policy.ts";
import { findNearestSnap } from "../features/route/tracking/snap.ts";

test("findNearestSnap returns nearest segment from full search", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.003, 0],
  ];
  const snap = findNearestSnap(path, { lat: 0.00008, lng: 0.0024 }, null);

  assert.ok(snap);
  assert.equal(snap.segIdx, 2);
});

test("findNearestSnap falls back to full search when local best is too far", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.003, 0],
  ];
  const snap = findNearestSnap(
    path,
    { lat: 0.00008, lng: 0.0024 },
    0,
    {
      localBackwardSegments: 0,
      localForwardSegments: 0,
      fallbackDistanceM: 1,
    },
  );

  assert.ok(snap);
  assert.equal(snap.segIdx, 2);
});

test("shouldPromptReroute checks gate conditions and cooldown", () => {
  const canPrompt = shouldPromptReroute({
    isOffRoute: true,
    snapDistM: 70,
    promptShown: false,
    routeLoading: false,
    isModalOpen: false,
    lastPromptAt: 1000,
    now: 30_000,
  });

  const blockedByCooldown = shouldPromptReroute({
    isOffRoute: true,
    snapDistM: 70,
    promptShown: false,
    routeLoading: false,
    isModalOpen: false,
    lastPromptAt: 20_000,
    now: 30_000,
  });

  assert.equal(canPrompt, true);
  assert.equal(blockedByCooldown, false);
});

test("shouldSkipRouteRedraw skips only in stable in-route segment", () => {
  const skip = shouldSkipRouteRedraw({
    isOffRoute: false,
    wasOffRoute: false,
    prevProjected: { lat: 37.5, lng: 127.0 },
    prevProgressSegIdx: 3,
    progressedSegIdx: 3,
    projected: { lat: 37.5, lng: 127.00001 },
  });

  const noSkipWhenSegChanged = shouldSkipRouteRedraw({
    isOffRoute: false,
    wasOffRoute: false,
    prevProjected: { lat: 37.5, lng: 127.0 },
    prevProgressSegIdx: 3,
    progressedSegIdx: 4,
    projected: { lat: 37.5, lng: 127.00001 },
  });

  assert.equal(skip, true);
  assert.equal(noSkipWhenSegChanged, false);
});

test("buildRemainingPath prepends connector only when off-route within threshold", () => {
  const path = [
    [127.0, 37.5],
    [127.001, 37.5],
    [127.002, 37.5],
  ];
  const withConnector = buildRemainingPath({
    isOffRoute: true,
    snapDistM: 20,
    myPos: { lat: 37.5002, lng: 127.0003 },
    projected: { lat: 37.5, lng: 127.0004 },
    path,
    progressedSegIdx: 0,
  });
  const withoutConnector = buildRemainingPath({
    isOffRoute: true,
    snapDistM: 80,
    myPos: { lat: 37.5002, lng: 127.0003 },
    projected: { lat: 37.5, lng: 127.0004 },
    path,
    progressedSegIdx: 0,
  });

  assert.equal(withConnector[0][0], 127.0003);
  assert.equal(withConnector[1][0], 127.0004);
  assert.equal(withoutConnector[0][0], 127.0004);
});

test("hasRenderablePolyline requires minimum path length", () => {
  assert.equal(
    hasRenderablePolyline(
      [
        [127.0, 37.5],
        [127.000001, 37.5],
      ],
      3,
    ),
    false,
  );

  assert.equal(
    hasRenderablePolyline(
      [
        [127.0, 37.5],
        [127.0001, 37.5],
      ],
      3,
    ),
    true,
  );
});

