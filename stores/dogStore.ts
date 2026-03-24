import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DogBreed, DogInfo } from "@/types/dog";

export type DogInfoFormDraft = {
  name?: string;
  age: number;
  ageUnit: "months" | "years";
  breed: DogBreed;
  walkDistanceKm: number;
  walkDurationMinutes: number;
};

type DogState = {
  dog: DogInfo | null;
  formDraft: DogInfoFormDraft | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setDog: (dog: DogInfo) => void;
  setFormDraft: (draft: DogInfoFormDraft | null) => void;
  clearDog: () => void;
};

const DOG_STORE_STORAGE_KEY = "dog:profile:v1";

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useDogStore = create<DogState>()(
  persist(
    (set) => ({
      dog: null,
      formDraft: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setDog: (dog) => set({ dog }),
      setFormDraft: (draft) => set({ formDraft: draft }),
      clearDog: () => set({ dog: null, formDraft: null }),
    }),
    {
      name: DOG_STORE_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (state) => ({
        dog: state.dog,
        formDraft: state.formDraft,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
