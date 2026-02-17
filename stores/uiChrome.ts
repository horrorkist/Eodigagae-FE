import { create } from "zustand";

type UiChromeState = {
  isBottomChromeVisible: boolean;
  isBottomSheetCoverEnabled: boolean;
  setBottomChromeVisible: (visible: boolean) => void;
  setBottomSheetCoverEnabled: (enabled: boolean) => void;
  showBottomChrome: () => void;
  hideBottomChrome: () => void;
};

export const useUiChromeStore = create<UiChromeState>((set) => ({
  isBottomChromeVisible: true,
  isBottomSheetCoverEnabled: true,
  setBottomChromeVisible: (visible) => set({ isBottomChromeVisible: visible }),
  setBottomSheetCoverEnabled: (enabled) =>
    set({ isBottomSheetCoverEnabled: enabled }),
  showBottomChrome: () => set({ isBottomChromeVisible: true }),
  hideBottomChrome: () => set({ isBottomChromeVisible: false }),
}));
