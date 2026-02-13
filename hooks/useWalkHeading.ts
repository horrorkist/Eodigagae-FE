"use client";

import { useCallback, useEffect, useRef } from "react";
import type { LatLng } from "@/types/mapEvents";

const HEADING_UPDATE_MIN_DEG = 4;
const HEADING_UPDATE_MIN_INTERVAL_MS = 120;
const HEADING_ORIENTATION_RECENT_MS = 3500;
const HEADING_FALLBACK_MOVE_MIN_M = 6;
const HEADING_ORIENTATION_NOISE_DEG = 16;
const HEADING_ORIENTATION_SMOOTHING = 0.14;
const HEADING_ORIENTATION_MIN_INTERVAL_MS = 220;

type OrientationWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
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

function tiltCompensatedHeadingDeg(alpha: number, beta: number, gamma: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const x = toRad(beta);
  const y = toRad(gamma);
  const z = toRad(alpha);
  const cY = Math.cos(y);
  const cZ = Math.cos(z);
  const sX = Math.sin(x);
  const sY = Math.sin(y);
  const sZ = Math.sin(z);

  const vX = -cZ * sY - sZ * sX * cY;
  const vY = -sZ * sY + cZ * sX * cY;
  const headingRad = Math.atan2(vX, vY);

  return normalizeHeading((headingRad * 180) / Math.PI);
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

  if (
    typeof e.alpha === "number" &&
    Number.isFinite(e.alpha) &&
    typeof e.beta === "number" &&
    Number.isFinite(e.beta) &&
    typeof e.gamma === "number" &&
    Number.isFinite(e.gamma)
  ) {
    return tiltCompensatedHeadingDeg(e.alpha, e.beta, e.gamma);
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

  const maybeSetHeading = useCallback(
    (rawDeg: number, source: HeadingSource = "orientation") => {
      let next = normalizeHeading(rawDeg);
      const now = Date.now();
      const last = lastHeadingRef.current;

      if (last != null) {
        const minDelta =
          source === "orientation"
            ? HEADING_ORIENTATION_NOISE_DEG
            : HEADING_UPDATE_MIN_DEG;
        if (headingDelta(next, last) < minDelta) return;

        const minInterval =
          source === "orientation"
            ? Math.max(
                HEADING_UPDATE_MIN_INTERVAL_MS,
                HEADING_ORIENTATION_MIN_INTERVAL_MS,
              )
            : HEADING_UPDATE_MIN_INTERVAL_MS;
        if (now - lastHeadingAtRef.current < minInterval) return;

        if (source === "orientation") {
          next = smoothHeading(last, next, HEADING_ORIENTATION_SMOOTHING);
          if (headingDelta(next, last) < HEADING_UPDATE_MIN_DEG) return;
        }
      }

      lastHeadingRef.current = next;
      lastHeadingAtRef.current = now;
      setHeading(next);
    },
    [setHeading],
  );

  const resetHeadingTracking = useCallback(() => {
    lastHeadingRef.current = null;
    lastHeadingAtRef.current = 0;
    lastOrientationAtRef.current = 0;
  }, []);

  const seedHeadingFromRoute = useCallback(
    (path: [number, number][] | null | undefined) => {
      if (!path || path.length < 2) return;
      const from: LatLng = { lat: path[0][1], lng: path[0][0] };
      const to: LatLng = { lat: path[1][1], lng: path[1][0] };
      maybeSetHeading(bearingDeg(from, to), "route");
    },
    [maybeSetHeading],
  );

  const updateHeadingFromPosition = useCallback(
    ({
      now,
      gpsHeading,
      speedMps,
      movedM,
      lastPos,
      nextPos,
    }: UpdateHeadingFromPositionInput) => {
      const hasRecentOrientation =
        now - lastOrientationAtRef.current <= HEADING_ORIENTATION_RECENT_MS;

      if (
        typeof gpsHeading === "number" &&
        Number.isFinite(gpsHeading) &&
        gpsHeading >= 0 &&
        (speedMps ?? 0) > 0.4 &&
        !hasRecentOrientation
      ) {
        maybeSetHeading(gpsHeading, "gps");
        return;
      }

      if (lastPos && movedM >= HEADING_FALLBACK_MOVE_MIN_M && !hasRecentOrientation) {
        maybeSetHeading(bearingDeg(lastPos, nextPos), "movement");
      }
    },
    [maybeSetHeading],
  );

  useEffect(() => {
    if (!walking || walkingPaused || typeof window === "undefined") return;

    const onOrientation = (evt: Event) => {
      const h = extractHeadingFromOrientation(evt as OrientationWithCompass);
      if (h == null) return;
      lastOrientationAtRef.current = Date.now();
      maybeSetHeading(h, "orientation");
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener("deviceorientationabsolute", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener("deviceorientationabsolute", onOrientation, true);
    };
  }, [walking, walkingPaused, maybeSetHeading]);

  return {
    resetHeadingTracking,
    seedHeadingFromRoute,
    updateHeadingFromPosition,
  };
}
