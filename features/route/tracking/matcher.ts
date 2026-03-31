import { projectPointToSegmentMeters } from "../../../lib/geo.ts";
import type { LatLng } from "@/types/mapEvents";
import {
  SNAP_FALLBACK_DISTANCE_M,
  SNAP_LOCAL_BACKWARD_SEGMENTS,
  SNAP_LOCAL_FORWARD_SEGMENTS,
  TRACKING_AMBIGUITY_SCORE_DELTA,
  TRACKING_HEADING_HARD_REJECT_DEG,
  TRACKING_HEADING_WEIGHT,
  TRACKING_MAX_BACKWARD_JUMP_M,
  TRACKING_MAX_FORWARD_JUMP_M,
  TRACKING_PENDING_CONFIRM_COUNT,
  TRACKING_PENDING_CONFIRM_DISTANCE_M,
  TRACKING_PROGRESS_SEGMENT_JUMP_PENALTY,
  TRACKING_PROGRESS_SOFT_BACKWARD_M,
  TRACKING_PROGRESS_SOFT_FORWARD_M,
} from "./constants.ts";
import type { TrackingRouteModel, TrackingSegment } from "./model.ts";

export type TrackingCursor = {
  segmentIndex: number;
  projected: LatLng;
  distanceAlongRouteM: number;
  snapDistM: number;
  confidence: number;
  overlapGroupIndex: number;
  overlapOccurrenceIndex: number;
};

export type TrackingMatchCandidate = {
  segment: TrackingSegment;
  projected: LatLng;
  snapDistM: number;
  distanceAlongRouteM: number;
  headingDeltaDeg: number | null;
  progressDeltaM: number;
  isValidTransition: boolean;
  score: number;
  confidence: number;
  reasons: string[];
};

export type TrackingPendingCandidate = {
  candidateKey: string;
  segmentIndex: number;
  overlapGroupIndex: number;
  overlapOccurrenceIndex: number;
  firstSeenDistanceAlongRouteM: number;
  latestDistanceAlongRouteM: number;
  seenCount: number;
};

export type TrackingResolution = {
  confirmedCursor: TrackingCursor | null;
  pendingCandidate: TrackingPendingCandidate | null;
  leadingCandidate: TrackingMatchCandidate | null;
  ambiguous: boolean;
};

type FindMatchCandidatesOptions = {
  localBackwardSegments?: number;
  localForwardSegments?: number;
  fallbackDistanceM?: number;
};

function headingDeltaDeg(a: number, b: number) {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

function candidateKeyOf(candidate: TrackingMatchCandidate) {
  return [
    candidate.segment.index,
    candidate.segment.overlapGroupIndex,
    candidate.segment.overlapOccurrenceIndex,
  ].join(":");
}

function toCursor(candidate: TrackingMatchCandidate): TrackingCursor {
  return {
    segmentIndex: candidate.segment.index,
    projected: candidate.projected,
    distanceAlongRouteM: candidate.distanceAlongRouteM,
    snapDistM: candidate.snapDistM,
    confidence: candidate.confidence,
    overlapGroupIndex: candidate.segment.overlapGroupIndex,
    overlapOccurrenceIndex: candidate.segment.overlapOccurrenceIndex,
  };
}

function evaluateTransition(params: {
  candidateSegment: TrackingSegment;
  prevCursor: TrackingCursor | null;
  snapDistM: number;
  distanceAlongRouteM: number;
  headingDeg: number | null | undefined;
}) {
  const {
    candidateSegment,
    prevCursor,
    snapDistM,
    distanceAlongRouteM,
    headingDeg,
  } = params;
  const reasons: string[] = [];

  const headingDelta =
    headingDeg == null ? null : headingDeltaDeg(headingDeg, candidateSegment.bearingDeg);
  const progressDeltaM =
    prevCursor == null ? 0 : distanceAlongRouteM - prevCursor.distanceAlongRouteM;

  if (prevCursor && progressDeltaM < -TRACKING_MAX_BACKWARD_JUMP_M) {
    return {
      headingDelta,
      progressDeltaM,
      isValidTransition: false,
      reasons: ["hard-reject:backward-jump"],
    };
  }

  if (prevCursor && progressDeltaM > TRACKING_MAX_FORWARD_JUMP_M) {
    return {
      headingDelta,
      progressDeltaM,
      isValidTransition: false,
      reasons: ["hard-reject:forward-jump"],
    };
  }

  if (
    prevCursor &&
    candidateSegment.overlapGroupIndex === prevCursor.overlapGroupIndex &&
    candidateSegment.overlapOccurrenceIndex > prevCursor.overlapOccurrenceIndex &&
    candidateSegment.index - prevCursor.segmentIndex > 1
  ) {
    return {
      headingDelta,
      progressDeltaM,
      isValidTransition: false,
      reasons: ["hard-reject:future-overlap-occurrence"],
    };
  }

  if (
    prevCursor &&
    headingDelta != null &&
    headingDelta >= TRACKING_HEADING_HARD_REJECT_DEG &&
    candidateSegment.index !== prevCursor.segmentIndex
  ) {
    return {
      headingDelta,
      progressDeltaM,
      isValidTransition: false,
      reasons: ["hard-reject:heading-opposite"],
    };
  }

  if (prevCursor && progressDeltaM < -TRACKING_PROGRESS_SOFT_BACKWARD_M) {
    reasons.push("penalty:backward-progress");
  }
  if (prevCursor && progressDeltaM > TRACKING_PROGRESS_SOFT_FORWARD_M) {
    reasons.push("penalty:forward-progress");
  }
  if (
    prevCursor &&
    candidateSegment.index > prevCursor.segmentIndex + 1
  ) {
    reasons.push("penalty:segment-jump");
  }
  if (
    prevCursor &&
    candidateSegment.overlapGroupIndex === prevCursor.overlapGroupIndex &&
    candidateSegment.overlapOccurrenceIndex !== prevCursor.overlapOccurrenceIndex
  ) {
    reasons.push("penalty:overlap-occurrence-change");
  }
  if (headingDelta != null) {
    reasons.push("signal:heading");
  }
  if (snapDistM > SNAP_FALLBACK_DISTANCE_M) {
    reasons.push("signal:far-snap");
  }

  return {
    headingDelta,
    progressDeltaM,
    isValidTransition: true,
    reasons,
  };
}

function scoreCandidate(params: {
  snapDistM: number;
  progressDeltaM: number;
  headingDeltaDeg: number | null;
  prevCursor: TrackingCursor | null;
  segment: TrackingSegment;
}) {
  const { snapDistM, progressDeltaM, headingDeltaDeg, prevCursor, segment } =
    params;

  let score = snapDistM * 1.5;

  if (prevCursor) {
    const isAdjacentForwardSegment =
      segment.index === prevCursor.segmentIndex + 1;

    if (progressDeltaM < -TRACKING_PROGRESS_SOFT_BACKWARD_M) {
      score +=
        (Math.abs(progressDeltaM) - TRACKING_PROGRESS_SOFT_BACKWARD_M) * 3;
    }
    if (
      progressDeltaM > TRACKING_PROGRESS_SOFT_FORWARD_M &&
      !isAdjacentForwardSegment
    ) {
      score +=
        (progressDeltaM - TRACKING_PROGRESS_SOFT_FORWARD_M) * 1.25;
    }

    const jumpedSegments = Math.max(
      0,
      segment.index - prevCursor.segmentIndex - 1,
    );
    score += jumpedSegments * TRACKING_PROGRESS_SEGMENT_JUMP_PENALTY;

    if (
      segment.overlapGroupIndex === prevCursor.overlapGroupIndex &&
      segment.overlapOccurrenceIndex !== prevCursor.overlapOccurrenceIndex
    ) {
      score += 12;
    }
  }

  if (headingDeltaDeg != null) {
    score += headingDeltaDeg * TRACKING_HEADING_WEIGHT;
  }

  return score;
}

function buildCandidatesForIndices(params: {
  model: TrackingRouteModel;
  indices: number[];
  myPos: LatLng;
  prevCursor: TrackingCursor | null;
  headingDeg: number | null | undefined;
}) {
  const { model, indices, myPos, prevCursor, headingDeg } = params;
  const candidates: TrackingMatchCandidate[] = [];

  for (const index of indices) {
    const segment = model.segments[index];
    if (!segment) continue;

    const projection = projectPointToSegmentMeters(myPos, segment.start, segment.end);
    const distanceAlongRouteM =
      segment.startDistanceM + segment.lengthM * projection.t;
    const transition = evaluateTransition({
      candidateSegment: segment,
      prevCursor,
      snapDistM: projection.distM,
      distanceAlongRouteM,
      headingDeg,
    });
    if (!transition.isValidTransition) continue;

    const score = scoreCandidate({
      snapDistM: projection.distM,
      progressDeltaM: transition.progressDeltaM,
      headingDeltaDeg: transition.headingDelta,
      prevCursor,
      segment,
    });
    const confidence = Math.max(0, Math.min(1, 1 - score / 150));

    candidates.push({
      segment,
      projected: projection.point,
      snapDistM: projection.distM,
      distanceAlongRouteM,
      headingDeltaDeg: transition.headingDelta,
      progressDeltaM: transition.progressDeltaM,
      isValidTransition: true,
      score,
      confidence,
      reasons: transition.reasons,
    });
  }

  return candidates.sort((a, b) => a.score - b.score);
}

export function findMatchCandidates(
  model: TrackingRouteModel,
  myPos: LatLng,
  prevCursor: TrackingCursor | null,
  headingDeg: number | null | undefined,
  options: FindMatchCandidatesOptions = {},
): TrackingMatchCandidate[] {
  const localBackwardSegments =
    options.localBackwardSegments ?? SNAP_LOCAL_BACKWARD_SEGMENTS;
  const localForwardSegments =
    options.localForwardSegments ?? SNAP_LOCAL_FORWARD_SEGMENTS;
  const fallbackDistanceM =
    options.fallbackDistanceM ?? SNAP_FALLBACK_DISTANCE_M;

  if (model.segments.length === 0) return [];

  if (prevCursor == null) {
    return buildCandidatesForIndices({
      model,
      indices: model.segments.map((segment) => segment.index),
      myPos,
      prevCursor,
      headingDeg,
    });
  }

  const localStart = Math.max(0, prevCursor.segmentIndex - localBackwardSegments);
  const localEnd = Math.min(
    model.segments.length - 1,
    prevCursor.segmentIndex + localForwardSegments,
  );
  const localIndices: number[] = [];
  for (let i = localStart; i <= localEnd; i += 1) {
    localIndices.push(i);
  }

  const localCandidates = buildCandidatesForIndices({
    model,
    indices: localIndices,
    myPos,
    prevCursor,
    headingDeg,
  });
  if (localCandidates[0] && localCandidates[0].snapDistM <= fallbackDistanceM) {
    return localCandidates;
  }

  return buildCandidatesForIndices({
    model,
    indices: model.segments.map((segment) => segment.index),
    myPos,
    prevCursor,
    headingDeg,
  });
}

export function resolveBestCursor(
  model: TrackingRouteModel,
  candidates: TrackingMatchCandidate[],
  prevConfirmedCursor: TrackingCursor | null,
  pendingCandidate: TrackingPendingCandidate | null,
): TrackingResolution {
  const leadingCandidate = candidates[0] ?? null;
  if (!leadingCandidate) {
    return {
      confirmedCursor: prevConfirmedCursor,
      pendingCandidate: null,
      leadingCandidate: null,
      ambiguous: false,
    };
  }

  if (!prevConfirmedCursor) {
    return {
      confirmedCursor: toCursor(leadingCandidate),
      pendingCandidate: null,
      leadingCandidate,
      ambiguous: false,
    };
  }

  const runnerUp = candidates[1] ?? null;
  const nextCursor = toCursor(leadingCandidate);
  const candidateChanged =
    nextCursor.segmentIndex !== prevConfirmedCursor.segmentIndex ||
    nextCursor.overlapOccurrenceIndex !== prevConfirmedCursor.overlapOccurrenceIndex;
  const overlapOccurrenceChanged =
    nextCursor.overlapGroupIndex === prevConfirmedCursor.overlapGroupIndex &&
    nextCursor.overlapOccurrenceIndex !== prevConfirmedCursor.overlapOccurrenceIndex;
  const hasCloseCompetingOccurrence =
    runnerUp != null &&
    runnerUp.segment.index !== leadingCandidate.segment.index &&
    runnerUp.segment.overlapGroupIndex ===
      leadingCandidate.segment.overlapGroupIndex &&
    Math.abs(runnerUp.score - leadingCandidate.score) <=
      TRACKING_AMBIGUITY_SCORE_DELTA;

  if (!candidateChanged) {
    return {
      confirmedCursor: nextCursor,
      pendingCandidate: null,
      leadingCandidate,
      ambiguous: false,
    };
  }

  const requiresConfirmation =
    overlapOccurrenceChanged ||
    hasCloseCompetingOccurrence ||
    leadingCandidate.segment.index > prevConfirmedCursor.segmentIndex + 1;

  if (!requiresConfirmation) {
    return {
      confirmedCursor: nextCursor,
      pendingCandidate: null,
      leadingCandidate,
      ambiguous: false,
    };
  }

  const nextPendingKey = candidateKeyOf(leadingCandidate);
  const updatedPending =
    pendingCandidate?.candidateKey === nextPendingKey
      ? {
          ...pendingCandidate,
          seenCount: pendingCandidate.seenCount + 1,
          latestDistanceAlongRouteM: leadingCandidate.distanceAlongRouteM,
        }
      : {
          candidateKey: nextPendingKey,
          segmentIndex: leadingCandidate.segment.index,
          overlapGroupIndex: leadingCandidate.segment.overlapGroupIndex,
          overlapOccurrenceIndex:
            leadingCandidate.segment.overlapOccurrenceIndex,
          firstSeenDistanceAlongRouteM: prevConfirmedCursor.distanceAlongRouteM,
          latestDistanceAlongRouteM: leadingCandidate.distanceAlongRouteM,
          seenCount: 1,
        };

  const movedSinceFirstSeenM = Math.abs(
    updatedPending.latestDistanceAlongRouteM -
      updatedPending.firstSeenDistanceAlongRouteM,
  );
  const allowDistanceBasedConfirm =
    !overlapOccurrenceChanged && !hasCloseCompetingOccurrence;
  if (
    updatedPending.seenCount >= TRACKING_PENDING_CONFIRM_COUNT ||
    (allowDistanceBasedConfirm &&
      movedSinceFirstSeenM >= TRACKING_PENDING_CONFIRM_DISTANCE_M)
  ) {
    return {
      confirmedCursor: nextCursor,
      pendingCandidate: null,
      leadingCandidate,
      ambiguous: false,
    };
  }

  return {
    confirmedCursor: prevConfirmedCursor,
    pendingCandidate: updatedPending,
    leadingCandidate,
    ambiguous: true,
  };
}
