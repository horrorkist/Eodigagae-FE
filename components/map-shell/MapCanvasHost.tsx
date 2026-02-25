"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { MapRuntimeRegistration } from "@/components/map-shell/MapRuntimeProvider";
import { useMapRuntimeRegistration } from "@/hooks/useMapRuntime";

const NaverMapClient = dynamic(() => import("@/components/NaverMapClient"), {
  ssr: false,
});

export default function MapCanvasHost() {
  const registerRuntime = useMapRuntimeRegistration();

  const handleRuntimeChange = useCallback(
    (runtime: MapRuntimeRegistration) => {
      registerRuntime(runtime);
    },
    [registerRuntime],
  );

  return (
    <div className="absolute inset-0 z-0">
      <NaverMapClient onRuntimeChange={handleRuntimeChange} />
    </div>
  );
}
