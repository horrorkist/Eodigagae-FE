"use client";

import { useMapFacilitiesPoi } from "@/hooks/useMapFacilitiesPoi";
import { useMapRuntime } from "@/hooks/useMapRuntime";
import type { FacilityHomePoiListItem } from "@/types/homePoi";

export default function HomeFacilitiesPoiLayerBridge({
  facilityPois,
}: {
  facilityPois: FacilityHomePoiListItem[];
}) {
  const { mapRef, sdkReady } = useMapRuntime();
  useMapFacilitiesPoi(mapRef, sdkReady, facilityPois);
  return null;
}
