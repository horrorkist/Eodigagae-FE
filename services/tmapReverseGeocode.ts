import type { TmapReverseGeocodeResponse } from "@/types/tmapReverseGeocode";

function isReverseGeocodeResponse(
  value: unknown,
): value is TmapReverseGeocodeResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const isNullableString = (field: unknown) =>
    field === null || typeof field === "string";

  return (
    isNullableString(candidate.displayAddress) &&
    isNullableString(candidate.roadAddress) &&
    isNullableString(candidate.jibunAddress)
  );
}

export async function fetchTmapReverseGeocode(params: {
  lat: number;
  lng: number;
  signal?: AbortSignal;
}) {
  const sp = new URLSearchParams();
  sp.set("lat", String(params.lat));
  sp.set("lng", String(params.lng));

  const res = await fetch(`/api/tmap/reverse-geocode?${sp.toString()}`, {
    cache: "no-store",
    signal: params.signal,
  });
  const payload = (await res.json()) as unknown;

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "")
        : "";
    throw new Error(message || "주소를 불러오지 못했어요.");
  }

  if (!isReverseGeocodeResponse(payload)) {
    throw new Error("응답 형식이 올바르지 않아요.");
  }

  return payload;
}
