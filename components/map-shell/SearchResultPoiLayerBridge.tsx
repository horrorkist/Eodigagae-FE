"use client";

import { useMapSearchResultPoi } from "@/hooks/useMapSearchResultPoi";
import { useMapRuntime } from "@/hooks/useMapRuntime";
import { useMapStore } from "@/stores/mapStore";

export default function SearchResultPoiLayerBridge() {
  const { mapRef, sdkReady } = useMapRuntime();
  const submittedSearchPois = useMapStore((s) => s.submittedSearchPois);
  const submittedSearchSeq = useMapStore((s) => s.submittedSearchSeq);

  useMapSearchResultPoi(
    mapRef,
    sdkReady,
    submittedSearchPois,
    submittedSearchSeq,
  );

  return null;
}
