export type SearchResultMarkerLayoutInput = {
  key: string;
  baseLat: number;
  baseLng: number;
};

export type SearchResultMarkerRenderPoint = {
  key: string;
  renderLat: number;
  renderLng: number;
};

type BuildSearchResultMarkerLayoutOptions = {
  spiderfy: boolean;
  coordPrecision?: number;
  baseRadiusM?: number;
  ringGapM?: number;
  maxPerRing?: number;
};

const EARTH_RADIUS_M = 6_378_137;

export const SEARCH_RESULT_COORD_PRECISION = 7;
export const SEARCH_RESULT_SPIDERFY_BASE_RADIUS_M = 12;
export const SEARCH_RESULT_SPIDERFY_RING_GAP_M = 10;
export const SEARCH_RESULT_SPIDERFY_MAX_PER_RING = 8;

function toCoordKey(lat: number, lng: number, precision: number) {
  return `${lat.toFixed(precision)}:${lng.toFixed(precision)}`;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function offsetLatLngByMeters(
  lat: number,
  lng: number,
  northM: number,
  eastM: number,
) {
  const dLat = (northM / EARTH_RADIUS_M) * (180 / Math.PI);
  const cosLat = Math.max(0.000001, Math.cos(toRad(lat)));
  const dLng = (eastM / (EARTH_RADIUS_M * cosLat)) * (180 / Math.PI);

  return {
    lat: lat + dLat,
    lng: lng + dLng,
  };
}

function toSpiderfyOffsetMeters(
  index: number,
  total: number,
  maxPerRing: number,
  baseRadiusM: number,
  ringGapM: number,
) {
  const ringIndex = Math.floor(index / maxPerRing);
  const indexInRing = index % maxPerRing;
  const ringSize = Math.min(maxPerRing, total - ringIndex * maxPerRing);
  const angleOffset = ringIndex * (Math.PI / Math.max(1, ringSize));
  const angleRad = (2 * Math.PI * indexInRing) / Math.max(1, ringSize) + angleOffset;
  const radiusM = baseRadiusM + ringGapM * ringIndex;

  return {
    northM: Math.cos(angleRad) * radiusM,
    eastM: Math.sin(angleRad) * radiusM,
  };
}

export function buildSearchResultMarkerLayout(
  inputs: SearchResultMarkerLayoutInput[],
  {
    spiderfy,
    coordPrecision = SEARCH_RESULT_COORD_PRECISION,
    baseRadiusM = SEARCH_RESULT_SPIDERFY_BASE_RADIUS_M,
    ringGapM = SEARCH_RESULT_SPIDERFY_RING_GAP_M,
    maxPerRing = SEARCH_RESULT_SPIDERFY_MAX_PER_RING,
  }: BuildSearchResultMarkerLayoutOptions,
): SearchResultMarkerRenderPoint[] {
  if (!Array.isArray(inputs) || inputs.length === 0) return [];

  const safeInputs = inputs.filter(
    (item) =>
      !!item &&
      typeof item.key === "string" &&
      Number.isFinite(item.baseLat) &&
      Number.isFinite(item.baseLng),
  );

  if (safeInputs.length === 0) return [];

  if (!spiderfy) {
    return safeInputs.map((item) => ({
      key: item.key,
      renderLat: item.baseLat,
      renderLng: item.baseLng,
    }));
  }

  const groups = new Map<string, SearchResultMarkerLayoutInput[]>();

  for (const item of safeInputs) {
    const coordKey = toCoordKey(item.baseLat, item.baseLng, coordPrecision);
    const list = groups.get(coordKey);
    if (list) {
      list.push(item);
      continue;
    }

    groups.set(coordKey, [item]);
  }

  const renderByKey = new Map<string, SearchResultMarkerRenderPoint>();

  for (const group of groups.values()) {
    if (group.length <= 1) {
      const single = group[0];
      renderByKey.set(single.key, {
        key: single.key,
        renderLat: single.baseLat,
        renderLng: single.baseLng,
      });
      continue;
    }

    for (let index = 0; index < group.length; index += 1) {
      const item = group[index];
      const offset = toSpiderfyOffsetMeters(
        index,
        group.length,
        maxPerRing,
        baseRadiusM,
        ringGapM,
      );
      const render = offsetLatLngByMeters(
        item.baseLat,
        item.baseLng,
        offset.northM,
        offset.eastM,
      );

      renderByKey.set(item.key, {
        key: item.key,
        renderLat: render.lat,
        renderLng: render.lng,
      });
    }
  }

  return safeInputs.map((item) => {
    const render = renderByKey.get(item.key);
    if (!render) {
      return {
        key: item.key,
        renderLat: item.baseLat,
        renderLng: item.baseLng,
      };
    }

    return render;
  });
}
