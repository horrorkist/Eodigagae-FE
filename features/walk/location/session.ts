import type { LatLng } from "@/types/mapEvents";

type GeoCoordsLike = {
  latitude?: number | null;
  longitude?: number | null;
};

export function toLatLngFromCoords(coords: GeoCoordsLike | null | undefined) {
  if (!coords) return null;

  const lat = coords.latitude;
  const lng = coords.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  const out: LatLng = { lat, lng };
  return out;
}

export function computePausedDurationMs(
  pausedAtMs: number | null,
  nowMs: number,
) {
  const base = pausedAtMs ?? nowMs;
  return Math.max(0, nowMs - base);
}

export function accumulatePausedTotalMs(
  currentTotalMs: number,
  pausedAtMs: number | null,
  nowMs: number,
) {
  return currentTotalMs + computePausedDurationMs(pausedAtMs, nowMs);
}

