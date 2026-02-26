import formatDist from "@/lib/formatDist";
import type { TmapPoi } from "@/types/tmapPoi";

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

type SearchResultTabContentProps = {
  items: TmapPoi[];
  onFocusPoi: (poi: TmapPoi) => void;
  showSummary?: boolean;
};

export default function SearchResultTabContent({
  items,
  onFocusPoi,
  showSummary = true,
}: SearchResultTabContentProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {showSummary && (
        <div className="border-b border-gray-100 px-4 py-3 text-xs font-medium text-gray-500">
          검색 결과 {items.length.toLocaleString()}건
        </div>
      )}
      {items.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {items.map((poi, i) => (
            <li key={`${poi.id}:${i}`} className="px-4 py-4">
              <button
                type="button"
                onClick={() => onFocusPoi(poi)}
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
          표시할 검색 결과가 없어요.
        </div>
      )}
    </div>
  );
}
