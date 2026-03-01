import { create } from "zustand";

type UiChromeState = {
  isBottomChromeVisible: boolean;
  setBottomChromeVisible: (visible: boolean) => void;
  showBottomChrome: () => void;
  hideBottomChrome: () => void;
};

export const useUiChromeStore = create<UiChromeState>((set) => ({
  isBottomChromeVisible: true,
  setBottomChromeVisible: (visible) => set({ isBottomChromeVisible: visible }),
  showBottomChrome: () => set({ isBottomChromeVisible: true }),
  hideBottomChrome: () => set({ isBottomChromeVisible: false }),
}));
