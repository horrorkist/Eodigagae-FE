import PoiCard from "@/components/PoiCard";
import Divider from "@/components/Divider";
import type { TmapPoi } from "@/types/tmapPoi";

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
    <div className="w-full bg-white">
      {showSummary && (
        <div className="px-4 py-3 text-xs font-medium text-dg-gray-600">
          검색 결과 {items.length.toLocaleString()}건
        </div>
      )}
      {showSummary && <Divider />}
      {items.length > 0 ? (
        <ul>
          {items.map((poi, i) => (
            <li key={`${poi.id}:${i}`}>
              <PoiCard
                item={{
                  id: `tmap:${poi.id}:${i}`,
                  title: poi.name,
                  category: poi.bizCategory || "업종 정보 없음",
                  address: poi.address || poi.roadAddress,
                  distanceM: poi.distanceM,
                  thumbnailUrl: null,
                }}
                onClick={() => onFocusPoi(poi)}
              />
              {i < items.length - 1 && <Divider />}
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-6 text-sm text-dg-gray-600">
          표시할 검색 결과가 없어요.
        </div>
      )}
    </div>
  );
}
