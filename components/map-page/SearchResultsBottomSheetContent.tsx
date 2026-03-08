import SearchResultTabContent from "@/components/map-page/SearchResultTabContent";
import type { TmapPoi, TmapPoiSearchSort } from "@/types/tmapPoi";
import { BOTTOM_CHROME_HEIGHT_PX } from "@/lib/bottomChromeMetrics";
import Divider from "../Divider";

type SearchResultsBottomSheetContentProps = {
  items: TmapPoi[];
  sort: TmapPoiSearchSort;
  sortLoading?: boolean;
  sortError?: string | null;
  onSortChange: (next: TmapPoiSearchSort) => void;
  onFocusPoi: (poi: TmapPoi) => void;
};

export default function SearchResultsBottomSheetContent({
  items,
  sort,
  sortLoading = false,
  sortError = null,
  onSortChange,
  onFocusPoi,
}: SearchResultsBottomSheetContentProps) {
  return (
    <div
      className="space-y-3"
      style={{
        paddingBottom: `calc(var(--safe-bottom) + ${BOTTOM_CHROME_HEIGHT_PX}px)`,
      }}
    >
      <div className="space-y-2">
        <fieldset
          className="flex items-center gap-4 bg-white py-2"
          aria-label="검색 결과 정렬"
        >
          <div className="inline-flex items-center">
            <label
              className="relative flex items-center cursor-pointer"
              htmlFor="ㄱR"
            >
              <input
                type="radio"
                name="search-result-sort"
                value="R"
                id="R"
                checked={sort === "R"}
                disabled={sortLoading}
                onChange={() => onSortChange("R")}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
              />
              <span className="absolute bg-dg-green-500 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></span>
            </label>
            <label
              className="ml-2 text-slate-600 cursor-pointer text-sm"
              htmlFor="R"
            >
              거리순
            </label>
          </div>
          <div className="inline-flex items-center">
            <label
              className="relative flex items-center cursor-pointer"
              htmlFor="A"
            >
              <input
                type="radio"
                name="search-result-sort"
                value="A"
                id="A"
                checked={sort === "A"}
                disabled={sortLoading}
                onChange={() => onSortChange("A")}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-slate-400 transition-all"
              />
              <span className="absolute bg-dg-green-500 w-3 h-3 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></span>
            </label>
            <label
              className="ml-2 text-slate-600 cursor-pointer text-sm"
              htmlFor="A"
            >
              정확도순
            </label>
          </div>
        </fieldset>
      </div>

      <Divider className="-mx-4" />

      {sortLoading && (
        <div className="flex items-center justify-center bg-white px-3 py-5">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-dg-gray-500 border-t-transparent" />
        </div>
      )}
      {!sortError && <div className="text-xs text-red-500">{sortError}</div>}

      {!sortLoading && (
        <SearchResultTabContent
          items={items}
          onFocusPoi={onFocusPoi}
          showSummary={false}
        />
      )}
    </div>
  );
}
