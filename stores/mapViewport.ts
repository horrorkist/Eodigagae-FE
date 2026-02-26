import { create } from "zustand";

type MapViewportState = {
  bottomSheetOffsetPx: number;
  focusedSheetHeightPx: number;
  setBottomSheetOffsetPx: (px: number) => void;
  resetBottomSheetOffset: () => void;
  setFocusedSheetHeightPx: (px: number) => void;
  resetFocusedSheetHeight: () => void;
};

function toSafeInsetPx(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export const useMapViewportStore = create<MapViewportState>((set) => ({
  bottomSheetOffsetPx: 0,
  focusedSheetHeightPx: 0,
  setBottomSheetOffsetPx: (px) =>
    set({ bottomSheetOffsetPx: toSafeInsetPx(px) }),
  resetBottomSheetOffset: () => set({ bottomSheetOffsetPx: 0 }),
  setFocusedSheetHeightPx: (px) =>
    set({ focusedSheetHeightPx: toSafeInsetPx(px) }),
  resetFocusedSheetHeight: () => set({ focusedSheetHeightPx: 0 }),
}));
