import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  generateMockWalkHistoryEntries,
  type WalkHistoryEntry,
} from "@/lib/walkHistory";

export type HistoryDataSource = "actual" | "mock";

type MySettingsState = {
  notificationsEnabled: boolean;
  historyDataSource: HistoryDataSource;
  mockHistoryEntries: WalkHistoryEntry[];
  setNotificationsEnabled: (enabled: boolean) => void;
  setHistoryDataSource: (source: HistoryDataSource) => void;
  regenerateMockHistory: (now?: Date) => void;
  resetSettings: () => void;
};

export const MY_SETTINGS_STORAGE_KEY = "my:settings:v1";

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useMySettingsStore = create<MySettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: false,
      historyDataSource: "mock",
      mockHistoryEntries: generateMockWalkHistoryEntries(new Date()),
      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),
      setHistoryDataSource: (source) => set({ historyDataSource: source }),
      regenerateMockHistory: (now = new Date()) =>
        set({ mockHistoryEntries: generateMockWalkHistoryEntries(now) }),
      resetSettings: () =>
        set({
          notificationsEnabled: false,
          historyDataSource: "mock",
          mockHistoryEntries: generateMockWalkHistoryEntries(new Date()),
        }),
    }),
    {
      name: MY_SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
        historyDataSource: state.historyDataSource,
        mockHistoryEntries: state.mockHistoryEntries,
      }),
    },
  ),
);
