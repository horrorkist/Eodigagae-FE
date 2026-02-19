import { create } from "zustand";
import {
  COACHMARK_COOKIE_NAME,
  COACHMARK_COOKIE_VALUE,
} from "@/lib/onboarding";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

type CoachmarkState = {
  isResolved: boolean;
  isActive: boolean;
  resolveFromCookie: () => void;
  setActive: (active: boolean) => void;
};

export const useCoachmarkStore = create<CoachmarkState>((set) => ({
  isResolved: false,
  isActive: false,
  resolveFromCookie: () =>
    set({
      isResolved: true,
      isActive: readCookie(COACHMARK_COOKIE_NAME) !== COACHMARK_COOKIE_VALUE,
    }),
  setActive: (active) => set({ isResolved: true, isActive: active }),
}));
