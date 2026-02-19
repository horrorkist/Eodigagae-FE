import type { RefObject } from "react";
import { POI_STYLES } from "@/lib/poiMarker";
import PoiCard from "@/components/PoiCard";
import type { PetPoiItem } from "@/types/mapEvents";

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
  loading: boolean;
  totalCount: number | null;
  visiblePois: PetPoiItem[];
  hasMorePois: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onFocusPoi: (poi: PetPoiItem) => void;
};

export default function PoiTabContent({
  loading,
  // totalCount,
  visiblePois,
  hasMorePois,
  loadMoreRef,
  onFocusPoi,
}: PoiTabContentProps) {
  return (
    <>
      {/* <PetPoiSummary loading={loading} totalCount={totalCount} /> */}

      {visiblePois.map((poi) => {
        const style = POI_STYLES[poi.contenttypeid];
        return (
          <PoiCard
            key={poi.contentid}
            poi={poi}
            style={style}
            onClick={() => onFocusPoi(poi)}
          />
        );
      })}

      {!loading && visiblePois.length === 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          표시할 장소가 없어요. 상단의 동반 가능 토글을 확인해 주세요.
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
