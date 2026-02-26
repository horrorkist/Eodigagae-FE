import SearchResultTabContent from "@/components/map-page/SearchResultTabContent";
import type { TmapPoi } from "@/types/tmapPoi";

type SearchResultsBottomSheetContentProps = {
  items: TmapPoi[];
  onBackToHome: () => void;
  onFocusPoi: (poi: TmapPoi) => void;
};

export default function SearchResultsBottomSheetContent({
  items,
  onBackToHome,
  onFocusPoi,
}: SearchResultsBottomSheetContentProps) {
  return (
    <div className="space-y-3 pb-[calc(var(--safe-bottom)+56px)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">검색 결과</div>
          <div className="mt-1 text-xs text-gray-500">
            {items.length.toLocaleString()}건
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToHome}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          목록 닫기
        </button>
      </div>

      <SearchResultTabContent
        items={items}
        onFocusPoi={onFocusPoi}
        showSummary={false}
      />
    </div>
  );
}
