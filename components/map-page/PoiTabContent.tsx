import type { RefObject } from "react";
import PoiCard from "@/components/PoiCard";
import Divider from "@/components/Divider";
import type { HomePoiListItem } from "@/types/homePoi";

const POI_TAB_SKELETON_COUNT = 4;

// function PetPoiSummary({
//   loading,
//   totalCount,
// }: {
//   loading: boolean;
//   totalCount: number | null;
// }) {
//   return (
//     <div className="border border-amber-200 bg-amber-50 rounded-md p-3 flex items-center gap-2 text-sm">
//       <FontAwesomeIcon
//         icon={faPaw}
//         className="w-3.5 h-3.5 text-amber-600 shrink-0"
//       />
//       <span className="font-semibold text-amber-800">반려동물 동반 시설</span>
//       <span className="ml-auto text-amber-700 font-bold">
//         {loading ? "..." : totalCount != null ? `${totalCount}곳` : "-"}
//       </span>
//     </div>
//   );
// }

type PoiTabContentProps = {
  hasAnySourceOn: boolean;
  loading: boolean;
  visiblePois: HomePoiListItem[];
  hasMorePois: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onFocusPoi: (poi: HomePoiListItem) => void;
  onRouteClick: (poi: HomePoiListItem) => void;
};

function PoiTabSkeletonList() {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: POI_TAB_SKELETON_COUNT }, (_, index) => (
        <li key={`poi-tab-skeleton-${index}`}>
          <div className="flex w-full items-stretch justify-between gap-3 bg-white py-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex min-w-0 items-center gap-x-2">
                <div className="h-6 w-6 shrink-0 rounded-full bg-dg-gray-400 animate-pulse" />
                <div className="flex min-w-0 flex-1 items-center gap-x-2">
                  <div className="h-5 w-28 rounded-full bg-dg-gray-400 animate-pulse" />
                  <div className="h-4 w-16 rounded-full bg-dg-gray-400 animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-full rounded-full bg-dg-gray-400 animate-pulse" />
              <div className="h-4 w-40 rounded-full bg-dg-gray-400 animate-pulse" />
              <div className="h-7 w-20 rounded-full border border-dg-gray-500 bg-white animate-pulse" />
            </div>
            <div className="h-20 w-20 shrink-0 rounded-xl bg-dg-gray-400 animate-pulse" />
          </div>
          {index < POI_TAB_SKELETON_COUNT - 1 && <Divider />}
        </li>
      ))}
    </ul>
  );
}

export default function PoiTabContent({
  hasAnySourceOn,
  loading,
  visiblePois,
  hasMorePois,
  loadMoreRef,
  onFocusPoi,
  onRouteClick,
}: PoiTabContentProps) {
  return (
    <>
      {visiblePois.length > 0 && (
        <ul>
          {visiblePois.map((poi, index) => {
            const cardTitle =
              poi.source === "trash-bin"
                ? poi.meta.item.locationDesc.trim() || poi.title
                : poi.title;

            return (
              <li key={poi.id}>
                <PoiCard
                  item={{
                    id: poi.id,
                    source: poi.source,
                    title: cardTitle,
                    category: poi.category,
                    address: poi.address,
                    distanceM: poi.distanceM,
                    thumbnailUrl: poi.thumbnailUrl,
                    iconOnlyThumbnail:
                      poi.source === "fountain" || poi.source === "trash-bin",
                  }}
                  onClick={() => onFocusPoi(poi)}
                  onRouteClick={() => onRouteClick(poi)}
                />
                {index < visiblePois.length - 1 && <Divider />}
              </li>
            );
          })}
        </ul>
      )}

      {!hasAnySourceOn && (
        <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-sm text-dg-gray-600">
          상단 토글 칩을 켜면 장소 목록을 불러올 수 있어요.
        </div>
      )}

      {hasAnySourceOn && loading && visiblePois.length === 0 && (
        <PoiTabSkeletonList />
      )}

      {hasAnySourceOn && !loading && visiblePois.length === 0 && (
        <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-sm text-dg-gray-600">
          표시할 장소가 없어요.
        </div>
      )}

      {hasMorePois && (
        <div
          ref={loadMoreRef}
          className="h-10 flex items-center justify-center text-xs text-gray-400"
        >
          목록 불러오는 중...
        </div>
      )}
    </>
  );
}
