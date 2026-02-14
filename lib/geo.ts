import type { LatLng } from "@/types/mapEvents";

export type ProjectPointToSegmentResult = {
  t: number;
  distM: number;
  point: LatLng;
};

export function projectPointToSegmentMeters(
  p: LatLng,
  a: LatLng,
  b: LatLng,
): ProjectPointToSegmentResult {
  const meanLatRad = (((a.lat + b.lat + p.lat) / 3) * Math.PI) / 180;
  const mPerDegLat = 111132;
  const mPerDegLng = 111320 * Math.cos(meanLatRad);

  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;

  const len2 = bx * bx + by * by;
  if (len2 <= 1e-6) {
    return {
      t: 0,
      distM: Math.hypot(px, py),
      point: { lat: a.lat, lng: a.lng },
    };
  }

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  const projX = bx * t;
  const projY = by * t;

  return {
    t,
    distM: Math.hypot(px - projX, py - projY),
    point: {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    },
  };
}

