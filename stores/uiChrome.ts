import { create } from "zustand";

type UiChromeState = {
  isBottomChromeVisible: boolean;
  isBottomSheetCoverEnabled: boolean;
  hideBottomChromeOnNextHome: boolean;
  setBottomChromeVisible: (visible: boolean) => void;
  setBottomSheetCoverEnabled: (enabled: boolean) => void;
  showBottomChrome: () => void;
  hideBottomChrome: () => void;
  requestHideBottomChromeOnNextHome: () => void;
  consumeHideBottomChromeOnNextHome: () => boolean;
};

export const useUiChromeStore = create<UiChromeState>((set, get) => ({
  isBottomChromeVisible: true,
  isBottomSheetCoverEnabled: true,
  hideBottomChromeOnNextHome: false,
  setBottomChromeVisible: (visible) => set({ isBottomChromeVisible: visible }),
  setBottomSheetCoverEnabled: (enabled) =>
    set({ isBottomSheetCoverEnabled: enabled }),
  showBottomChrome: () => set({ isBottomChromeVisible: true }),
  hideBottomChrome: () => set({ isBottomChromeVisible: false }),
  requestHideBottomChromeOnNextHome: () =>
    set({ hideBottomChromeOnNextHome: true }),
  consumeHideBottomChromeOnNextHome: () => {
    const shouldHide = get().hideBottomChromeOnNextHome;
    if (shouldHide) {
      set({ hideBottomChromeOnNextHome: false });
    }
    return shouldHide;
  },
}));
