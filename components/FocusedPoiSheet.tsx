"use client";

import formatDist from "@/lib/formatDist";
import type { FocusedPoi } from "@/types/focusedPoi";
import { useModalStore } from "@/stores/modal";
import { BOTTOM_CHROME_HEIGHT_PX } from "@/lib/bottomChromeMetrics";
import AppIcon from "./icons/AppIcon";
import {
  appIconChevronDown,
  appIconCopy,
  appIconMapPin,
  appIconPuppy,
  appIconTrashbin,
  appIconTel,
  appIconWaterdrop,
  appIconXMark,
  type AppIconDefinition,
} from "./icons/definitions.generated";
import { useEffect, useRef, useState } from "react";

const WALK_SPEED_M_PER_MIN = 67; // 약 4.0km/h

function renderFieldValue(value: string) {
  return value.trim().length > 0 ? value : "-";
}

function estimateWalkMinutes(distanceM: number | null) {
  if (distanceM == null || !Number.isFinite(distanceM) || distanceM <= 0) {
    return null;
  }

  return Math.max(1, Math.round(distanceM / WALK_SPEED_M_PER_MIN));
}

function getSourceIcon(source: FocusedPoi["source"]): AppIconDefinition {
  if (source === "fountain") return appIconWaterdrop;
  if (source === "trash-bin") return appIconTrashbin;
  if (source === "tmap") return appIconMapPin;
  return appIconPuppy;
}

function getSourceBadgeClass(source: FocusedPoi["source"]) {
  if (source === "fountain") return "bg-dg-blue-500";
  if (source === "trash-bin") return "bg-green-sub";
  if (source === "tmap") return "bg-dg-gray-600";
  return "bg-dg-orange-500";
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
  onClose,
  onHeightChange,
}: {
  poi: FocusedPoi;
  onClose: () => void;
  onHeightChange?: (heightPx: number) => void;
}) {
  const [showDetailAddress, setShowDetailAddress] = useState(false);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const openModal = useModalStore((s) => s.open);
  const roadAddress = poi.roadAddress?.trim() ?? "";
  const jibunAddress = poi.jibunAddress?.trim() ?? "";
  const estimatedWalkMinutes = estimateWalkMinutes(poi.distanceM);
  const thumbnail = poi.thumbnail?.trim() ?? "";
  const showThumbnail = thumbnail.length > 0 && failedThumbnail !== thumbnail;
  const isFacilitySource =
    poi.source === "fountain" || poi.source === "trash-bin";
  const sourceIcon = getSourceIcon(poi.source);
  const sourceBadgeClass = getSourceBadgeClass(poi.source);

  useEffect(() => {
    if (!onHeightChange) return;

    const target = rootRef.current;
    if (!target) {
      onHeightChange(0);
      return;
    }

    let rafId = 0;
    const emitHeight = () => {
      const nextHeight = Math.max(
        0,
        Math.round(target.getBoundingClientRect().height),
      );
      onHeightChange(nextHeight);
    };

    emitHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(emitHeight);
      });
      observer.observe(target);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        observer.disconnect();
        onHeightChange(0);
      };
    }

    const handleWindowResize = () => emitHeight();
    window.addEventListener("resize", handleWindowResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleWindowResize);
      onHeightChange(0);
    };
  }, [onHeightChange]);

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
      ref={rootRef}
      className="fixed left-0 z-[112] w-full max-w-[430px] pointer-events-auto"
      style={{
        bottom: `calc(var(--safe-bottom) + ${BOTTOM_CHROME_HEIGHT_PX}px)`,
      }}
    >
      <section
        className={[
          "rounded-tl-2xl rounded-tr-2xl px-4 py-5 bg-white flex flex-col space-y-2",
          isFacilitySource ? "min-h-0" : "min-h-[320px]",
        ].join(" ")}
      >
        <div className="flex flex-col">
          <div className="flex justify-between">
            <div className="min-w-0 flex items-center gap-x-2">
              <div
                className={[
                  "p-1 rounded-full",
                  sourceBadgeClass,
                ].join(" ")}
              >
                <AppIcon icon={sourceIcon} className="w-5 h-5 text-white" />
              </div>
              <div className="truncate text-xl font-semibold text-dg-black text-ellipsis">
                {renderFieldValue(poi.name)}
              </div>
              <div className="text-dg-gray-500 text-nowrap">
                {poi.bizCategory}
              </div>
            </div>
            <div className="ml-4 flex items-center gap-x-2">
              <button
                type="button"
                aria-label="상세 닫기"
                onClick={onClose}
                className="flex h-7 w-7 mb-5 items-center justify-center rounded-full border-dg-gray-500 bg-white text-dg-gray-600"
              >
                <AppIcon icon={appIconXMark} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {!isFacilitySource && (
            <div className="flex gap-x-2 items-center text-dg-gray-600">
              <AppIcon icon={appIconTel} className="w-4 h-4" />
              <span>{poi.tel ? poi.tel : "제공되는 전화번호가 없습니다."}</span>
            </div>
          )}
          <div
            onClick={() => setShowDetailAddress((prev) => !prev)}
            className="text-dg-gray-600 relative flex items-center gap-x-2"
          >
            <span>{poi.middleAddress}</span>
            <AppIcon icon={appIconChevronDown} className="w-3 h-3" />
            {showDetailAddress && (roadAddress || jibunAddress) && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute rounded-2xl bg-white shadow-drop top-full flex flex-col p-3 space-y-2"
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
          {poi.distanceM != null && (
            <div className="text-dg-gray-600 text-nowrap">
              {formatDist(poi.distanceM)}
              {estimatedWalkMinutes != null && (
                <>&nbsp;&middot;&nbsp;도보 약 {estimatedWalkMinutes}분</>
              )}
            </div>
          )}
        </div>
        {!isFacilitySource && (
          <div className="mt-2 h-32 w-full overflow-hidden rounded-2xl bg-dg-gray-300">
            {showThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={`${poi.name} 대표 이미지`}
                className="h-full w-full object-cover"
                onError={() => setFailedThumbnail(thumbnail)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-y-2 text-dg-gray-600">
                <AppIcon icon={sourceIcon} className="h-8 w-8" />
                <span className="text-sm">이미지 없음</span>
              </div>
            )}
          </div>
        )}
        <button className="w-full py-2 rounded-xl bg-dg-green-500 text-white text-xl font-semibold">
          길찾기
        </button>
      </section>
    </div>
  );
}
