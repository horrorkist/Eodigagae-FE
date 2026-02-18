import type { PetPoiItem } from "@/types/mapEvents";
import type { TmapPoi } from "@/types/tmapPoi";
import type { FocusedPoi } from "@/types/focusedPoi";

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
  const roadAddress = toStringValue(item.addr2);
  const middleAddress = deriveMiddleAddress(jibunAddress);

  return {
    id: `kto:${item.contentid}`,
    source: "kto",
    name: toStringValue(item.title),
    lat: Number(item.mapy),
    lng: Number(item.mapx),
    bizCategory: toStringValue(item.cat3),
    distanceM: toDistanceNumber(item.dist),
    middleAddress,
    jibunAddress,
    roadAddress,
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
