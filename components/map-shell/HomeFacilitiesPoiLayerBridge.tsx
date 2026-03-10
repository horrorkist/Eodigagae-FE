"use client";

import { useMapFacilitiesPoi } from "@/hooks/useMapFacilitiesPoi";
import { useMapRuntime } from "@/hooks/useMapRuntime";
import { useMapStore } from "@/stores/mapStore";
import type { FacilityHomePoiListItem } from "@/types/homePoi";

export default function HomeFacilitiesPoiLayerBridge({
  facilityPois,
}: {
  facilityPois: FacilityHomePoiListItem[];
}) {
  const { mapRef, sdkReady } = useMapRuntime();
  const routeSceneMode = useMapStore((s) => s.routeSceneMode);
  useMapFacilitiesPoi(
    mapRef,
    sdkReady,
    routeSceneMode === "idle" ? facilityPois : [],
  );
  return null;
}
