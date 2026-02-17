// stores/bottomSheet.ts
import { RefObject } from "react";
import { create } from "zustand";
import { useUiChromeStore } from "@/stores/uiChrome";

type BottomSheetState = {
  snapPoints: number[];
  index: number; // 마지막 스냅 유지 (0..n-1)
  isOpen: boolean; // 열림/닫힘은 따로 관리
  setSnapPoints: (points: number[]) => void;
  open: (toIndex?: number) => void;
  snapTo: (toIndex: number) => void;
  close: (bottomSheetRef?: RefObject<HTMLDivElement | null>) => void;
};

const DEFAULT_SNAP_POINTS = [120, 360, 620];

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

export const useBottomSheetStore = create<BottomSheetState>((set, get) => ({
  snapPoints: DEFAULT_SNAP_POINTS,
  index: 0,
  isOpen: false,

  setSnapPoints: (points) => {
    const sorted = [...points].sort((a, b) => a - b);
    set({ snapPoints: sorted });
    set((s) => ({ index: clamp(s.index, 0, Math.max(sorted.length - 1, 0)) }));
  },

  open: (toIndex) => {
    const { isBottomChromeVisible } = useUiChromeStore.getState();
    if (!isBottomChromeVisible) return;

    const { snapPoints } = get();
    if (snapPoints.length === 0) return;
    const next = clamp(toIndex ?? 0, 0, snapPoints.length - 1);
    set({ index: next, isOpen: true });
  },

  snapTo: (toIndex) => {
    const { snapPoints } = get();
    if (snapPoints.length === 0) return;
    const next = clamp(toIndex, 0, snapPoints.length - 1);
    set({ index: next }); // 열려있을 때 단계만 변경
  },

  close: (bottomSheetRef) => {
    const { isOpen } = get();
    if (!isOpen) return;

    set({ isOpen: false });
    if (bottomSheetRef && bottomSheetRef.current) {
      const elements = bottomSheetRef.current.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
      >("input, textarea");
      elements.forEach((element) => {
        element.blur();
      });
    }
  }, // index는 그대로 둔다!
}));
