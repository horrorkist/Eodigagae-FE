import type { RefObject } from "react";
import { getPoiStyle } from "@/lib/poiMarker";
import PoiCard from "@/components/PoiCard";
import Divider from "@/components/Divider";
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
  petPoiOn: boolean;
  loading: boolean;
  totalCount: number | null;
  visiblePois: PetPoiItem[];
  hasMorePois: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onFocusPoi: (poi: PetPoiItem) => void;
};

export default function PoiTabContent({
  petPoiOn,
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

      {visiblePois.length > 0 && (
        <ul>
          {visiblePois.map((poi, index) => {
            const style = getPoiStyle(poi.contenttypeid);
            const distanceRaw = Number(poi.dist);
            const distanceM = Number.isFinite(distanceRaw) ? distanceRaw : null;

            return (
              <li key={poi.contentid}>
                <PoiCard
                  item={{
                    id: `kto:${poi.contentid}`,
                    title: poi.title,
                    category: style.label,
                    address: poi.addr1,
                    distanceM,
                    thumbnailUrl: poi.firstimage2 || poi.firstimage,
                  }}
                  onClick={() => onFocusPoi(poi)}
                />
                {index < visiblePois.length - 1 && <Divider />}
              </li>
            );
          })}
        </ul>
      )}

      {!petPoiOn && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          상단의 <span className="font-semibold">동반 가능</span> 토글 칩을 켜면
          장소 목록을 불러올 수 있어요.
        </div>
      )}

      {petPoiOn && !loading && visiblePois.length === 0 && (
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
