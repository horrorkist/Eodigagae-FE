import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { WalkHistoryEntry } from "@/lib/walkHistory";

type WalkHistoryState = {
  entries: WalkHistoryEntry[];
  appendEntry: (entry: WalkHistoryEntry) => void;
  clearEntries: () => void;
};

export const WALK_HISTORY_STORAGE_KEY = "walk:history:v1";

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useWalkHistoryStore = create<WalkHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      appendEntry: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries],
        })),
      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: WALK_HISTORY_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({
        entries: state.entries,
      }),
    },
  ),
);
