"use client";

import { useCallback, useEffect, useRef } from "react";
import type { LatLng } from "@/types/mapEvents";
import { classifyCardinalJump, walkDebug } from "@/lib/walkDebug";
import { projectPointToSegmentMeters } from "@/lib/geo";

const HEADING_UPDATE_MIN_DEG = 4;
const HEADING_UPDATE_MIN_INTERVAL_MS = 120;
const HEADING_ORIENTATION_RECENT_MS = 3500;
const HEADING_FALLBACK_MOVE_MIN_M = 6;
const HEADING_ORIENTATION_NOISE_DEG = 9;
const HEADING_ORIENTATION_STATIONARY_NOISE_DEG = 15;
const HEADING_ORIENTATION_MIN_INTERVAL_MS = 120;
const HEADING_ORIENTATION_STATIONARY_MIN_INTERVAL_MS = 240;
const HEADING_ORIENTATION_MEDIUM_TURN_DEG = 18;
const HEADING_ORIENTATION_FAST_TURN_DEG = 36;
const HEADING_ORIENTATION_SMOOTHING_SLOW = 0.3;
const HEADING_ORIENTATION_SMOOTHING_MEDIUM = 0.5;
const HEADING_ORIENTATION_SMOOTHING_FAST = 0.75;
const HEADING_INITIAL_ORIENTATION_CONFIRM_WINDOW_MS = 900;
const HEADING_STATIONARY_AFTER_MS = 1800;
const HEADING_MOVEMENT_SIGNAL_SPEED_MPS = 0.8;
const HEADING_MOVEMENT_MAX_ACCURACY_M = 15;
const HEADING_ABSOLUTE_PRIORITY_WINDOW_MS = 1800;

type OrientationWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  absolute?: boolean;
};

type DeviceOrientationPermissionCtor = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type HeadingSource = "orientation" | "gps" | "movement" | "route";

type UseWalkHeadingParams = {
  walking: boolean;
  walkingPaused: boolean;
  setHeading: (deg: number | null) => void;
};

type UpdateHeadingFromPositionInput = {
  now: number;
  gpsHeading: number | null;
  speedMps: number | null;
  accuracyM: number | null;
  movedM: number;
  lastPos: LatLng | null;
  nextPos: LatLng;
};

function normalizeHeading(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function headingDelta(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function signedHeadingDelta(fromDeg: number, toDeg: number) {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

function smoothHeading(fromDeg: number, toDeg: number, factor: number) {
  const clamped = Math.max(0, Math.min(1, factor));
  const delta = signedHeadingDelta(fromDeg, toDeg);
  return normalizeHeading(fromDeg + delta * clamped);
}

function bearingDeg(from: LatLng, to: LatLng) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const toDeg = (v: number) => (v * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function getScreenOrientationAngleDeg() {
  if (typeof window === "undefined") return 0;

  const angle = window.screen?.orientation?.angle;
  if (typeof angle === "number" && Number.isFinite(angle)) return angle;

  const legacyAngle = (window as Window & { orientation?: number }).orientation;
  if (typeof legacyAngle === "number" && Number.isFinite(legacyAngle)) {
    return legacyAngle;
  }

  return 0;
}

function extractHeadingFromOrientation(e: OrientationWithCompass) {
  const compass = (e as OrientationWithCompass).webkitCompassHeading;
  if (typeof compass === "number" && Number.isFinite(compass)) {
    return normalizeHeading(compass);
  }

  if (typeof e.alpha === "number" && Number.isFinite(e.alpha)) {
    const screenAngle = getScreenOrientationAngleDeg();
    return normalizeHeading(360 - e.alpha + screenAngle);
  }

  return null;
}

export function requestOrientationPermissionIfNeeded() {
  if (typeof window === "undefined") return;

  const Ctor = (
    window as typeof window & {
      DeviceOrientationEvent?: DeviceOrientationPermissionCtor;
    }
  ).DeviceOrientationEvent;

  if (!Ctor || typeof Ctor.requestPermission !== "function") return;
  Ctor.requestPermission().catch(() => null);
}

export function useWalkHeading({
  walking,
  walkingPaused,
  setHeading,
}: UseWalkHeadingParams) {
  const lastHeadingRef = useRef<number | null>(null);
  const lastHeadingAtRef = useRef(0);
  const lastOrientationAtRef = useRef(0);
  const lastAbsoluteOrientationAtRef = useRef(0);
  const lastMotionAtRef = useRef(0);
  const lastOrientationSampleRef = useRef<number | null>(null);
  const initialOrientationCandidateRef = useRef<number | null>(null);
  const initialOrientationCandidateAtRef = useRef(0);

  const maybeSetHeading = useCallback(
    (rawDeg: number, source: HeadingSource = "orientation") => {
      walkDebug("heading:input", {
        source,
        rawDeg,
        lastHeading: lastHeadingRef.current,
      });

      let next = normalizeHeading(rawDeg);
      const now = Date.now();
      const last = lastHeadingRef.current;
      const isStationaryOrientation =
        source === "orientation" &&
        now - lastMotionAtRef.current > HEADING_STATIONARY_AFTER_MS;

      if (source === "orientation" && last == null) {
        const candidate = initialOrientationCandidateRef.current;
        if (candidate == null) {
          initialOrientationCandidateRef.current = next;
          initialOrientationCandidateAtRef.current = now;
          walkDebug("heading:orientation-candidate:set", {
            candidate: next,
          });
          return;
        }

        const unstableJump =
          now - initialOrientationCandidateAtRef.current <=
            HEADING_INITIAL_ORIENTATION_CONFIRM_WINDOW_MS &&
          headingDelta(candidate, next) >= HEADING_ORIENTATION_FAST_TURN_DEG;
        if (unstableJump) {
          const candidateDelta = signedHeadingDelta(candidate, next);
          initialOrientationCandidateRef.current = next;
          initialOrientationCandidateAtRef.current = now;
          walkDebug("heading:orientation-candidate:unstable", {
            candidate,
            next,
            candidateDelta,
            cardinalJump: classifyCardinalJump(candidateDelta),
          });
          return;
        }

        initialOrientationCandidateRef.current = null;
        initialOrientationCandidateAtRef.current = 0;
        walkDebug("heading:orientation-candidate:accepted", {
          candidate,
          next,
          candidateDelta: signedHeadingDelta(candidate, next),
        });
      } else if (source !== "orientation" && last == null) {
        initialOrientationCandidateRef.current = null;
        initialOrientationCandidateAtRef.current = 0;
      }

      if (last != null) {
        const rawDelta = headingDelta(next, last);
        const minDelta =
          source === "orientation"
            ? isStationaryOrientation
              ? HEADING_ORIENTATION_STATIONARY_NOISE_DEG
              : HEADING_ORIENTATION_NOISE_DEG
            : HEADING_UPDATE_MIN_DEG;
        if (rawDelta < minDelta) {
          walkDebug("heading:skip-small-delta", {
            source,
            last,
            next,
            rawDelta,
            minDelta,
          });
          return;
        }

        const minInterval =
          source === "orientation"
            ? Math.max(
                HEADING_UPDATE_MIN_INTERVAL_MS,
                isStationaryOrientation
                  ? HEADING_ORIENTATION_STATIONARY_MIN_INTERVAL_MS
                  : HEADING_ORIENTATION_MIN_INTERVAL_MS,
              )
            : HEADING_UPDATE_MIN_INTERVAL_MS;
        const isLargeOrientationTurn =
          source === "orientation" &&
          rawDelta >= HEADING_ORIENTATION_FAST_TURN_DEG;
        if (
          !isLargeOrientationTurn &&
          now - lastHeadingAtRef.current < minInterval
        ) {
          walkDebug("heading:skip-interval", {
            source,
            last,
            next,
            rawDelta,
            minInterval,
            sinceLastMs: now - lastHeadingAtRef.current,
          });
          return;
        }

        if (source === "orientation") {
          const beforeSmoothing = next;
          const smoothing =
            rawDelta >= HEADING_ORIENTATION_FAST_TURN_DEG
              ? HEADING_ORIENTATION_SMOOTHING_FAST
              : rawDelta >= HEADING_ORIENTATION_MEDIUM_TURN_DEG
                ? HEADING_ORIENTATION_SMOOTHING_MEDIUM
                : HEADING_ORIENTATION_SMOOTHING_SLOW;
          next = smoothHeading(last, next, smoothing);
          const smoothedDelta = headingDelta(next, last);
          walkDebug("heading:orientation-smoothing", {
            last,
            input: beforeSmoothing,
            output: next,
            rawDelta,
            smoothedDelta,
            smoothing,
          });
          if (smoothedDelta < HEADING_UPDATE_MIN_DEG) {
            walkDebug("heading:skip-smoothed-small-delta", {
              last,
              next,
              smoothedDelta,
              minDelta: HEADING_UPDATE_MIN_DEG,
            });
            return;
          }
        }
      }

      lastHeadingRef.current = next;
      lastHeadingAtRef.current = now;
      walkDebug("heading:set", {
        source,
        heading: next,
      });
      setHeading(next);
    },
    [setHeading],
  );

  const resetHeadingTracking = useCallback(() => {
    lastHeadingRef.current = null;
    lastHeadingAtRef.current = 0;
    lastOrientationAtRef.current = 0;
    lastAbsoluteOrientationAtRef.current = 0;
    lastMotionAtRef.current = 0;
    lastOrientationSampleRef.current = null;
    initialOrientationCandidateRef.current = null;
    initialOrientationCandidateAtRef.current = 0;
  }, []);

  const seedHeadingFromRoute = useCallback(
    (path: [number, number][] | null | undefined, myPos: LatLng | null) => {
      if (!path || path.length < 2) {
        walkDebug("heading:route-seed-skipped", {
          reason: "path-too-short",
          pathLength: path?.length ?? 0,
        });
        return;
      }

      const toLatLng = (idx: number): LatLng => ({
        lat: path[idx][1],
        lng: path[idx][0],
      });

      if (!myPos) {
        walkDebug("heading:route-seed-skipped", {
          reason: "no-my-pos",
          pathLength: path.length,
        });
        return;
      }

      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      let bestT = 0;
      let bestPoint = toLatLng(0);

      for (let i = 0; i < path.length - 1; i++) {
        const a = toLatLng(i);
        const b = toLatLng(i + 1);
        const proj = projectPointToSegmentMeters(myPos, a, b);
        if (proj.distM < bestDist) {
          bestDist = proj.distM;
          bestIdx = i;
          bestT = proj.t;
          bestPoint = proj.point;
        }
      }

      const nearSegmentEnd = bestT >= 0.98;
      const nextIdx =
        nearSegmentEnd && bestIdx + 2 < path.length ? bestIdx + 2 : bestIdx + 1;
      const nextPoint = toLatLng(nextIdx);
      const isZeroVector =
        Math.abs(bestPoint.lat - nextPoint.lat) <= 1e-8 &&
        Math.abs(bestPoint.lng - nextPoint.lng) <= 1e-8;

      if (isZeroVector) {
        const fallbackHeading = bearingDeg(toLatLng(bestIdx), toLatLng(bestIdx + 1));
        walkDebug("heading:route-seed", {
          reason: "zero-vector",
          bestIdx,
          nextIdx: bestIdx + 1,
          distM: bestDist,
          heading: fallbackHeading,
        });
        maybeSetHeading(fallbackHeading, "route");
        return;
      }

      const seededHeading = bearingDeg(bestPoint, nextPoint);
      walkDebug("heading:route-seed", {
        bestIdx,
        nextIdx,
        bestT,
        distM: bestDist,
        heading: seededHeading,
      });
      maybeSetHeading(seededHeading, "route");
    },
    [maybeSetHeading],
  );

  const updateHeadingFromPosition = useCallback(
    ({
      now,
      gpsHeading,
      speedMps,
      accuracyM,
      movedM,
      lastPos,
      nextPos,
    }: UpdateHeadingFromPositionInput) => {
      const accuracyTrustedForMotion =
        accuracyM == null || accuracyM <= HEADING_MOVEMENT_MAX_ACCURACY_M;

      if (
        accuracyTrustedForMotion &&
        (speedMps ?? 0) >= HEADING_MOVEMENT_SIGNAL_SPEED_MPS ||
        (accuracyTrustedForMotion && movedM >= HEADING_FALLBACK_MOVE_MIN_M)
      ) {
        lastMotionAtRef.current = now;
        walkDebug("heading:motion-signal", {
          speedMps,
          movedM,
          accuracyM,
        });
      }

      const hasRecentOrientation =
        now - lastOrientationAtRef.current <= HEADING_ORIENTATION_RECENT_MS;

      if (
        typeof gpsHeading === "number" &&
        Number.isFinite(gpsHeading) &&
        gpsHeading >= 0 &&
        (speedMps ?? 0) > 0.4 &&
        accuracyTrustedForMotion &&
        !hasRecentOrientation
      ) {
        walkDebug("heading:from-gps", {
          gpsHeading,
          speedMps,
          accuracyM,
          hasRecentOrientation,
        });
        maybeSetHeading(gpsHeading, "gps");
        return;
      }

      if (
        lastPos &&
        movedM >= HEADING_FALLBACK_MOVE_MIN_M &&
        accuracyTrustedForMotion &&
        !hasRecentOrientation
      ) {
        walkDebug("heading:from-movement", {
          movedM,
          accuracyM,
          hasRecentOrientation,
          lastPos,
          nextPos,
        });
        maybeSetHeading(bearingDeg(lastPos, nextPos), "movement");
        return;
      }
    },
    [maybeSetHeading],
  );

  useEffect(() => {
    if (!walking || walkingPaused || typeof window === "undefined") return;

    const onOrientation = (evt: Event) => {
      const orientationEvt = evt as OrientationWithCompass;
      const now = Date.now();
      const alpha =
        typeof orientationEvt.alpha === "number" &&
        Number.isFinite(orientationEvt.alpha)
          ? orientationEvt.alpha
          : null;
      const webkitCompassHeading =
        typeof orientationEvt.webkitCompassHeading === "number" &&
        Number.isFinite(orientationEvt.webkitCompassHeading)
          ? normalizeHeading(orientationEvt.webkitCompassHeading)
          : null;
      const screenAngle = getScreenOrientationAngleDeg();
      const alphaHeading =
        alpha == null ? null : normalizeHeading(360 - alpha + screenAngle);
      const hasCompassHeading =
        typeof orientationEvt.webkitCompassHeading === "number" &&
        Number.isFinite(orientationEvt.webkitCompassHeading);
      const isAbsoluteLike =
        hasCompassHeading ||
        evt.type === "deviceorientationabsolute" ||
        orientationEvt.absolute === true;
      if (isAbsoluteLike) {
        lastAbsoluteOrientationAtRef.current = now;
      } else if (lastAbsoluteOrientationAtRef.current === 0) {
        // Ignore relative orientation at startup to avoid random initial heading.
        walkDebug("orientation:ignored", {
          reason: "relative-before-absolute",
          type: evt.type,
          alpha,
          webkitCompassHeading,
          alphaHeading,
          screenAngle,
        });
        return;
      } else if (
        now - lastAbsoluteOrientationAtRef.current <=
        HEADING_ABSOLUTE_PRIORITY_WINDOW_MS
      ) {
        walkDebug("orientation:ignored", {
          reason: "absolute-priority-window",
          type: evt.type,
          sinceAbsoluteMs: now - lastAbsoluteOrientationAtRef.current,
          alpha,
          webkitCompassHeading,
          alphaHeading,
          screenAngle,
        });
        return;
      }

      const h = extractHeadingFromOrientation(orientationEvt);
      if (h == null) {
        walkDebug("orientation:ignored", {
          reason: "no-heading",
          type: evt.type,
          alpha,
          webkitCompassHeading,
          alphaHeading,
          screenAngle,
        });
        return;
      }

      const prevSample = lastOrientationSampleRef.current;
      const sampleDelta =
        prevSample == null ? null : signedHeadingDelta(prevSample, h);
      walkDebug("orientation:event", {
        type: evt.type,
        isAbsoluteLike,
        absoluteFlag: orientationEvt.absolute === true,
        alpha,
        screenAngle,
        webkitCompassHeading,
        alphaHeading,
        extractedHeading: h,
        prevSample,
        sampleDelta,
        cardinalJump: classifyCardinalJump(sampleDelta),
      });
      lastOrientationSampleRef.current = h;
      lastOrientationAtRef.current = Date.now();
      maybeSetHeading(h, "orientation");
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener("deviceorientationabsolute", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener(
        "deviceorientationabsolute",
        onOrientation,
        true,
      );
    };
  }, [walking, walkingPaused, maybeSetHeading]);

  return {
    resetHeadingTracking,
    seedHeadingFromRoute,
    updateHeadingFromPosition,
  };
}
