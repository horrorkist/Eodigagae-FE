"use client";

import formatDist from "@/lib/formatDist";
import type { FocusedPoi } from "@/types/focusedPoi";
import { useModalStore } from "@/stores/modal";
import AppIcon from "./icons/AppIcon";
import {
  appIconChevronDown,
  appIconCopy,
  appIconPaw,
  appIconTel,
} from "./icons/definitions.generated";
import { useState } from "react";

function renderFieldValue(value: string) {
  return value.trim().length > 0 ? value : "-";
}

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("clipboard not available");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("copy failed");
  }
}

export default function FocusedPoiSheet({
  poi,
  onClose: _onClose,
}: {
  poi: FocusedPoi;
  onClose: () => void;
}) {
  const [showDetailAddress, setShowDetailAddress] = useState(false);
  const openModal = useModalStore((s) => s.open);
  void _onClose;
  const roadAddress = poi.roadAddress?.trim() ?? "";
  const jibunAddress = poi.jibunAddress?.trim() ?? "";

  const handleCopyAddress = async (address: string, label: string) => {
    const value = address.trim();
    if (!value) return;

    try {
      await copyTextToClipboard(value);
      openModal({
        title: "주소 복사 완료",
        body: `${label} 주소를 클립보드에 복사했어요.`,
      });
    } catch {
      openModal({
        title: "주소 복사 실패",
        body: "클립보드에 복사하지 못했어요. 다시 시도해 주세요.",
      });
    }
  };

  return (
    <div
      className="fixed left-0 bottom-0 z-[112] w-full max-w-[430px]"
      // style={{ bottom: "calc(var(--safe-bottom) + 64px)" }}
    >
      <section className="rounded-tl-2xl rounded-tr-2xl py-9 bg-white min-h-[320px] flex flex-col space-y-2">
        <div className="px-4 flex flex-col space-y-2">
          <div className="flex justify-between">
            <div className="min-w-0 flex items-center gap-x-2">
              <div className="truncate text-xl font-semibold text-dg-black text-ellipsis">
                {renderFieldValue(poi.name)}
              </div>
              <div className="text-dg-gray-500 text-nowrap">
                {poi.bizCategory}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full flex text-nowrap gap-x-1 ml-4 items-center border border-dg-gray-500 bg-white px-2 py-1 text-xs"
            >
              <AppIcon icon={appIconPaw} className="w-3 h-3 text-dg-gray-600" />
              <span className="text-gray-60">길찾기</span>
            </button>
          </div>
          <div className="flex gap-x-2 items-center text-dg-gray-600">
            <AppIcon icon={appIconTel} className="w-4 h-4" />
            <span>{poi.tel ? poi.tel : "제공되는 전화번호가 없습니다."}</span>
          </div>
          <div
            onClick={() => setShowDetailAddress((prev) => !prev)}
            className="text-dg-gray-600 relative flex items-center gap-x-2"
          >
            <span>{poi.middleAddress}</span>
            <AppIcon icon={appIconChevronDown} className="w-3 h-3" />
            {showDetailAddress && (roadAddress || jibunAddress) && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute rounded-2xl bg-white shadow-drop top-full flex flex-col px-4 py-3 space-y-2"
              >
                {roadAddress && (
                  <div className="flex text-xs items-center space-x-2">
                    <div className="px-3 py-1 rounded-full bg-dg-green-500 text-white text-nowrap">
                      도로명
                    </div>
                    <span className="text-ellipsis line-clamp-1">
                      {roadAddress}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleCopyAddress(roadAddress, "도로명");
                      }}
                      className="flex items-center justify-center text-dg-gray-600"
                      aria-label="도로명 주소 복사"
                    >
                      <AppIcon icon={appIconCopy} className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {jibunAddress && (
                  <div className="flex text-xs items-center space-x-2">
                    <div className="px-3 py-1 rounded-full bg-dg-green-500 text-white text-nowrap">
                      지번
                    </div>
                    <span className="text-ellipsis line-clamp-1">
                      {jibunAddress}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleCopyAddress(jibunAddress, "지번");
                      }}
                      className="flex items-center justify-center text-dg-gray-600"
                      aria-label="지번 주소 복사"
                    >
                      <AppIcon icon={appIconCopy} className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {poi.distanceM && (
            <div className="text-dg-gray-600 text-nowrap">
              {formatDist(poi.distanceM)}
            </div>
          )}
        </div>
        <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
          <div className="inline-flex gap-4 px-4">
            {[1, 2, 3].map((e) => {
              return (
                <div
                  key={e}
                  className="w-50 aspect-video shrink-0 rounded-2xl bg-dg-gray-600"
                ></div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
