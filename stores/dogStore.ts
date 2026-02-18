import { create } from "zustand";
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
  setDog: (dog: DogInfo) => void;
  setFormDraft: (draft: DogInfoFormDraft | null) => void;
  clearDog: () => void;
};

export const useDogStore = create<DogState>((set) => ({
  dog: null,
  formDraft: null,
  setDog: (dog) => set({ dog }),
  setFormDraft: (draft) => set({ formDraft: draft }),
  clearDog: () => set({ dog: null, formDraft: null }),
}));
