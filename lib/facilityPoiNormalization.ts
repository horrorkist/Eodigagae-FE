import type { FacilityHomePoiListItem } from "@/types/homePoi";

export type NormalizedFacilityMarkerPoi = {
  key: string;
  poi: FacilityHomePoiListItem;
  lat: number;
  lng: number;
};

function toCoordKey(value: number) {
  return value.toFixed(7);
}

function toTextKey(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function toFacilityMarkerKey(poi: FacilityHomePoiListItem) {
  const lat = Number(poi.lat);
  const lng = Number(poi.lng);
  const base = `${poi.source}:${toCoordKey(lat)}:${toCoordKey(lng)}`;

  if (poi.source === "fountain") {
    const item = poi.meta.item;
    return [
      base,
      toTextKey(item.fountainName),
      toTextKey(item.address),
      toTextKey(item.managedBy),
    ].join(":");
  }

  const item = poi.meta.item;
  return [
    base,
    toTextKey(item.address),
    toTextKey(item.locationDesc),
    toTextKey(item.binType),
    toTextKey(item.cityName),
  ].join(":");
}

function toNormalizedPoi(
  poi: FacilityHomePoiListItem,
): NormalizedFacilityMarkerPoi | null {
  const lat = Number(poi.lat);
  const lng = Number(poi.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    key: toFacilityMarkerKey(poi),
    poi,
    lat,
    lng,
  };
}

export function normalizeFacilityPoisForMarkers(
  pois: FacilityHomePoiListItem[],
) {
  const out: NormalizedFacilityMarkerPoi[] = [];
  const seen = new Set<string>();

  for (const poi of pois ?? []) {
    const normalized = toNormalizedPoi(poi);
    if (!normalized) continue;
    if (seen.has(normalized.key)) continue;
    seen.add(normalized.key);
    out.push(normalized);
  }

  return out;
}
