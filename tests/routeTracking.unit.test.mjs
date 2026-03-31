import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRemainingPath,
  hasRenderablePolyline,
} from "../features/route/tracking/path.ts";
import {
  shouldPromptReroute,
  shouldSkipRouteRedraw,
} from "../features/route/tracking/policy.ts";
import { findNearestSnap } from "../features/route/tracking/snap.ts";
import { buildTrackingRouteModel } from "../features/route/tracking/model.ts";
import {
  findMatchCandidates,
  resolveBestCursor,
} from "../features/route/tracking/matcher.ts";

function createRoute(path) {
  return { path };
}

function runTrackerSamples(path, samples) {
  const model = buildTrackingRouteModel(createRoute(path));
  let confirmedCursor = null;
  let pendingCandidate = null;

  return samples.map((sample) => {
    const candidates = findMatchCandidates(
      model,
      sample.pos,
      confirmedCursor,
      sample.heading ?? null,
    );
    const resolution = resolveBestCursor(
      model,
      candidates,
      confirmedCursor,
      pendingCandidate,
    );
    confirmedCursor = resolution.confirmedCursor;
    pendingCandidate = resolution.pendingCandidate;
    return {
      ...resolution,
      candidates,
    };
  });
}

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

test("buildTrackingRouteModel marks repeated overlap occurrences", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.003, 0],
    [0.002, 0],
    [0.001, 0],
    [0.001, -0.001],
  ];
  const model = buildTrackingRouteModel(createRoute(path));

  assert.equal(model.segments[1].overlapOccurrenceCount, 2);
  assert.equal(model.segments[1].overlapOccurrenceIndex, 0);
  assert.equal(model.segments[4].overlapOccurrenceCount, 2);
  assert.equal(model.segments[4].overlapOccurrenceIndex, 1);
  assert.equal(model.segments[2].overlapOccurrenceCount, 2);
  assert.equal(model.segments[3].overlapOccurrenceIndex, 1);
});

test("simple route tracking advances monotonically on a linear route", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.003, 0],
  ];
  const outputs = runTrackerSamples(path, [
    { pos: { lat: 0, lng: 0.0003 }, heading: 90 },
    { pos: { lat: 0, lng: 0.0012 }, heading: 90 },
    { pos: { lat: 0, lng: 0.0024 }, heading: 90 },
  ]);

  assert.equal(outputs[0].confirmedCursor?.segmentIndex, 0);
  assert.equal(outputs[1].confirmedCursor?.segmentIndex, 1);
  assert.equal(outputs[2].confirmedCursor?.segmentIndex, 2);
  assert.ok(
    outputs[2].confirmedCursor.distanceAlongRouteM >
      outputs[1].confirmedCursor.distanceAlongRouteM,
  );
});

test("full out-and-back route keeps outbound occurrence before turnaround", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.001, 0],
    [0, 0],
  ];
  const outputs = runTrackerSamples(path, [
    { pos: { lat: 0, lng: 0.0014 }, heading: 90 },
    { pos: { lat: 0, lng: 0.0016 }, heading: 90 },
  ]);

  assert.equal(outputs[0].confirmedCursor?.segmentIndex, 1);
  assert.equal(outputs[1].confirmedCursor?.segmentIndex, 1);
  assert.equal(outputs[1].candidates[0].segment.index, 1);
});

test("heading steers candidate selection on shared geometry", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.001, 0],
    [0, 0],
  ];
  const model = buildTrackingRouteModel(createRoute(path));
  const prevCursor = {
    segmentIndex: 1,
    projected: { lat: 0, lng: 0.0015 },
    distanceAlongRouteM: model.segments[1].startDistanceM + model.segments[1].lengthM * 0.5,
    snapDistM: 0,
    confidence: 1,
    overlapGroupIndex: model.segments[1].overlapGroupIndex,
    overlapOccurrenceIndex: model.segments[1].overlapOccurrenceIndex,
  };

  const eastCandidates = findMatchCandidates(
    model,
    { lat: 0, lng: 0.0014 },
    prevCursor,
    90,
  );
  const westCandidates = findMatchCandidates(
    model,
    { lat: 0, lng: 0.0014 },
    {
      ...prevCursor,
      segmentIndex: 2,
      overlapGroupIndex: model.segments[2].overlapGroupIndex,
      overlapOccurrenceIndex: model.segments[2].overlapOccurrenceIndex,
      distanceAlongRouteM:
        model.segments[2].startDistanceM + model.segments[2].lengthM * 0.5,
    },
    270,
  );

  assert.equal(eastCandidates[0].segment.index, 1);
  assert.equal(westCandidates[0].segment.index, 2);
});

test("partial out-and-back route tracks the intended sequence", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.003, 0],
    [0.002, 0],
    [0.001, 0],
    [0.001, -0.001],
  ];
  const outputs = runTrackerSamples(path, [
    { pos: { lat: 0, lng: 0.0004 }, heading: 90 },
    { pos: { lat: 0, lng: 0.0014 }, heading: 90 },
    { pos: { lat: 0, lng: 0.0025 }, heading: 90 },
    { pos: { lat: 0, lng: 0.0024 }, heading: 270 },
    { pos: { lat: 0, lng: 0.0023 }, heading: 270 },
    { pos: { lat: 0, lng: 0.0014 }, heading: 270 },
    { pos: { lat: -0.0007, lng: 0.001 }, heading: 180 },
  ]);

  assert.deepEqual(
    outputs.map((item) => item.confirmedCursor?.segmentIndex),
    [0, 1, 2, 2, 3, 4, 5],
  );
  assert.equal(outputs[3].ambiguous, true);
});

test("resolveBestCursor keeps progress during ambiguous overlap switch until confirmed", () => {
  const path = [
    [0, 0],
    [0.001, 0],
    [0.002, 0],
    [0.003, 0],
    [0.002, 0],
    [0.001, 0],
    [0.001, -0.001],
  ];
  const model = buildTrackingRouteModel(createRoute(path));
  const prevConfirmedCursor = {
    segmentIndex: 1,
    projected: { lat: 0, lng: 0.0015 },
    distanceAlongRouteM:
      model.segments[1].startDistanceM + model.segments[1].lengthM * 0.5,
    snapDistM: 0.5,
    confidence: 1,
    overlapGroupIndex: model.segments[1].overlapGroupIndex,
    overlapOccurrenceIndex: model.segments[1].overlapOccurrenceIndex,
  };
  const futureOverlapCandidate = {
    segment: model.segments[4],
    projected: { lat: 0, lng: 0.00145 },
    snapDistM: 1,
    distanceAlongRouteM:
      model.segments[4].startDistanceM + model.segments[4].lengthM * 0.45,
    headingDeltaDeg: 0,
    progressDeltaM: 8,
    isValidTransition: true,
    score: 2,
    confidence: 0.9,
    reasons: ["penalty:overlap-occurrence-change"],
  };
  const currentCandidate = {
    segment: model.segments[1],
    projected: { lat: 0, lng: 0.00155 },
    snapDistM: 1.2,
    distanceAlongRouteM:
      model.segments[1].startDistanceM + model.segments[1].lengthM * 0.55,
    headingDeltaDeg: 5,
    progressDeltaM: 5,
    isValidTransition: true,
    score: 5,
    confidence: 0.82,
    reasons: [],
  };

  const first = resolveBestCursor(
    model,
    [futureOverlapCandidate, currentCandidate],
    prevConfirmedCursor,
    null,
  );
  const second = resolveBestCursor(
    model,
    [futureOverlapCandidate, currentCandidate],
    first.confirmedCursor,
    first.pendingCandidate,
  );

  assert.equal(first.ambiguous, true);
  assert.equal(first.confirmedCursor.segmentIndex, 1);
  assert.equal(second.ambiguous, false);
  assert.equal(second.confirmedCursor.segmentIndex, 4);
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

test("shouldSkipRouteRedraw skips only for tiny projected and progress movement", () => {
  const skip = shouldSkipRouteRedraw({
    isOffRoute: false,
    wasOffRoute: false,
    prevCursor: {
      segmentIndex: 3,
      projected: { lat: 37.5, lng: 127.0 },
      distanceAlongRouteM: 150,
      snapDistM: 0.2,
      confidence: 1,
      overlapGroupIndex: 3,
      overlapOccurrenceIndex: 0,
    },
    cursor: {
      segmentIndex: 4,
      projected: { lat: 37.5, lng: 127.00001 },
      distanceAlongRouteM: 152,
      snapDistM: 0.3,
      confidence: 1,
      overlapGroupIndex: 4,
      overlapOccurrenceIndex: 0,
    },
  });

  const noSkipWhenProgressed = shouldSkipRouteRedraw({
    isOffRoute: false,
    wasOffRoute: false,
    prevCursor: {
      segmentIndex: 3,
      projected: { lat: 37.5, lng: 127.0 },
      distanceAlongRouteM: 150,
      snapDistM: 0.2,
      confidence: 1,
      overlapGroupIndex: 3,
      overlapOccurrenceIndex: 0,
    },
    cursor: {
      segmentIndex: 4,
      projected: { lat: 37.5, lng: 127.0005 },
      distanceAlongRouteM: 170,
      snapDistM: 0.3,
      confidence: 1,
      overlapGroupIndex: 4,
      overlapOccurrenceIndex: 0,
    },
  });

  assert.equal(skip, true);
  assert.equal(noSkipWhenProgressed, false);
});

test("buildRemainingPath prepends connector only when off-route within threshold", () => {
  const path = [
    [127.0, 37.5],
    [127.001, 37.5],
    [127.002, 37.5],
  ];
  const cursor = {
    segmentIndex: 0,
    projected: { lat: 37.5, lng: 127.0004 },
    distanceAlongRouteM: 40,
    snapDistM: 20,
    confidence: 1,
    overlapGroupIndex: 0,
    overlapOccurrenceIndex: 0,
  };
  const withConnector = buildRemainingPath({
    isOffRoute: true,
    snapDistM: 20,
    myPos: { lat: 37.5002, lng: 127.0003 },
    path,
    cursor,
  });
  const withoutConnector = buildRemainingPath({
    isOffRoute: true,
    snapDistM: 80,
    myPos: { lat: 37.5002, lng: 127.0003 },
    path,
    cursor,
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
