import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconMagnify,
  appIconXMark,
} from "@/components/icons/definitions.generated";
import type { ToggleItem, ToggleVariant } from "@/components/map-overlay/types";

const LOADING_INDICATOR_DELAY_MS = 100;

const TOGGLE_STYLES: Record<
  ToggleVariant,
  {
    on: string;
    off: string;
    text: string;
  }
> = {
  orange: {
    on: "bg-dg-orange-100 border border-dg-orange-500",
    off: "bg-white border border-white",
    text: "text-dg-orange-500",
  },
  green: {
    on: "bg-dg-green-100 border border-dg-green-sub",
    off: "bg-white border border-white",
    text: "text-dg-green-sub",
  },
  blue: {
    on: "bg-dg-blue-100 border border-dg-blue-500",
    off: "bg-white border border-white",
    text: "text-dg-blue-500",
  },
};

function ToggleChipButton({ toggle }: { toggle: ToggleItem }) {
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);

  useEffect(() => {
    if (!toggle.loading) return;

    const timeoutId = window.setTimeout(() => {
      setShowLoadingIndicator(true);
    }, LOADING_INDICATOR_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toggle.loading]);

  const isOn = toggle.value;
  const label = isOn ? toggle.labelOn : (toggle.labelOff ?? toggle.labelOn);
  const style = TOGGLE_STYLES[toggle.variant];

  return (
    <button
      key={toggle.key}
      type="button"
      disabled={toggle.disabled || toggle.loading}
      onClick={() => toggle.onChange(!toggle.value)}
      data-coachmark-id={toggle.key === "petpoi" ? "petpoi-chip" : undefined}
      className={[
        "pointer-events-auto shrink-0",
        "flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm shadow backdrop-blur",
        "active:scale-[0.98] transition",
        isOn ? style.on : style.off,
      ].join(" ")}
    >
      <AppIcon
        icon={toggle.icon}
        className={["w-4 h-4", style.text].join(" ")}
      />
      <span className="relative inline-flex items-center justify-center">
        <span className={showLoadingIndicator ? "opacity-0" : ""}>{label}</span>
        {showLoadingIndicator && (
          <span
            className={[
              "absolute w-4 h-4 animate-spin rounded-full border-2 border-t-transparent",
              style.text,
            ].join(" ")}
          />
        )}
      </span>
    </button>
  );
}

function ToggleChips({ toggles }: { toggles: ToggleItem[] }) {
  if (toggles.length === 0) return null;

  return (
    <div className="pointer-events-auto mt-2 w-full overflow-x-auto pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-full items-center gap-2 px-5">
        {toggles.map((toggle) => (
          <ToggleChipButton
            key={`${toggle.key}:${toggle.loading ? "loading" : "idle"}`}
            toggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}

type TopOverlayProps = {
  topOffsetPx: number;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  toggles: ToggleItem[];
  searchKeyword?: string;
  showSearchResultClearButton?: boolean;
  onClearSearchResults?: () => void;
};

export default function TopOverlay({
  topOffsetPx,
  leftSlot,
  rightSlot,
  toggles,
  searchKeyword = "",
  showSearchResultClearButton = false,
  onClearSearchResults,
}: TopOverlayProps) {
  const normalizedSearchKeyword = searchKeyword.trim();
  const hasSearchKeyword = normalizedSearchKeyword.length > 0;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{ top: topOffsetPx }}
    >
      <div className="px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="pointer-events-auto">{leftSlot}</div>

          <div className="pointer-events-auto min-w-0 flex-1 max-w-140">
            <div className="flex w-full items-center gap-2 rounded-md border bg-white/90 px-3 py-2 shadow backdrop-blur">
              <Link
                href="/?search=1&focus=1"
                data-coachmark-id="search-bar"
                className="flex min-w-0 flex-1 items-center gap-2"
                aria-label="검색 열기"
              >
                <AppIcon
                  icon={appIconMagnify}
                  className="h-6 w-6 shrink-0 text-black"
                />
                <span
                  className={[
                    "truncate text-sm",
                    hasSearchKeyword ? "text-gray-900" : "text-gray-500",
                  ].join(" ")}
                >
                  {hasSearchKeyword
                    ? normalizedSearchKeyword
                    : "어디로 산책할까요?"}
                </span>
              </Link>
              {showSearchResultClearButton && onClearSearchResults && (
                <button
                  type="button"
                  onClick={onClearSearchResults}
                  aria-label="검색결과 지우기"
                  className="flex h-5 w-5 shrink-0 items-center justify-center"
                >
                  <AppIcon
                    icon={appIconXMark}
                    className="h-3 w-3 text-dg-gray-600"
                  />
                </button>
              )}
            </div>
          </div>

          <div className="pointer-events-auto">{rightSlot}</div>
        </div>
      </div>
      <ToggleChips toggles={toggles} />
    </div>
  );
}
