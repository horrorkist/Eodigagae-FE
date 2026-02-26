type SheetContentMode = "main" | "poi";

const TAB_BUTTON_BASE_CLASS =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors";
const TAB_BUTTON_INACTIVE_CLASS = "text-gray-600 hover:text-gray-800";
const TAB_BUTTON_ACTIVE_CLASS = "bg-white text-gray-900 shadow-sm";

type SheetTabsProps = {
  activeMode: SheetContentMode;
  onMainClick: () => void;
  onPoiClick: () => void;
};

export default function SheetTabs({
  activeMode,
  onMainClick,
  onPoiClick,
}: SheetTabsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
      <button
        type="button"
        onClick={onMainClick}
        className={[
          TAB_BUTTON_BASE_CLASS,
          activeMode === "main" ? TAB_BUTTON_ACTIVE_CLASS : TAB_BUTTON_INACTIVE_CLASS,
        ].join(" ")}
      >
        경로 추천
      </button>
      <button
        type="button"
        onClick={onPoiClick}
        className={[
          TAB_BUTTON_BASE_CLASS,
          activeMode === "poi"
            ? TAB_BUTTON_ACTIVE_CLASS
            : TAB_BUTTON_INACTIVE_CLASS,
        ].join(" ")}
      >
        장소 목록
      </button>
    </div>
  );
}
