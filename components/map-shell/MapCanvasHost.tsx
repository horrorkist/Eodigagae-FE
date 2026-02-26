"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { MapRuntimeRegistration } from "@/components/map-shell/MapRuntimeProvider";
import { useMapRuntimeRegistration } from "@/hooks/useMapRuntime";
import { useMapViewportStore } from "@/stores/mapViewport";

const NaverMapClient = dynamic(() => import("@/components/NaverMapClient"), {
  ssr: false,
});

export default function MapCanvasHost() {
  const registerRuntime = useMapRuntimeRegistration();
  const focusedSheetHeightPx = useMapViewportStore(
    (s) => s.focusedSheetHeightPx,
  );

  const handleRuntimeChange = useCallback(
    (runtime: MapRuntimeRegistration) => {
      registerRuntime(runtime);
    },
    [registerRuntime],
  );

  return (
    <div
      className="absolute left-0 right-0 top-0 z-0"
      style={{ bottom: focusedSheetHeightPx }}
    >
      <NaverMapClient onRuntimeChange={handleRuntimeChange} />
    </div>
  );
}
