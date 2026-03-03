import type { FountainItem, TrashBinItem } from "@/types/facilities";
import type { PetPoiItem } from "@/types/mapEvents";
import type { TmapPoi } from "@/types/tmapPoi";
import type { FocusedPoi } from "@/types/focusedPoi";
import type { HomePoiListItem } from "@/types/homePoi";
import { getPoiStyle } from "./poiMarker";

function toStringValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toDistanceNumber(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, num);
}

function deriveMiddleAddress(value: string) {
  const tokens = value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length >= 2) {
    return `${tokens[0]} ${tokens[1]}`;
  }
  return value;
}

export function fromPetPoiItem(item: PetPoiItem): FocusedPoi {
  const jibunAddress = toStringValue(item.addr1);
  const middleAddress = deriveMiddleAddress(jibunAddress);
  const style = getPoiStyle(String(item.contenttypeid ?? ""));

  return {
    id: `kto:${item.contentid}`,
    source: "kto",
    name: toStringValue(item.title),
    lat: Number(item.mapy),
    lng: Number(item.mapx),
    bizCategory: style.label,
    distanceM: toDistanceNumber(item.dist),
    middleAddress,
    jibunAddress,
    tel: toStringValue(item.tel),
    thumbnail: toStringValue(item.firstimage2 || item.firstimage),
  };
}

export function fromTmapPoi(item: TmapPoi): FocusedPoi {
  const jibunAddress = toStringValue(item.address);
  const roadAddress = toStringValue(item.roadAddress);
  const middleAddress = toStringValue(item.middleAddress)
    ? toStringValue(item.middleAddress)
    : deriveMiddleAddress(jibunAddress);

  return {
    id: `tmap:${item.id}`,
    source: "tmap",
    name: toStringValue(item.name),
    lat: item.lat,
    lng: item.lng,
    bizCategory: toStringValue(item.bizCategory),
    distanceM: item.distanceM,
    middleAddress,
    jibunAddress,
    roadAddress,
    tel: toStringValue(item.telNo),
    thumbnail: "",
  };
}

export function fromFountainItem(item: FountainItem): FocusedPoi {
  const jibunAddress = toStringValue(item.address);
  const middleAddress = deriveMiddleAddress(jibunAddress);

  return {
    id: `fountain:${item.latitude}:${item.longitude}:${toStringValue(item.fountainName)}`,
    source: "fountain",
    name: toStringValue(item.fountainName) || "음수대",
    lat: item.latitude,
    lng: item.longitude,
    bizCategory: "음수대",
    distanceM: null,
    middleAddress,
    jibunAddress,
    tel: "",
    thumbnail: "",
    managedBy: toStringValue(item.managedBy),
  };
}

export function fromTrashBinItem(item: TrashBinItem): FocusedPoi {
  const jibunAddress = toStringValue(item.address);
  const middleAddress = deriveMiddleAddress(jibunAddress);

  return {
    id: `trash-bin:${item.latitude}:${item.longitude}:${jibunAddress}`,
    source: "trash-bin",
    name: toStringValue(item.locationDesc) || "쓰레기통",
    lat: item.latitude,
    lng: item.longitude,
    bizCategory: "쓰레기통",
    distanceM: null,
    middleAddress,
    jibunAddress,
    tel: "",
    thumbnail: "",
    binType: toStringValue(item.binType),
    locationDesc: toStringValue(item.locationDesc),
    cityName: toStringValue(item.cityName),
  };
}

export function fromHomePoiListItem(item: HomePoiListItem): FocusedPoi {
  if (item.source === "kto") {
    const base = fromPetPoiItem(item.meta.item);
    return {
      ...base,
      distanceM: item.distanceM,
    };
  }

  if (item.source === "fountain") {
    const base = fromFountainItem(item.meta.item);
    return {
      ...base,
      id: item.id,
      distanceM: item.distanceM,
    };
  }

  const base = fromTrashBinItem(item.meta.item);
  return {
    ...base,
    id: item.id,
    distanceM: item.distanceM,
  };
}
