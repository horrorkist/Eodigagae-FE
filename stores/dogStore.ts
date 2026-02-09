import { create } from "zustand";
import type { DogInfo } from "@/types/dog";

type DogState = {
  dog: DogInfo | null;
  setDog: (dog: DogInfo) => void;
  clearDog: () => void;
};

export const useDogStore = create<DogState>((set) => ({
  dog: null,
  setDog: (dog) => set({ dog }),
  clearDog: () => set({ dog: null }),
}));
