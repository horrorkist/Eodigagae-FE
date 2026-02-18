"use client";

import formatDist from "@/lib/formatDist";
import type { FocusedPoi } from "@/types/focusedPoi";

function renderFieldValue(value: string) {
  return value.trim().length > 0 ? value : "-";
}

export default function FocusedPoiSheet({
  poi,
  onClose,
}: {
  poi: FocusedPoi;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed left-1/2 z-[112] w-full max-w-[430px] -translate-x-1/2 px-3"
      style={{ bottom: "calc(var(--safe-bottom) + 64px)" }}
    >
      <section className="rounded-2xl border border-emerald-200 bg-white shadow-[0_-10px_24px_rgba(0,0,0,0.14)]">
        <div className="flex items-start justify-between gap-3 border-b border-emerald-100 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-gray-900">
              {renderFieldValue(poi.name)}
            </div>
            <div className="mt-0.5 text-xs text-emerald-700">선택한 장소</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-700"
          >
            닫기
          </button>
        </div>

        <div className="grid grid-cols-[78px_1fr] gap-x-2 gap-y-1 px-4 py-3 text-sm text-gray-700">
          <div className="text-gray-500">업체명</div>
          <div>{renderFieldValue(poi.name)}</div>
          <div className="text-gray-500">업종</div>
          <div>{renderFieldValue(poi.bizCategory)}</div>
          <div className="text-gray-500">거리</div>
          <div>{poi.distanceM != null ? formatDist(poi.distanceM) : "-"}</div>
          <div className="text-gray-500">middleAddress</div>
          <div>{renderFieldValue(poi.middleAddress)}</div>
          <div className="text-gray-500">지번주소</div>
          <div>{renderFieldValue(poi.jibunAddress)}</div>
          <div className="text-gray-500">도로명 주소</div>
          <div>{renderFieldValue(poi.roadAddress)}</div>
        </div>
      </section>
    </div>
  );
}
