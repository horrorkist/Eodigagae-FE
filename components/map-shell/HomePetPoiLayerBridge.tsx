"use client";

import { useMapPetPoi } from "@/hooks/useMapPetPoi";
import { useMapRuntime } from "@/hooks/useMapRuntime";
import { useMapStore } from "@/stores/mapStore";
import type { PetPoiItem } from "@/types/mapEvents";

export default function HomePetPoiLayerBridge({
  showPetPoi,
  petPois,
}: {
  showPetPoi: boolean;
  petPois: PetPoiItem[];
}) {
  const { mapRef, sdkReady } = useMapRuntime();
  const routeSceneMode = useMapStore((s) => s.routeSceneMode);
  useMapPetPoi(mapRef, sdkReady, showPetPoi && routeSceneMode === "idle", petPois);
  return null;
}
