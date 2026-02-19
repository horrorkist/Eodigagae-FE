"use client";

import BottomNav from "./BottomNav";
import { useUiChromeStore } from "@/stores/uiChrome";
import { usePathname } from "next/navigation";

export default function BottomNavHost() {
  const pathname = usePathname();
  const isBottomChromeVisible = useUiChromeStore(
    (s) => s.isBottomChromeVisible,
  );
  const isOnboardingRoute =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  if (!isBottomChromeVisible || isOnboardingRoute) return null;

  return (
    <div
      className="fixed bottom-0 left-1/2 z-101 w-full max-w-[430px] -translate-x-1/2 bg-white"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <BottomNav />
    </div>
  );
}
