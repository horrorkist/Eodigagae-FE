import { getPoiStyle } from "./poiMarker.ts";
import type { FountainItem, TrashBinItem } from "@/types/facilities";
import type { HomePoiListItem, HomePoiSource } from "@/types/homePoi";
import type { LatLng, PetPoiItem } from "@/types/mapEvents";

type EnabledSources = Partial<Record<HomePoiSource, boolean>>;

type MergeParams = {
  petPois: PetPoiItem[];
  fountains: FountainItem[];
  trashBins: TrashBinItem[];
  enabledSources: EnabledSources;
  referencePos: LatLng | null;
};

const EARTH_RADIUS_M = 6_371_000;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function calcDistanceM(from: LatLng | null, lat: number, lng: number) {
  if (!from) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const dLat = toRadians(lat - from.lat);
  const dLng = toRadians(lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0, Math.round(EARTH_RADIUS_M * c));
}

function toSourcePriority(source: HomePoiSource) {
  if (source === "kto") return 0;
  if (source === "fountain") return 1;
  return 2;
}

function toKeyPart(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sortByDistance(a: HomePoiListItem, b: HomePoiListItem) {
  const aDist = a.distanceM;
  const bDist = b.distanceM;

  if (aDist == null && bDist != null) return 1;
  if (aDist != null && bDist == null) return -1;
  if (aDist != null && bDist != null && aDist !== bDist) return aDist - bDist;

  const sourceDiff = toSourcePriority(a.source) - toSourcePriority(b.source);
  if (sourceDiff !== 0) return sourceDiff;

  return a.title.localeCompare(b.title, "ko");
}

export function normalizePetPoisToHomeList(
  petPois: PetPoiItem[],
  referencePos: LatLng | null,
): HomePoiListItem[] {
  const items: HomePoiListItem[] = [];

  for (const poi of petPois ?? []) {
    const lat = Number(poi.mapy);
    const lng = Number(poi.mapx);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const id = `kto:${String(poi.contentid ?? "").trim()}`;
    if (id === "kto:") continue;

    const style = getPoiStyle(String(poi.contenttypeid ?? "").trim());

    items.push({
      id,
      source: "kto",
      title: String(poi.title ?? "").trim() || "이름 없음",
      category: style.label,
      address: String(poi.addr1 ?? "").trim(),
      lat,
      lng,
      distanceM: calcDistanceM(referencePos, lat, lng),
      thumbnailUrl: String(poi.firstimage2 || poi.firstimage || "").trim() || null,
      meta: {
        source: "kto",
        item: poi,
      },
    });
  }

  return items;
}

export function normalizeFountainsToHomeList(
  fountains: FountainItem[],
  referencePos: LatLng | null,
): HomePoiListItem[] {
  const items: HomePoiListItem[] = [];

  for (const fountain of fountains ?? []) {
    const lat = Number(fountain.latitude);
    const lng = Number(fountain.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const title = String(fountain.fountainName ?? "").trim() || "음수대";
    const address = toKeyPart(fountain.address);
    const managedBy = toKeyPart(fountain.managedBy);
    const id = `fountain:${lat}:${lng}:${title}:${address}:${managedBy}`;

    items.push({
      id,
      source: "fountain",
      title,
      category: "음수대",
      address,
      lat,
      lng,
      distanceM: calcDistanceM(referencePos, lat, lng),
      thumbnailUrl: null,
      meta: {
        source: "fountain",
        item: fountain,
      },
    });
  }

  return items;
}

export function normalizeTrashBinsToHomeList(
  trashBins: TrashBinItem[],
  referencePos: LatLng | null,
): HomePoiListItem[] {
  const items: HomePoiListItem[] = [];

  for (const bin of trashBins ?? []) {
    const lat = Number(bin.latitude);
    const lng = Number(bin.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const address = toKeyPart(bin.address);
    const locationDesc = toKeyPart(bin.locationDesc);
    const binType = toKeyPart(bin.binType);
    const cityName = toKeyPart(bin.cityName);
    const id = `trash-bin:${lat}:${lng}:${address || "unknown"}:${locationDesc}:${binType}:${cityName}`;

    items.push({
      id,
      source: "trash-bin",
      title: address || "쓰레기통",
      category: "쓰레기통",
      address,
      lat,
      lng,
      distanceM: calcDistanceM(referencePos, lat, lng),
      thumbnailUrl: null,
      meta: {
        source: "trash-bin",
        item: bin,
      },
    });
  }

  return items;
}

function ensureUniqueItemIds(items: HomePoiListItem[]) {
  const seen = new Map<string, number>();

  return items.map((item) => {
    const prevCount = seen.get(item.id) ?? 0;
    const nextCount = prevCount + 1;
    seen.set(item.id, nextCount);

    if (prevCount === 0) return item;

    return {
      ...item,
      id: `${item.id}__dup${nextCount}`,
    };
  });
}

export function mergeAndSortHomePois({
  petPois,
  fountains,
  trashBins,
  enabledSources,
  referencePos,
}: MergeParams): HomePoiListItem[] {
  const merged: HomePoiListItem[] = [];

  if (enabledSources.kto) {
    merged.push(...normalizePetPoisToHomeList(petPois, referencePos));
  }
  if (enabledSources.fountain) {
    merged.push(...normalizeFountainsToHomeList(fountains, referencePos));
  }
  if (enabledSources["trash-bin"]) {
    merged.push(...normalizeTrashBinsToHomeList(trashBins, referencePos));
  }

  return ensureUniqueItemIds(merged.sort(sortByDistance));
}
