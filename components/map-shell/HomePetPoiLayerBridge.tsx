"use client";

import { useMapPetPoi } from "@/hooks/useMapPetPoi";
import { useMapRuntime } from "@/hooks/useMapRuntime";
import type { PetPoiItem } from "@/types/mapEvents";

export default function HomePetPoiLayerBridge({
  showPetPoi,
  petPois,
}: {
  showPetPoi: boolean;
  petPois: PetPoiItem[];
}) {
  const { mapRef, sdkReady } = useMapRuntime();
  useMapPetPoi(mapRef, sdkReady, showPetPoi, petPois);
  return null;
}
