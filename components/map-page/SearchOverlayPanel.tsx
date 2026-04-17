"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import formatDist from "@/lib/formatDist";
import type { LatLng } from "@/types/mapEvents";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconPaw,
  appIconXMark,
} from "@/components/icons/definitions.generated";
import type {
  TmapPoi,
  TmapPoiSearchResponse,
  TmapPoiSearchSort,
} from "@/types/tmapPoi";
import { useMapStore } from "@/stores/mapStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchTmapPois } from "@/services/tmapPois";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import Divider from "@/components/Divider";

const SEARCH_DEBOUNCE_MS = 350;
const GEO_TIMEOUT_MS = 5000;
const CENTER_CACHE_TTL_MS = 60 * 1000;
const RECENT_SEARCHES_STORAGE_KEY = "search:recent-keywords";
const SEARCH_PAGE_STATE_STORAGE_KEY = "search:page-state";
const MAX_RECENT_SEARCHES = 10;
const SEARCH_SKELETON_ROW_COUNT = 5;

type SearchSWRKey = readonly [string, TmapPoiSearchSort];
type SearchPagePersistedState = {
  keyword: string;
  sort: TmapPoiSearchSort;
};
type RecentSearchItem = {
  keyword: string;
  savedAt: number;
};

type SearchOverlayPanelProps = {
  shouldFocusInput?: boolean;
  onClose: () => void;
  onSelectSearchResultPoi: (poi: TmapPoi) => void;
};

function getCurrentCenterByGeolocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("이 기기에서는 위치 기능을 사용할 수 없어요."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
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

function normalizeRecentSearches(value: unknown): RecentSearchItem[] {
  if (!Array.isArray(value)) return [];

  const now = Date.now();
  const deduped = new Map<string, RecentSearchItem>();

  for (let i = 0; i < value.length; i += 1) {
    const entry = value[i];
    const fallbackSavedAt = now - i;

    if (typeof entry === "string") {
      const keyword = entry.trim();
      if (!keyword || deduped.has(keyword)) continue;
      deduped.set(keyword, { keyword, savedAt: fallbackSavedAt });
      continue;
    }

    if (!entry || typeof entry !== "object") continue;

    const candidate = entry as {
      keyword?: unknown;
      savedAt?: unknown;
    };
    if (typeof candidate.keyword !== "string") continue;

    const keyword = candidate.keyword.trim();
    if (!keyword || deduped.has(keyword)) continue;

    const savedAt =
      typeof candidate.savedAt === "number" &&
      Number.isFinite(candidate.savedAt)
        ? candidate.savedAt
        : fallbackSavedAt;

    deduped.set(keyword, { keyword, savedAt });
  }

  return [...deduped.values()]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_RECENT_SEARCHES);
}

function readRecentSearches(): RecentSearchItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeRecentSearches(parsed);
    writeRecentSearches(normalized);
    return normalized;
  } catch {
    return [];
  }
}

function writeRecentSearches(items: RecentSearchItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)),
    );
  } catch {}
}

function clearRecentSearches() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {}
}

function saveRecentSearch(query: string): RecentSearchItem[] {
  const normalized = query.trim();
  if (normalized.length < 2) return readRecentSearches();

  const prev = readRecentSearches();
  const next = [
    { keyword: normalized, savedAt: Date.now() },
    ...prev.filter((item) => item.keyword !== normalized),
  ];
  writeRecentSearches(next);
  return next.slice(0, MAX_RECENT_SEARCHES);
}

function formatRecentSearchDate(savedAt: number): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, keyword: string): ReactNode {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return text;

  const escapedKeyword = escapeRegExp(normalizedKeyword);
  if (!escapedKeyword) return text;

  const pattern = new RegExp(`(${escapedKeyword})`, "gi");
  const chunks = text.split(pattern);
  if (chunks.length <= 1) return text;

  return chunks.map((chunk, index) => {
    if (index % 2 === 1) {
      return (
        <span key={`highlight-${chunk}-${index}`} className="text-dg-green-500">
          {chunk}
        </span>
      );
    }
    return <span key={`plain-${chunk}-${index}`}>{chunk}</span>;
  });
}

function readSearchPageState(): SearchPagePersistedState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SEARCH_PAGE_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const candidate = parsed as { keyword?: unknown; sort?: unknown };
    if (typeof candidate.keyword !== "string") return null;
    if (candidate.sort !== "R" && candidate.sort !== "A") return null;

    return {
      keyword: candidate.keyword,
      sort: candidate.sort,
    };
  } catch {
    return null;
  }
}

function writeSearchPageState(keyword: string, sort: TmapPoiSearchSort) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      SEARCH_PAGE_STATE_STORAGE_KEY,
      JSON.stringify({ keyword, sort }),
    );
  } catch {}
}

function SearchResultSkeleton() {
  return (
    <div className="bg-white">
      <ul className="px-5" aria-hidden="true">
        {Array.from({ length: SEARCH_SKELETON_ROW_COUNT }, (_, index) => (
          <li key={`search-skeleton-${index}`}>
            <div className="flex items-start justify-between gap-3 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-x-4">
                <div className="h-6 w-6 shrink-0 rounded-full bg-dg-gray-400 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="h-5 w-32 max-w-[70%] rounded-full bg-dg-gray-400 animate-pulse" />
                  <div className="mt-2 h-4 w-full rounded-full bg-dg-gray-400 animate-pulse" />
                </div>
              </div>
              <div className="w-20 shrink-0 text-right">
                <div className="ml-auto h-4 w-16 rounded-full bg-dg-gray-400 animate-pulse" />
                <div className="mt-2 ml-auto h-4 w-12 rounded-full bg-dg-gray-400 animate-pulse" />
              </div>
            </div>
            {index < SEARCH_SKELETON_ROW_COUNT - 1 && <Divider />}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SearchOverlayPanel({
  shouldFocusInput = false,
  onClose,
  onSelectSearchResultPoi,
}: SearchOverlayPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const centerRef = useRef<LatLng | null>(null);
  const centerUpdatedAtRef = useRef(0);
  const myPos = useMapStore((s) => s.myPos);
  const clearFocusedPoi = useMapStore((s) => s.clearFocusedPoi);
  const submittedSearchKeyword = useMapStore((s) => s.submittedSearchKeyword);
  const submittedSearchSort = useMapStore((s) => s.submittedSearchSort);
  const commitSubmittedSearchPois = useMapStore(
    (s) => s.commitSubmittedSearchPois,
  );
  const submittedSearchKeywordRef = useRef(submittedSearchKeyword.trim());
  const hasSubmittedSearchKeyword =
    submittedSearchKeywordRef.current.length > 0;
  const [keyword, setKeyword] = useState(() => submittedSearchKeywordRef.current);
  const [searchSort, setSearchSort] = useState<TmapPoiSearchSort>(() =>
    hasSubmittedSearchKeyword ? submittedSearchSort : "R",
  );
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const didRestoreStateRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittingMarkers, setSubmittingMarkers] = useState(false);
  const trimmedKeyword = useMemo(() => keyword.trim(), [keyword]);
  const debouncedKeyword = useDebouncedValue(
    trimmedKeyword,
    SEARCH_DEBOUNCE_MS,
  );
  const isRecentMode = trimmedKeyword.length === 0;
  const isSearchMode = trimmedKeyword.length >= 2;
  const isDebouncePending = isSearchMode && debouncedKeyword !== trimmedKeyword;
  const shouldFetchSearch = debouncedKeyword.length >= 2;
  const searchKey: SearchSWRKey | null = shouldFetchSearch
    ? [debouncedKeyword, searchSort]
    : null;

  const resolveCenter = useCallback(async (): Promise<LatLng> => {
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
        const fallbackCenter: LatLng = {
          lat: myPos.lat,
          lng: myPos.lng,
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

  const fetchPois = useCallback(
    async (query: string, sort: TmapPoiSearchSort) => {
      const center = await resolveCenter();
      const response = await fetchTmapPois({ keyword: query, sort, center });
      return { response, center };
    },
    [resolveCenter],
  );

  const { data, error, isLoading, isValidating } = useSWR<
    TmapPoiSearchResponse,
    Error
  >(
    searchKey,
    async (key) => {
      const [query, sort] = key as SearchSWRKey;
      const fetched = await fetchPois(query, sort);
      return fetched.response;
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 0,
    },
  );

  const items: TmapPoi[] = data?.items ?? [];
  const isDataForCurrentInput =
    Boolean(data) &&
    data?.meta?.keyword === debouncedKeyword &&
    debouncedKeyword === trimmedKeyword &&
    data?.meta?.searchtypCd === searchSort;
  const showLoading =
    isSearchMode &&
    (isDebouncePending || isValidating || (shouldFetchSearch && isLoading)) &&
    !submittingMarkers;
  const listError =
    isSearchMode &&
    !isDebouncePending &&
    debouncedKeyword === trimmedKeyword &&
    error
      ? error.message
      : null;
  const visibleError = isSearchMode ? (submitError ?? listError) : null;
  const showSearchResultList =
    isSearchMode && !showLoading && !listError && isDataForCurrentInput;

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
    if (didRestoreStateRef.current) return;
    didRestoreStateRef.current = true;

    const persisted = readSearchPageState();
    if (!persisted) return;

    if (!hasSubmittedSearchKeyword) {
      setSearchSort(persisted.sort);
    }
  }, [hasSubmittedSearchKeyword]);

  useEffect(() => {
    if (!didRestoreStateRef.current) return;
    writeSearchPageState(keyword, searchSort);
  }, [keyword, searchSort]);

  useEffect(() => {
    if (keyword.length !== 0) return;
    setRecentSearches(readRecentSearches());
  }, [keyword]);

  useEffect(() => {
    setSubmitError(null);
  }, [trimmedKeyword, searchSort]);

  const handleClearKeyword = useCallback(() => {
    setKeyword("");
    inputRef.current?.focus();
  }, []);

  const handleClearRecentSearches = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleDeleteRecentSearch = useCallback((keywordToRemove: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item.keyword !== keywordToRemove);
      writeRecentSearches(next);
      return next;
    });
  }, []);

  const commitCurrentSearchResults = useCallback(async () => {
    if (submittingMarkers) return false;
    const query = trimmedKeyword;
    if (query.length < 2) return false;

    setSubmitError(null);
    setSubmittingMarkers(true);
    setRecentSearches(saveRecentSearch(query));

    try {
      const canReuseCurrentData =
        Boolean(data) &&
        !isLoading &&
        data?.meta?.keyword === query &&
        data?.meta?.searchtypCd === searchSort;

      let response: TmapPoiSearchResponse;
      let center: LatLng;

      if (canReuseCurrentData && data && centerRef.current) {
        response = data;
        center = centerRef.current;
      } else {
        const fetched = await fetchPois(query, searchSort);
        response = fetched.response;
        center = fetched.center;
      }

      commitSubmittedSearchPois(response.items, query, searchSort, center);
      return true;
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "검색 요청에 실패했어요.",
      );
      return false;
    } finally {
      setSubmittingMarkers(false);
    }
  }, [
    commitSubmittedSearchPois,
    data,
    fetchPois,
    isLoading,
    searchSort,
    submittingMarkers,
    trimmedKeyword,
  ]);

  const handleSubmitSearch = useCallback(async () => {
    inputRef.current?.blur();
    const didCommit = await commitCurrentSearchResults();
    if (!didCommit) return;

    clearFocusedPoi();
    onClose();
  }, [clearFocusedPoi, commitCurrentSearchResults, onClose]);

  const handleSelectSearchResult = useCallback(
    async (poi: TmapPoi) => {
      inputRef.current?.blur();
      const didCommit = await commitCurrentSearchResults();
      if (!didCommit) return;

      onClose();
      onSelectSearchResultPoi(poi);
    },
    [commitCurrentSearchResults, onClose, onSelectSearchResultPoi],
  );

  return (
    <div className="absolute inset-0 z-[120] flex h-full min-h-0 flex-col overflow-hidden bg-white pt-3 pointer-events-auto">
      <div className="app-shell-content-width mx-auto px-5">
        <form
          className="flex w-full items-center gap-2 rounded-md border border-dg-gray-500 bg-white px-3 py-2 backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmitSearch();
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="검색 닫기"
            className="w-6 h-6 flex items-center justify-center"
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              className="text-dg-gray-600 h-6 w-6"
            />
          </button>
          <input
            autoComplete="off"
            id="search-keyword"
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="어디로 산책할까요?"
            className="search-input-no-native-clear w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-dg-gray-500"
          />
          {keyword.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearKeyword}
              aria-label="검색어 지우기"
              className="flex h-5 w-5 shrink-0 items-center justify-center"
            >
              <AppIcon
                icon={appIconXMark}
                className="w-3 h-3 text-dg-gray-600"
              />
            </button>
          )}
        </form>
        <fieldset
          className="mt-3 flex items-center gap-4 bg-white py-2"
          aria-label="검색 결과 정렬"
        >
          <div className="inline-flex items-center">
            <label
              className="relative flex cursor-pointer items-center"
              htmlFor="search-overlay-sort-r"
            >
              <input
                type="radio"
                name="search-overlay-sort"
                value="R"
                id="search-overlay-sort-r"
                checked={searchSort === "R"}
                disabled={submittingMarkers}
                onChange={() => setSearchSort("R")}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dg-green-500 opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
            </label>
            <label
              className="ml-2 cursor-pointer text-sm text-slate-600"
              htmlFor="search-overlay-sort-r"
            >
              거리순
            </label>
          </div>
          <div className="inline-flex items-center">
            <label
              className="relative flex cursor-pointer items-center"
              htmlFor="search-overlay-sort-a"
            >
              <input
                type="radio"
                name="search-overlay-sort"
                value="A"
                id="search-overlay-sort-a"
                checked={searchSort === "A"}
                disabled={submittingMarkers}
                onChange={() => setSearchSort("A")}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dg-green-500 opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
            </label>
            <label
              className="ml-2 cursor-pointer text-sm text-slate-600"
              htmlFor="search-overlay-sort-a"
            >
              정확도순
            </label>
          </div>
        </fieldset>
      </div>

      <section className="app-shell-content-width mx-auto flex h-full flex-1 min-h-0 touch-pan-y flex-col overflow-y-auto overscroll-y-contain pb-24 pt-4 [-webkit-overflow-scrolling:touch]">
        {isRecentMode && (
          <>
            <header className="px-5 flex justify-between items-center">
              <div className="px-3 py-3.5 bg-dg-green-500 text-white rounded-full font-semibold text-base">
                최근 검색
              </div>
              <button
                type="button"
                onClick={handleClearRecentSearches}
                className="text-sm text-dg-gray-600 py-3.5 disabled:text-dg-gray-400"
                disabled={recentSearches.length === 0}
              >
                전체 삭제
              </button>
            </header>
            <Divider className="mt-3" />
          </>
        )}
        {isRecentMode &&
          (recentSearches.length === 0 ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="text-dg-gray-600">아직 검색한 기록이 없어요</div>
            </div>
          ) : (
            <div className="px-5">
              <div className="flex-col">
                {recentSearches.map((recent) => (
                  <div
                    key={recent.keyword}
                    className="w-full border-b border-b-dg-gray-400 flex justify-between py-4 text-dg-black text-base"
                  >
                    <button
                      type="button"
                      onClick={() => setKeyword(recent.keyword)}
                      className="flex min-w-0 flex-1 items-center gap-x-4 text-left"
                    >
                      <div className="p-1 rounded-full bg-dg-gray-400">
                        <AppIcon
                          icon={appIconPaw}
                          className="w-3 h-3 text-dg-gray-500"
                        />
                      </div>
                      <span className="truncate">{recent.keyword}</span>
                    </button>
                    <div className="flex gap-x-3 items-center">
                      <span className="text-dg-black">
                        {formatRecentSearchDate(recent.savedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecentSearch(recent.keyword)}
                        aria-label={`${recent.keyword} 삭제`}
                        className="flex h-5 w-5 items-center justify-center"
                      >
                        <AppIcon
                          icon={appIconXMark}
                          className="w-3 h-3 text-dg-gray-600"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {!!trimmedKeyword && trimmedKeyword.length < 2 && (
          <div className="flex flex-1 items-center justify-center px-5 text-center text-sm text-dg-gray-600">
            두 글자 이상 입력해 주세요
          </div>
        )}

        {visibleError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {visibleError}
          </div>
        )}

        {showLoading && (
          <SearchResultSkeleton />
        )}

        {isSearchMode && submittingMarkers && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            제출 결과를 지도에 반영 중...
          </div>
        )}

        {showSearchResultList && (
          <div className="bg-white">
            {/* <div className="px-5 py-3 text-xs font-medium text-dg-gray-600">
              검색 결과 {totalCount.toLocaleString()}건
            </div>
            <Divider /> */}
            {items.length > 0 ? (
              <ul className="px-5">
                {items.map((poi, i) => (
                  <li key={i + "_" + poi.id}>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSelectSearchResult(poi);
                      }}
                      className="flex w-full items-start justify-between gap-3 py-4 text-left"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-x-4">
                        <div className="p-1 rounded-full bg-dg-gray-400">
                          <AppIcon
                            icon={appIconPaw}
                            className="w-3 h-3 text-dg-gray-500"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-base font-medium text-dg-black">
                            {renderHighlightedText(poi.name, trimmedKeyword)}
                          </div>
                          <div className="mt-1 truncate text-sm text-dg-gray-600">
                            {poi.address || poi.roadAddress || "주소 정보 없음"}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm text-dg-black">
                          {poi.bizCategory || "업종 정보 없음"}
                        </div>
                        <div className="mt-1 text-sm text-dg-gray-600">
                          {poi.distanceM != null
                            ? `${formatDist(poi.distanceM)}`
                            : "거리 정보 없음"}
                        </div>
                      </div>
                    </button>
                    {i < items.length - 1 && <Divider />}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-6 text-sm text-dg-gray-600">
                일치하는 장소가 없습니다.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
