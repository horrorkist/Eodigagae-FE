"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import formatDist from "@/lib/formatDist";
import AppIcon from "@/components/icons/AppIcon";
import { appIconMagnify } from "@/components/icons/definitions.generated";
import { fromTmapPoi } from "@/lib/focusedPoi";
import type {
  TmapPoi,
  TmapPoiSearchResponse,
  TmapPoiSearchSort,
} from "@/types/tmapPoi";
import { useMapStore } from "@/stores/mapStore";

const SEARCH_COUNT = 150;
const GEO_TIMEOUT_MS = 5000;
const CENTER_CACHE_TTL_MS = 60 * 1000;
const RECENT_SEARCHES_STORAGE_KEY = "search:recent-keywords";
const MAX_RECENT_SEARCHES = 10;
const SEARCH_SORT_OPTIONS: Array<{ value: TmapPoiSearchSort; label: string }> =
  [
    { value: "R", label: "거리순" },
    { value: "A", label: "정확도순" },
  ];

type SearchCenter = {
  lat: number;
  lon: number;
};

function isPoiSearchResponse(value: unknown): value is TmapPoiSearchResponse {
  if (!value || typeof value !== "object") return false;
  const withItems = value as { items?: unknown; meta?: unknown };
  return Array.isArray(withItems.items) && !!withItems.meta;
}

function getCurrentCenterByGeolocation(): Promise<SearchCenter> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("이 기기에서는 위치 기능을 사용할 수 없어요."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        reject(
          new Error(
            "현재 위치를 가져오지 못했어요. 위치 권한을 확인해 주세요.",
          ),
        );
      },
      {
        enableHighAccuracy: false,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 30 * 1000,
      },
    );
  });
}

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function writeRecentSearches(items: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)),
    );
  } catch {}
}

function saveRecentSearch(query: string): string[] {
  const normalized = query.trim();
  if (normalized.length < 2) return readRecentSearches();

  const prev = readRecentSearches();
  const next = [normalized, ...prev.filter((item) => item !== normalized)];
  writeRecentSearches(next);
  return next.slice(0, MAX_RECENT_SEARCHES);
}

function getDistanceBadgeClass(distanceM: number | null) {
  if (distanceM == null) {
    return "border-gray-200 bg-gray-50 text-gray-600";
  }
  if (distanceM <= 500) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (distanceM <= 1500) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function SearchPageClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const centerRef = useRef<SearchCenter | null>(null);
  const centerUpdatedAtRef = useRef(0);
  const searchParams = useSearchParams();
  const shouldFocusInput = searchParams.get("focus") === "1";
  const myPos = useMapStore((s) => s.myPos);
  const setFocusedPoi = useMapStore((s) => s.setFocusedPoi);
  const [keyword, setKeyword] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedSort, setSubmittedSort] = useState<TmapPoiSearchSort>("R");
  const [submitSeq, setSubmitSeq] = useState(0);
  const [searchSort, setSearchSort] = useState<TmapPoiSearchSort>("R");
  const trimmedKeyword = useMemo(() => keyword.trim(), [keyword]);
  const shouldSearch = submittedQuery.length >= 2;
  const searchKey = shouldSearch
    ? `${submitSeq}::${submittedQuery}::${submittedSort}`
    : null;
  const recentSearches = useMemo(
    () => (keyword.length === 0 ? readRecentSearches() : []),
    [keyword],
  );

  const resolveCenter = useCallback(async (): Promise<SearchCenter> => {
    const now = Date.now();
    const cached = centerRef.current;
    if (cached && now - centerUpdatedAtRef.current < CENTER_CACHE_TTL_MS) {
      return cached;
    }

    try {
      const current = await getCurrentCenterByGeolocation();
      centerRef.current = current;
      centerUpdatedAtRef.current = now;
      return current;
    } catch {
      if (myPos && Number.isFinite(myPos.lat) && Number.isFinite(myPos.lng)) {
        const fallbackCenter: SearchCenter = {
          lat: myPos.lat,
          lon: myPos.lng,
        };
        centerRef.current = fallbackCenter;
        centerUpdatedAtRef.current = now;
        return fallbackCenter;
      }

      throw new Error(
        "위치를 확인할 수 없어 검색할 수 없어요. 위치 권한을 허용해 주세요.",
      );
    }
  }, [myPos]);

  const { data, error, isLoading } = useSWR<TmapPoiSearchResponse, Error>(
    searchKey,
    async (key: string) => {
      const [, query, sortRaw] = key.split("::");
      const sort: TmapPoiSearchSort = sortRaw === "A" ? "A" : "R";
      const center = await resolveCenter();
      const sp = new URLSearchParams();
      sp.set("keyword", query);
      sp.set("searchtypCd", sort);
      sp.set("count", String(SEARCH_COUNT));
      sp.set("page", "1");
      sp.set("centerLat", String(center.lat));
      sp.set("centerLon", String(center.lon));

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
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 0,
    },
  );

  const items: TmapPoi[] = data?.items ?? [];
  const totalCount = data?.meta?.totalCount ?? items.length;
  const loading = shouldSearch && isLoading;

  useEffect(() => {
    if (!shouldFocusInput) return;

    const rafId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [shouldFocusInput]);

  useEffect(() => {
    if (!searchKey) return;
    inputRef.current?.blur();
    const [, query] = searchKey.split("::");
    saveRecentSearch(query);
  }, [searchKey]);

  return (
    <div className="flex min-h-full flex-col bg-gray-50 px-5 pt-3">
      <div className="mx-auto w-full max-w-[430px]">
        <form
          className="flex w-full items-center gap-2 rounded-lg border bg-white/90 px-3 py-2 shadow backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            const query = trimmedKeyword;
            if (query.length < 2) {
              setSubmittedQuery("");
              return;
            }
            setSubmittedQuery(query);
            setSubmittedSort(searchSort);
            setSubmitSeq((prev) => prev + 1);
          }}
        >
          <AppIcon
            icon={appIconMagnify}
            className="h-6 w-6 shrink-0 text-black"
          />
          <input
            autoComplete="off"
            id="search-keyword"
            ref={inputRef}
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="어디로 산책할까요?"
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
          />
        </form>
        <div className="mt-2 flex w-fit rounded-lg border bg-white/90 p-1 shadow backdrop-blur place-self-end">
          {SEARCH_SORT_OPTIONS.map((option) => {
            const active = searchSort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSearchSort(option.value);
                  if (submittedQuery.length < 2) return;
                  if (option.value === submittedSort) return;
                  setSubmittedSort(option.value);
                  setSubmitSeq((prev) => prev + 1);
                }}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-dg-green-500 text-white"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mx-auto w-full max-w-[430px] px-1 pb-24 pt-4 space-y-4">
        {keyword.length === 0 && recentSearches.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 text-xs font-medium text-gray-500">
              최근 검색어
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((recent) => (
                <button
                  key={recent}
                  type="button"
                  onClick={() => {
                    setKeyword(recent);
                    if (recent.length < 2) return;
                    setSubmittedQuery(recent);
                    setSubmittedSort(searchSort);
                    setSubmitSeq((prev) => prev + 1);
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
                >
                  {recent}
                </button>
              ))}
            </div>
          </div>
        )}

        {!!trimmedKeyword && trimmedKeyword.length < 2 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            검색어를 2글자 이상 입력해 주세요.
          </div>
        )}

        {submittedQuery.length >= 2 && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            검색 중...
          </div>
        )}

        {!loading && submittedQuery.length >= 2 && !error && (
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3 text-xs font-medium text-gray-500">
              검색 결과 {totalCount.toLocaleString()}건
            </div>
            {items.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {items.map((poi, i) => (
                  <li key={i + "_" + poi.id} className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedPoi(fromTmapPoi(poi));
                        router.push("/");
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">
                            {poi.name}
                          </div>
                          <div className="mt-1 text-[11px] text-gray-500">
                            {poi.categoryPath.length > 0
                              ? poi.categoryPath.join(" · ")
                              : "업종 정보 없음"}
                          </div>
                        </div>
                        <div className="shrink-0 space-y-1 text-right">
                          <div
                            className={[
                              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              getDistanceBadgeClass(poi.distanceM),
                            ].join(" ")}
                          >
                            {poi.distanceM != null
                              ? `직선 ${formatDist(poi.distanceM)}`
                              : "거리 정보 없음"}
                          </div>
                          {poi.estimatedWalkMin != null && (
                            <div className="text-[11px] text-gray-500">
                              도보 약 {poi.estimatedWalkMin}분
                            </div>
                          )}
                        </div>
                      </div>

                      {(poi.address || poi.roadAddress) && (
                        <div className="mt-2 text-xs text-gray-700">
                          {poi.address || poi.roadAddress}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {poi.hasDetailInfo === true && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">
                            상세정보 제공
                          </span>
                        )}
                        {poi.telNo && (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
                            {poi.telNo}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500">
                일치하는 장소가 없습니다.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
