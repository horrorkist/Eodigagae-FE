import type { RefObject } from "react";
import PoiCard from "@/components/PoiCard";
import Divider from "@/components/Divider";
import type { HomePoiListItem } from "@/types/homePoi";

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
};

export default function PoiTabContent({
  hasAnySourceOn,
  loading,
  visiblePois,
  hasMorePois,
  loadMoreRef,
  onFocusPoi,
}: PoiTabContentProps) {
  return (
    <>
      {visiblePois.length > 0 && (
        <ul>
          {visiblePois.map((poi, index) => {
            return (
              <li key={poi.id}>
                <PoiCard
                  item={{
                    id: poi.id,
                    source: poi.source,
                    title: poi.title,
                    category: poi.category,
                    address: poi.address,
                    distanceM: poi.distanceM,
                    thumbnailUrl: poi.thumbnailUrl,
                    iconOnlyThumbnail:
                      poi.source === "fountain" || poi.source === "trash-bin",
                  }}
                  onClick={() => onFocusPoi(poi)}
                />
                {index < visiblePois.length - 1 && <Divider />}
              </li>
            );
          })}
        </ul>
      )}

      {!hasAnySourceOn && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          상단 토글 칩을 켜면 장소 목록을 불러올 수 있어요.
        </div>
      )}

      {hasAnySourceOn && !loading && visiblePois.length === 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
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
