import FloatingFABMenu from "@/components/FloatingFABMenu";
import type { FABMenuItem } from "@/components/FloatingFABMenu";
import AppIcon from "@/components/icons/AppIcon";
import { appIconLocation } from "@/components/icons/definitions.generated";

type FloatingControlsOverlayProps = {
  isBottomChromeVisible: boolean;
  fabItems: FABMenuItem[];
  onRequestMyLocation: () => void;
};

export default function FloatingControlsOverlay({
  isBottomChromeVisible,
  fabItems,
  onRequestMyLocation,
}: FloatingControlsOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute right-3 flex flex-col items-end space-y-4"
      style={{
        bottom: `calc(var(--safe-bottom) + ${isBottomChromeVisible ? 108 : 24}px)`,
      }}
    >
      <FloatingFABMenu items={fabItems} />
      <button
        onClick={onRequestMyLocation}
        className="pointer-events-auto rounded-full w-10 h-10 bg-white p-2 flex items-center justify-center shadow-lg shadow-black/15 overflow-hidden text-dg-black active:bg-dg-green-500 active:text-white"
      >
        <AppIcon icon={appIconLocation} className="w-5 h-5" />
      </button>
    </div>
  );
}
