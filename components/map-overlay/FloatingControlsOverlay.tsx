import FloatingFABMenu from "@/components/FloatingFABMenu";
import type { FABMenuItem } from "@/components/FloatingFABMenu";
import AppIcon from "@/components/icons/AppIcon";
import { appIconLocation } from "@/components/icons/definitions.generated";

type FloatingControlsOverlayProps = {
  isBottomChromeVisible: boolean;
  bottomOffsetPx?: number;
  bottomTransitionMs?: number;
  bottomTransitionEasing?: "linear" | "ease-in-out" | "ease-out";
  leftSlot?: React.ReactNode;
  fabItems: FABMenuItem[];
  onRequestMyLocation: () => void;
};

export default function FloatingControlsOverlay({
  isBottomChromeVisible,
  bottomOffsetPx = 0,
  bottomTransitionMs = 0,
  bottomTransitionEasing = "linear",
  leftSlot,
  fabItems,
  onRequestMyLocation,
}: FloatingControlsOverlayProps) {
  const baseBottomPx = isBottomChromeVisible ? 108 : 24;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 flex items-end justify-between px-3"
      style={{
        bottom: `calc(var(--safe-bottom) + ${baseBottomPx + bottomOffsetPx}px)`,
        transitionProperty: "bottom",
        transitionDuration: `${Math.max(0, Math.round(bottomTransitionMs))}ms`,
        transitionTimingFunction: bottomTransitionEasing,
      }}
    >
      <div className="pointer-events-auto">{leftSlot}</div>

      <div className="flex flex-col items-end space-y-4">
        <FloatingFABMenu items={fabItems} />
        <button
          onClick={onRequestMyLocation}
          className="pointer-events-auto rounded-full w-10 h-10 bg-white p-2 flex items-center justify-center shadow-lg shadow-black/15 overflow-hidden text-dg-black active:bg-dg-green-500 active:text-white"
        >
          <AppIcon icon={appIconLocation} className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
