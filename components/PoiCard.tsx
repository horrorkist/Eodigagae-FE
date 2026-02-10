import formatDist from "@/lib/formatDist";
import { PoiStyle } from "@/lib/poiMarker";
import { PetPoiItem } from "@/types/mapEvents";
import React from "react";
import PoiThumb from "./PoiThumb";
import { useEmit } from "@/hooks/useEventBus";
import { useBottomSheetStore } from "@/stores/bottomSheet";

export default function PoiCard({
  poi,
  style,
}: {
  poi: PetPoiItem;
  style: PoiStyle;
}) {
  const emit = useEmit();
  const closeBottomSheet = useBottomSheetStore((s) => s.close);

  const onClick = () => {
    emit({
      type: "MOVE_MAP_CENTER",
      pos: { lat: Number(poi.mapy), lng: Number(poi.mapx) },
      animate: true,
      channel: "map",
    });
    closeBottomSheet();
  };
  return (
    <div
      className="
        group flex items-stretch justify-between gap-4
        rounded-2xl border border-gray-200 bg-white p-4
        shadow-sm transition
        hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md
        active:translate-y-0
      "
      onClick={onClick}
    >
      {/* Left */}
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-1 text-xs text-gray-400">
          <span className="font-medium">{style.label}</span>
          <span className="text-gray-300">•</span>
          <span className="tabular-nums">{formatDist(Number(poi.dist))}</span>
        </div>

        <div className="text-base font-semibold leading-snug text-gray-900 line-clamp-2">
          {poi.title}
        </div>

        <div className="mt-2 text-xs text-gray-600 line-clamp-1">
          {poi.addr1 ?? ""}
        </div>
      </div>

      {/* Right thumbnail */}
      <div className="relative h-20 w-20 flex-none overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
        <PoiThumb src={poi.firstimage2} alt={poi.title} poiStyle={style} />
      </div>
    </div>
  );
}
