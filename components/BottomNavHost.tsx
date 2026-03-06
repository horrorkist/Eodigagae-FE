"use client";

import BottomNav from "./BottomNav";
import { useUiChromeStore } from "@/stores/uiChrome";
import { useMapStore } from "@/stores/mapStore";
import { usePathname } from "next/navigation";

export default function BottomNavHost() {
  const pathname = usePathname();
  const hasFocusedPoi = useMapStore((s) => s.focusedPoi != null);
  const isBottomChromeVisible = useUiChromeStore(
    (s) => s.isBottomChromeVisible,
  );
  const isOnboardingRoute =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isSupportSubRoute =
    pathname === "/my/support/notices" ||
    pathname === "/my/support/report" ||
    pathname === "/my/support/feedback";

  if (!isBottomChromeVisible || isOnboardingRoute || isSupportSubRoute) {
    return null;
  }

  return (
    <div
      data-coachmark-id="bottom-nav-host"
      className={[
        "fixed bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 bg-white",
        hasFocusedPoi ? "z-[113]" : "z-101",
      ].join(" ")}
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <BottomNav />
    </div>
  );
}
