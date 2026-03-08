"use client";

import BottomNav from "./BottomNav";
import RouteFormBottomBar from "./RouteFormBottomBar";
import StartPointBottomBar from "./StartPointBottomBar";
import { useUiChromeStore } from "@/stores/uiChrome";
import { useMapStore } from "@/stores/mapStore";
import { useBottomNavOverrideStore } from "@/stores/bottomNavOverride";
import { usePathname } from "next/navigation";

export default function BottomNavHost() {
  const pathname = usePathname();
  const hasFocusedPoi = useMapStore((s) => s.focusedPoi != null);
  const isBottomChromeVisible = useUiChromeStore(
    (s) => s.isBottomChromeVisible,
  );
  const overrideKind = useBottomNavOverrideStore((s) => s.kind);
  const routeFormCta = useBottomNavOverrideStore((s) => s.routeFormCta);
  const startPointCta = useBottomNavOverrideStore((s) => s.startPointCta);
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
        "fixed bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 bg-white shadow-[0_-6px_18px_rgba(15,23,42,0.08)]",
        hasFocusedPoi ? "z-[113]" : "z-101",
      ].join(" ")}
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      {overrideKind === "route-form-cta" && routeFormCta ? (
        <RouteFormBottomBar
          formId={routeFormCta.formId}
          submitLabel={routeFormCta.submitLabel}
          canSubmit={routeFormCta.canSubmit}
        />
      ) : overrideKind === "start-point-cta" && startPointCta ? (
        <StartPointBottomBar
          backLabel={startPointCta.backLabel}
          confirmLabel={startPointCta.confirmLabel}
          confirmDisabled={startPointCta.confirmDisabled}
          onBack={startPointCta.onBack}
          onConfirm={startPointCta.onConfirm}
        />
      ) : (
        <BottomNav />
      )}
    </div>
  );
}
