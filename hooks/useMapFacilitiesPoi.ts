"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { buildFacilityPinMarkerHTML } from "@/lib/facilityMarker";
import {
  normalizeFacilityPoisForMarkers,
  type NormalizedFacilityMarkerPoi,
} from "@/lib/facilityPoiNormalization";
import { fromHomePoiListItem } from "@/lib/focusedPoi";
import {
  createOrUpdateClusterer,
  disposeClusterer,
} from "@/lib/naverMarkerCluster";
import {
  FACILITY_CLUSTER_Z_INDEX,
  FACILITY_MARKER_Z_INDEX,
} from "@/lib/mapMarkerZIndex";
import { useMapStore } from "@/stores/mapStore";
import type { FacilityHomePoiListItem } from "@/types/homePoi";

type MarkerEntry = {
  key: string;
  poi: FacilityHomePoiListItem;
  lat: number;
  lng: number;
  marker: naver.maps.Marker;
  listener: naver.maps.MapEventListener;
};

const FACILITY_LAYER_REGISTRY_KEY = "__facilityLayerRegistry";

type FacilityLayerRegistry = {
  markers: Set<naver.maps.Marker>;
  listeners: Set<naver.maps.MapEventListener>;
  clusterers: Set<MarkerClustering>;
};

function createFacilityLayerRegistry(): FacilityLayerRegistry {
  return {
    markers: new Set<naver.maps.Marker>(),
    listeners: new Set<naver.maps.MapEventListener>(),
    clusterers: new Set<MarkerClustering>(),
  };
}

function getFacilityLayerRegistry(): FacilityLayerRegistry {
  if (typeof window === "undefined") {
    return createFacilityLayerRegistry();
  }

  const win = window as unknown as {
    [FACILITY_LAYER_REGISTRY_KEY]?: FacilityLayerRegistry;
  };
  if (!win[FACILITY_LAYER_REGISTRY_KEY]) {
    win[FACILITY_LAYER_REGISTRY_KEY] = createFacilityLayerRegistry();
  }

  return win[FACILITY_LAYER_REGISTRY_KEY]!;
}

function removeListenerSafe(listener: naver.maps.MapEventListener) {
  if (!window.naver?.maps) return;
  naver.maps.Event.removeListener(listener);
}

function clearFacilityGlobalRegistry() {
  const registry = getFacilityLayerRegistry();

  for (const listener of registry.listeners) {
    removeListenerSafe(listener);
  }
  registry.listeners.clear();

  for (const marker of registry.markers) {
    marker.setMap(null);
  }
  registry.markers.clear();

  for (const clusterer of registry.clusterers) {
    if (typeof clusterer.setMap === "function") {
      clusterer.setMap(null);
    }
    if (typeof clusterer.clear === "function") {
      clusterer.clear();
    }
    if (typeof clusterer.setMarkers === "function") {
      clusterer.setMarkers([]);
    }
  }
  registry.clusterers.clear();
}

export function useMapFacilitiesPoi(
  mapRef: RefObject<naver.maps.Map | null>,
  sdkReady: boolean,
  facilityPois: FacilityHomePoiListItem[],
) {
  const setFocusedPoi = useMapStore((s) => s.setFocusedPoi);
  const markerEntriesRef = useRef<Map<string, MarkerEntry>>(new Map());
  const fountainClustererRef = useRef<MarkerClustering | null>(null);
  const trashBinClustererRef = useRef<MarkerClustering | null>(null);
  const pendingSyncRef = useRef(false);

  const removeEntry = useCallback((key: string) => {
    const entry = markerEntriesRef.current.get(key);
    if (!entry) return;
    const registry = getFacilityLayerRegistry();

    removeListenerSafe(entry.listener);
    entry.marker.setMap(null);
    registry.listeners.delete(entry.listener);
    registry.markers.delete(entry.marker);
    markerEntriesRef.current.delete(key);
  }, []);

  const clearAllMarkers = useCallback(() => {
    for (const key of Array.from(markerEntriesRef.current.keys())) {
      removeEntry(key);
    }

    disposeClusterer(fountainClustererRef);
    disposeClusterer(trashBinClustererRef);
    clearFacilityGlobalRegistry();
    pendingSyncRef.current = false;
  }, [removeEntry]);

  const updateExistingEntry = useCallback(
    (entry: MarkerEntry, next: NormalizedFacilityMarkerPoi) => {
      const moved = entry.lat !== next.lat || entry.lng !== next.lng;
      const titleChanged = entry.poi.title !== next.poi.title;
      const sourceChanged = entry.poi.source !== next.poi.source;

      entry.marker.setZIndex(FACILITY_MARKER_Z_INDEX);

      if (moved) {
        entry.marker.setPosition(new window.naver.maps.LatLng(next.lat, next.lng));
      }

      if (titleChanged) {
        entry.marker.setTitle(next.poi.title ?? "");
      }

      if (titleChanged || sourceChanged) {
        entry.marker.setIcon({
          content: buildFacilityPinMarkerHTML(next.poi.source, next.poi.title),
          anchor: new window.naver.maps.Point(0, 0),
        });
      }

      entry.poi = next.poi;
      entry.lat = next.lat;
      entry.lng = next.lng;
    },
    [],
  );

  const createEntry = useCallback(
    (next: NormalizedFacilityMarkerPoi, map: naver.maps.Map): MarkerEntry => {
      const marker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(next.lat, next.lng),
        title: next.poi.title ?? "",
        icon: {
          content: buildFacilityPinMarkerHTML(next.poi.source, next.poi.title),
          anchor: new window.naver.maps.Point(0, 0),
        },
        zIndex: FACILITY_MARKER_Z_INDEX,
      });

      const key = next.key;
      const listener = naver.maps.Event.addListener(marker, "click", () => {
        const current = markerEntriesRef.current.get(key);
        if (!current) return;
        setFocusedPoi(fromHomePoiListItem(current.poi));
      });
      const registry = getFacilityLayerRegistry();
      registry.markers.add(marker);
      registry.listeners.add(listener);

      return {
        key,
        poi: next.poi,
        lat: next.lat,
        lng: next.lng,
        marker,
        listener,
      };
    },
    [setFocusedPoi],
  );

  const syncMarkers = useCallback(() => {
    if (facilityPois.length === 0) {
      clearAllMarkers();
      return;
    }

    if (!sdkReady || !window.naver?.maps) return;

    if (!mapRef.current) {
      pendingSyncRef.current = true;
      return;
    }

    const map = mapRef.current;
    const normalized = normalizeFacilityPoisForMarkers(facilityPois);
    const nextKeySet = new Set(normalized.map((item) => item.key));

    for (const key of Array.from(markerEntriesRef.current.keys())) {
      if (!nextKeySet.has(key)) {
        removeEntry(key);
      }
    }

    for (const next of normalized) {
      const existing = markerEntriesRef.current.get(next.key);
      if (existing) {
        updateExistingEntry(existing, next);
        continue;
      }

      const created = createEntry(next, map);
      markerEntriesRef.current.set(created.key, created);
    }

    const fountainMarkers: naver.maps.Marker[] = [];
    const trashBinMarkers: naver.maps.Marker[] = [];

    for (const entry of markerEntriesRef.current.values()) {
      if (entry.poi.source === "fountain") {
        fountainMarkers.push(entry.marker);
      } else {
        trashBinMarkers.push(entry.marker);
      }
    }

    const fountainClusterer = createOrUpdateClusterer({
      clustererRef: fountainClustererRef,
      map,
      markers: fountainMarkers,
      source: "fountain",
      zIndex: FACILITY_CLUSTER_Z_INDEX,
    });
    const trashBinClusterer = createOrUpdateClusterer({
      clustererRef: trashBinClustererRef,
      map,
      markers: trashBinMarkers,
      source: "trash-bin",
      zIndex: FACILITY_CLUSTER_Z_INDEX,
    });

    const registry = getFacilityLayerRegistry();
    registry.clusterers.clear();
    if (fountainClusterer) {
      registry.clusterers.add(fountainClusterer);
    }
    if (trashBinClusterer) {
      registry.clusterers.add(trashBinClusterer);
    }

    pendingSyncRef.current = false;
  }, [
    clearAllMarkers,
    createEntry,
    facilityPois,
    mapRef,
    removeEntry,
    sdkReady,
    updateExistingEntry,
  ]);

  useEffect(() => {
    // Sweep possible orphan markers/listeners/clusterers from previous hook instances.
    clearFacilityGlobalRegistry();
  }, []);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  useEffect(() => {
    if (facilityPois.length === 0) {
      clearAllMarkers();
    }
  }, [clearAllMarkers, facilityPois.length]);

  useEffect(() => {
    if (mapRef.current && pendingSyncRef.current) {
      queueMicrotask(syncMarkers);
    }
  }, [mapRef, sdkReady, syncMarkers]);

  useEffect(() => {
    return () => {
      clearAllMarkers();
    };
  }, [clearAllMarkers]);
}
