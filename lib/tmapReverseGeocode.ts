import type {
  TmapReverseGeocodeAddressInfo,
  TmapReverseGeocodeResponse,
  TmapReverseGeocodeUpstreamResponse,
} from "../types/tmapReverseGeocode";

function toText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function joinAddressParts(parts: Array<string | null | undefined>) {
  const normalized = parts
    .map((value) => toText(value))
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? normalized.join(" ") : "";
}

function buildRoadAddress(info: TmapReverseGeocodeAddressInfo | null) {
  if (!info) return "";
  const fullAddress = toText(info.fullAddress);
  const roadName = toText(info.roadName);
  const buildingIndex = toText(info.buildingIndex);
  const hasRoadInfo = Boolean(
    roadName || buildingIndex || toText(info.roadAddressKey),
  );

  if (fullAddress && hasRoadInfo) {
    return fullAddress;
  }

  if (!hasRoadInfo) return "";

  return joinAddressParts([
    info.city_do,
    info.gu_gun,
    info.eup_myun,
    roadName,
    buildingIndex,
    info.buildingName,
  ]);
}

function buildJibunAddress(info: TmapReverseGeocodeAddressInfo | null) {
  if (!info) return "";
  const fullAddress = toText(info.fullAddress);
  const roadName = toText(info.roadName);
  const jibunDong = toText(info.legalDong || info.adminDong);
  const bunji = toText(info.bunji);

  if (fullAddress && !roadName) {
    return fullAddress;
  }

  if (!jibunDong && !bunji) return "";
  if (roadName && !jibunDong && !bunji) return "";

  return joinAddressParts([
    info.city_do,
    info.gu_gun,
    info.eup_myun,
    jibunDong,
    info.ri,
    bunji,
  ]);
}

export function parseReverseGeocodeCoords(searchParams: URLSearchParams) {
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export function extractReverseGeocodeErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "TMAP upstream error";
  }

  const data = payload as TmapReverseGeocodeUpstreamResponse;
  return typeof data.error === "string"
    ? data.error
    : data.error?.message ?? "TMAP upstream error";
}

export function normalizeReverseGeocodeResponse(
  payload: unknown,
): TmapReverseGeocodeResponse {
  const data =
    payload && typeof payload === "object"
      ? (payload as TmapReverseGeocodeUpstreamResponse)
      : null;
  const info = data?.addressInfo ?? null;
  const roadAddress = buildRoadAddress(info) || null;
  const jibunAddress = buildJibunAddress(info) || null;

  return {
    displayAddress: roadAddress ?? jibunAddress ?? null,
    roadAddress,
    jibunAddress,
  };
}
