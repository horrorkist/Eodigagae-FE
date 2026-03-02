import type { LatLng } from "@/types/mapEvents";
import type {
  TmapPoiSearchResponse,
  TmapPoiSearchSort,
} from "@/types/tmapPoi";

const DEFAULT_COUNT = 150;
const DEFAULT_PAGE = 1;

function isPoiSearchResponse(value: unknown): value is TmapPoiSearchResponse {
  if (!value || typeof value !== "object") return false;
  const withItems = value as { items?: unknown; meta?: unknown };
  return Array.isArray(withItems.items) && !!withItems.meta;
}

type FetchTmapPoisParams = {
  keyword: string;
  sort: TmapPoiSearchSort;
  center: LatLng;
  count?: number;
  page?: number;
};

export async function fetchTmapPois({
  keyword,
  sort,
  center,
  count = DEFAULT_COUNT,
  page = DEFAULT_PAGE,
}: FetchTmapPoisParams) {
  const sp = new URLSearchParams();
  sp.set("keyword", keyword);
  sp.set("searchtypCd", sort);
  sp.set("count", String(count));
  sp.set("page", String(page));
  sp.set("centerLat", String(center.lat));
  sp.set("centerLon", String(center.lng));

  const res = await fetch(`/api/tmap/pois?${sp.toString()}`, {
    cache: "no-store",
  });
  const payload = (await res.json()) as unknown;

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "")
        : "";
    throw new Error(message || "검색 요청에 실패했어요.");
  }

  if (!isPoiSearchResponse(payload)) {
    throw new Error("응답 형식이 올바르지 않아요.");
  }

  return payload;
}
