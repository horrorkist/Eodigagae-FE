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

function toLatLng(coord: [number, number]): LatLng {
  return { lat: coord[1], lng: coord[0] };
}

export function simplifyPathByRdpMeters(
  path: [number, number][],
  toleranceM: number,
): [number, number][] {
  if (path.length <= 2) return path.slice();

  const epsilon = Number.isFinite(toleranceM) ? Math.max(0, toleranceM) : 0;
  if (epsilon === 0) return path.slice();

  const keep = new Array<boolean>(path.length).fill(false);
  keep[0] = true;
  keep[path.length - 1] = true;

  const stack: [number, number][] = [[0, path.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    if (end - start <= 1) continue;

    const a = toLatLng(path[start]);
    const b = toLatLng(path[end]);

    let maxDistM = -1;
    let maxIdx = -1;

    for (let i = start + 1; i < end; i++) {
      const distM = projectPointToSegmentMeters(toLatLng(path[i]), a, b).distM;
      if (distM > maxDistM) {
        maxDistM = distM;
        maxIdx = i;
      }
    }

    if (maxIdx !== -1 && maxDistM > epsilon) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }

  const simplified: [number, number][] = [];
  for (let i = 0; i < path.length; i++) {
    if (keep[i]) {
      const [lng, lat] = path[i];
      simplified.push([lng, lat]);
    }
  }

  if (simplified.length >= 2) return simplified;

  const first = path[0];
  const last = path[path.length - 1];
  return [
    [first[0], first[1]],
    [last[0], last[1]],
  ];
}
