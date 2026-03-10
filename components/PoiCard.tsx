import formatDist from "@/lib/formatDist";
import { useState } from "react";
import Image from "next/image";
import AppIcon from "./icons/AppIcon";
import {
  appIconPaw,
  appIconPuppy,
  appIconTrashbin,
  appIconWaterdrop,
  type AppIconDefinition,
} from "./icons/definitions.generated";

const WALK_SPEED_M_PER_MIN = 67; // 약 4.0km/h

export type HomePoiCardItem = {
  id: string;
  source?: "kto" | "fountain" | "trash-bin" | "tmap";
  title: string;
  category?: string;
  address?: string;
  distanceM: number | null;
  thumbnailUrl?: string | null;
  iconOnlyThumbnail?: boolean;
};

type CardVisualStyle = {
  leftBadgeBgClassName: string;
  leftIcon: AppIconDefinition;
  thumbnailBgClassName: string;
  thumbnailIconClassName: string;
};

const DEFAULT_CARD_VISUAL_STYLE: CardVisualStyle = {
  leftBadgeBgClassName: "bg-dg-orange-500",
  leftIcon: appIconPuppy,
  thumbnailBgClassName: "bg-dg-gray-400",
  thumbnailIconClassName: "text-dg-gray-600",
};

const CARD_VISUAL_STYLES: Record<
  NonNullable<HomePoiCardItem["source"]>,
  CardVisualStyle
> = {
  kto: DEFAULT_CARD_VISUAL_STYLE,
  tmap: DEFAULT_CARD_VISUAL_STYLE,
  fountain: {
    leftBadgeBgClassName: "bg-dg-blue-500",
    leftIcon: appIconWaterdrop,
    thumbnailBgClassName: "bg-dg-blue-300",
    thumbnailIconClassName: "text-dg-blue-500",
  },
  "trash-bin": {
    leftBadgeBgClassName: "bg-dg-green-sub",
    leftIcon: appIconTrashbin,
    thumbnailBgClassName: "bg-dg-green-400",
    thumbnailIconClassName: "text-dg-green-sub",
  },
};

function getCardVisualStyle(source: HomePoiCardItem["source"]) {
  if (!source) return DEFAULT_CARD_VISUAL_STYLE;
  return CARD_VISUAL_STYLES[source] ?? DEFAULT_CARD_VISUAL_STYLE;
}

function estimateWalkMinutes(distanceM: number | null) {
  if (distanceM == null || !Number.isFinite(distanceM) || distanceM <= 0) {
    return null;
  }
  return Math.max(1, Math.round(distanceM / WALK_SPEED_M_PER_MIN));
}

export default function PoiCard({
  item,
  onClick,
  onRouteClick,
}: {
  item: HomePoiCardItem;
  onClick: () => void;
  onRouteClick?: () => void;
}) {
  const [isThumbnailFailed, setIsThumbnailFailed] = useState(false);
  const thumbnailUrl = item.thumbnailUrl?.trim() ?? "";
  const visualStyle = getCardVisualStyle(item.source);
  const shouldUseIconOnlyThumbnail = item.iconOnlyThumbnail === true;
  const showThumbnail = thumbnailUrl.length > 0 && !isThumbnailFailed;
  const address = item.address?.trim() || "주소 정보 없음";
  const category = item.category?.trim();
  const estimatedWalkMinutes = estimateWalkMinutes(item.distanceM);

  return (
    <div
      role="button"
      tabIndex={0}
      className="
        group flex w-full items-stretch justify-between gap-3 bg-white py-4 text-left
        transition-colors
        hover:bg-dg-gray-400/30
        active:translate-y-0
      "
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onClick();
      }}
    >
      <div className="min-w-0 flex-1 flex-col space-y-1">
        <div className="flex min-w-0 items-center gap-x-2">
          <div
            className={[
              "rounded-full p-1",
              visualStyle.leftBadgeBgClassName,
            ].join(" ")}
          >
            <AppIcon
              icon={visualStyle.leftIcon}
              className="h-4 w-4 text-white"
            />
          </div>
          <div className="min-w-0 flex items-center gap-x-2">
            <div className="truncate text-base font-semibold text-dg-black">
              {item.title}
            </div>
            {category && (
              <div className="text-sm text-dg-gray-600 text-nowrap">
                {category}
              </div>
            )}
          </div>
        </div>
        <div className="truncate text-sm text-dg-gray-600">{address}</div>
        <div className="text-sm text-dg-gray-600">
          {item.distanceM != null
            ? `${formatDist(item.distanceM)}${
                estimatedWalkMinutes != null
                  ? ` · 도보 약 ${estimatedWalkMinutes}분`
                  : ""
              }`
            : "거리 정보 없음"}
        </div>
        <div className="flex">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRouteClick?.();
            }}
            className="rounded-full flex text-nowrap gap-x-1 items-center border border-dg-gray-500 bg-white px-2 py-1 text-xs disabled:cursor-default disabled:opacity-60"
            disabled={!onRouteClick}
          >
            <AppIcon icon={appIconPaw} className="w-3 h-3 text-dg-gray-600" />
            <span className="text-dg-gray-600">길찾기</span>
          </button>
        </div>
      </div>

      <div className="relative h-20 w-20 flex-none overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
        {shouldUseIconOnlyThumbnail ? (
          <div
            className={[
              "flex h-full w-full items-center justify-center",
              visualStyle.thumbnailBgClassName,
              visualStyle.thumbnailIconClassName,
            ].join(" ")}
          >
            <AppIcon
              icon={visualStyle.leftIcon}
              className="h-12 w-12 text-white"
            />
          </div>
        ) : showThumbnail ? (
          <Image
            src={thumbnailUrl}
            alt={`${item.title} 대표 이미지`}
            fill
            sizes="80px"
            className="object-cover"
            onError={() => setIsThumbnailFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-y-1 bg-dg-gray-400 text-dg-gray-600">
            <AppIcon icon={visualStyle.leftIcon} className="h-5 w-5" />
            <span className="text-[10px] leading-none">이미지 없음</span>
          </div>
        )}
      </div>
    </div>
  );
}
