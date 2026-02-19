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

function getInitialCoachmarkActive() {
  return readCookie(COACHMARK_COOKIE_NAME) !== COACHMARK_COOKIE_VALUE;
}

type CoachmarkState = {
  isActive: boolean;
  setActive: (active: boolean) => void;
};

export const useCoachmarkStore = create<CoachmarkState>((set) => ({
  isActive: getInitialCoachmarkActive(),
  setActive: (active) => set({ isActive: active }),
}));
