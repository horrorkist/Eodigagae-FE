export type ProbeLatLng = {
  lat: number;
  lng: number;
};

export type FacilityProbeAnchor = {
  center: ProbeLatLng;
  zoom: number;
};

type ShouldRefreshFacilityProbeParams = {
  center: ProbeLatLng;
  zoom: number;
  lastAnchor: FacilityProbeAnchor | null;
  force?: boolean;
  clampGridDeg: number;
  minMoveM: number;
};

type ShouldRefreshFacilityProbeResult = {
  shouldRefresh: boolean;
  clampedCenter: ProbeLatLng;
};

export function roundByGrid(value: number, grid: number) {
  if (!Number.isFinite(value)) return value;
  if (!Number.isFinite(grid) || grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

export function toClampedCenter(center: ProbeLatLng, gridDeg: number): ProbeLatLng {
  return {
    lat: roundByGrid(center.lat, gridDeg),
    lng: roundByGrid(center.lng, gridDeg),
  };
}

export function haversineMeters(a: ProbeLatLng, b: ProbeLatLng) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

export function shouldRefreshFacilityProbe(
  params: ShouldRefreshFacilityProbeParams,
): ShouldRefreshFacilityProbeResult {
  const { center, zoom, lastAnchor, force = false, clampGridDeg, minMoveM } = params;
  const clampedCenter = toClampedCenter(center, clampGridDeg);

  if (force) {
    return { shouldRefresh: true, clampedCenter };
  }

  if (!lastAnchor) {
    return { shouldRefresh: true, clampedCenter };
  }

  if (zoom !== lastAnchor.zoom) {
    return { shouldRefresh: true, clampedCenter };
  }

  const movedM = haversineMeters(lastAnchor.center, clampedCenter);
  return {
    shouldRefresh: movedM >= minMoveM,
    clampedCenter,
  };
}
