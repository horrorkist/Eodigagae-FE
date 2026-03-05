import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type MySettingsState = {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
};

const MY_SETTINGS_STORAGE_KEY = "my:settings:v1";

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useMySettingsStore = create<MySettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: false,
      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),
    }),
    {
      name: MY_SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
      }),
    },
  ),
);
