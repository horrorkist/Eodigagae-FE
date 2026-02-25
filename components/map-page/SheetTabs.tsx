type SheetContentMode = "main" | "poi" | "search";

const TAB_BUTTON_BASE_CLASS =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors";
const TAB_BUTTON_INACTIVE_CLASS = "text-gray-600 hover:text-gray-800";
const TAB_BUTTON_ACTIVE_CLASS = "bg-white text-gray-900 shadow-sm";

type SheetTabsProps = {
  activeMode: SheetContentMode;
  canShowPoiTab: boolean;
  canShowSearchTab: boolean;
  onMainClick: () => void;
  onPoiClick: () => void;
  onSearchClick: () => void;
};

export default function SheetTabs({
  activeMode,
  canShowPoiTab,
  canShowSearchTab,
  onMainClick,
  onPoiClick,
  onSearchClick,
}: SheetTabsProps) {
  const tabCount = 1 + (canShowPoiTab ? 1 : 0) + (canShowSearchTab ? 1 : 0);
  const gridClass =
    tabCount >= 3 ? "grid-cols-3" : tabCount === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className={["grid gap-2 rounded-lg bg-gray-100 p-1", gridClass].join(" ")}>
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
      {canShowPoiTab && (
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
      )}
      {canShowSearchTab && (
        <button
          type="button"
          onClick={onSearchClick}
          className={[
            TAB_BUTTON_BASE_CLASS,
            activeMode === "search"
              ? TAB_BUTTON_ACTIVE_CLASS
              : TAB_BUTTON_INACTIVE_CLASS,
          ].join(" ")}
        >
          검색 결과
        </button>
      )}
    </div>
  );
}
