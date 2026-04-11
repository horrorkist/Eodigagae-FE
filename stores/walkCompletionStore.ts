import { create } from "zustand";
import type { WalkCompletionSummary } from "@/types/walkCompletion";

type WalkCompletionState = {
  summary: WalkCompletionSummary | null;
  setSummary: (summary: WalkCompletionSummary) => void;
  clearSummary: () => void;
};

export const useWalkCompletionStore = create<WalkCompletionState>((set) => ({
  summary: null,
  setSummary: (summary) => set({ summary }),
  clearSummary: () => set({ summary: null }),
}));
