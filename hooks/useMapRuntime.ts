"use client";

import { useContext } from "react";
import { MapRuntimeContext } from "@/components/map-shell/MapRuntimeProvider";

export function useMapRuntime() {
  const context = useContext(MapRuntimeContext);
  if (!context) {
    throw new Error("useMapRuntime must be used within MapRuntimeProvider");
  }

  return {
    mapRef: context.mapRef,
    sdkReady: context.sdkReady,
  };
}

export function useMapRuntimeRegistration() {
  const context = useContext(MapRuntimeContext);
  if (!context) {
    throw new Error(
      "useMapRuntimeRegistration must be used within MapRuntimeProvider",
    );
  }

  return context.registerRuntime;
}
