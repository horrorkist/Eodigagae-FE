"use client";

import { MutableRefObject, useCallback, useEffect, useRef } from "react";
import { PetPoiItem } from "@/types/mapEvents";
import { buildPinMarkerHTML, buildLabelMarkerHTML } from "@/lib/poiMarker";
import { fromPetPoiItem } from "@/lib/focusedPoi";
import { useMapStore } from "@/stores/mapStore";

type MarkerEntry = {
  key: string;
  item: PetPoiItem;
  lat: number;
  lng: number;
  pin: naver.maps.Marker;
  label: naver.maps.Marker;
  listener: naver.maps.MapEventListener;
};

type NormalizedPoi = {
  key: string;
  item: PetPoiItem;
  lat: number;
  lng: number;
};

function toPoiKey(item: PetPoiItem) {
  const contentId = String(item.contentid ?? "").trim();
  if (contentId) return `contentid:${contentId}`;
  return `fallback:${item.mapx}:${item.mapy}:${item.title ?? ""}:${item.contenttypeid ?? ""}`;
}

function toNormalizedPoi(item: PetPoiItem): NormalizedPoi | null {
  const lng = Number(item.mapx);
  const lat = Number(item.mapy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    key: toPoiKey(item),
    item,
    lat,
    lng,
  };
}

export function useMapPetPoi(
  mapRef: MutableRefObject<naver.maps.Map | null>,
  sdkReady: boolean,
  showPetPoi: boolean,
  petPois: PetPoiItem[],
) {
  const setFocusedPoi = useMapStore((s) => s.setFocusedPoi);
  const clearFocusedPoi = useMapStore((s) => s.clearFocusedPoi);
  const markerEntriesRef = useRef<Map<string, MarkerEntry>>(new Map());
  const mapListenerRef = useRef<naver.maps.MapEventListener | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const pendingSyncRef = useRef(false);

  const hideActiveLabel = useCallback(() => {
    const activeKey = activeKeyRef.current;
    if (!activeKey) return;
    const activeEntry = markerEntriesRef.current.get(activeKey);
    if (!activeEntry) {
      activeKeyRef.current = null;
      return;
    }

    activeEntry.label.setMap(null);
    activeKeyRef.current = null;
  }, []);

  const removeEntry = useCallback((key: string) => {
    const entry = markerEntriesRef.current.get(key);
    if (!entry) return;

    naver.maps.Event.removeListener(entry.listener);
    entry.label.setMap(null);
    entry.pin.setMap(null);
    markerEntriesRef.current.delete(key);

    if (activeKeyRef.current === key) {
      activeKeyRef.current = null;
    }
  }, []);

  const clearAllMarkers = useCallback(() => {
    for (const key of markerEntriesRef.current.keys()) {
      removeEntry(key);
    }

    if (mapListenerRef.current) {
      naver.maps.Event.removeListener(mapListenerRef.current);
      mapListenerRef.current = null;
    }

    activeKeyRef.current = null;
  }, [removeEntry]);

  const ensureMapClickListener = useCallback(
    (map: naver.maps.Map) => {
      if (mapListenerRef.current) return;

      mapListenerRef.current = naver.maps.Event.addListener(
        map,
        "click",
        () => {
          hideActiveLabel();
        },
      );
    },
    [hideActiveLabel],
  );

  const updateExistingEntry = useCallback(
    (entry: MarkerEntry, next: NormalizedPoi, map: naver.maps.Map) => {
      const moved = entry.lat !== next.lat || entry.lng !== next.lng;
      const titleChanged = entry.item.title !== next.item.title;
      const typeChanged = entry.item.contenttypeid !== next.item.contenttypeid;

      if (moved) {
        const pos = new window.naver.maps.LatLng(next.lat, next.lng);
        entry.pin.setPosition(pos);
        entry.label.setPosition(pos);
      }

      if (titleChanged) {
        entry.pin.setTitle(next.item.title ?? "");
      }

      if (titleChanged || typeChanged) {
        entry.pin.setIcon({
          content: buildPinMarkerHTML(next.item.contenttypeid),
          anchor: new window.naver.maps.Point(0, 0),
        });
        entry.label.setIcon({
          content: buildLabelMarkerHTML(
            next.item.title ?? "",
            next.item.contenttypeid,
          ),
          anchor: new window.naver.maps.Point(0, 0),
        });
      }

      if (entry.pin.getMap() !== map) {
        entry.pin.setMap(map);
      }

      entry.item = next.item;
      entry.lat = next.lat;
      entry.lng = next.lng;
    },
    [],
  );

  const createEntry = useCallback(
    (next: NormalizedPoi, map: naver.maps.Map): MarkerEntry => {
      const pos = new window.naver.maps.LatLng(next.lat, next.lng);

      const pin = new window.naver.maps.Marker({
        map,
        position: pos,
        title: next.item.title ?? "",
        icon: {
          content: buildPinMarkerHTML(next.item.contenttypeid),
          anchor: new window.naver.maps.Point(0, 0),
        },
      });

      const label = new window.naver.maps.Marker({
        map: undefined,
        position: pos,
        clickable: false,
        icon: {
          content: buildLabelMarkerHTML(
            next.item.title ?? "",
            next.item.contenttypeid,
          ),
          anchor: new window.naver.maps.Point(0, 0),
        },
        zIndex: 1000,
      });

      const key = next.key;
      const listener = naver.maps.Event.addListener(pin, "click", () => {
        const current = markerEntriesRef.current.get(key);
        if (!current) return;

        if (activeKeyRef.current === key) {
          current.label.setMap(null);
          activeKeyRef.current = null;
          clearFocusedPoi();
          return;
        }

        hideActiveLabel();
        current.label.setMap(map);
        activeKeyRef.current = key;
        setFocusedPoi(fromPetPoiItem(current.item));
      });

      return {
        key,
        item: next.item,
        lat: next.lat,
        lng: next.lng,
        pin,
        label,
        listener,
      };
    },
    [clearFocusedPoi, hideActiveLabel, setFocusedPoi],
  );

  const syncPetMarkers = useCallback(() => {
    if (!sdkReady || !window.naver?.maps) return;

    if (!showPetPoi) {
      clearAllMarkers();
      return;
    }

    if (!mapRef.current) {
      pendingSyncRef.current = true;
      return;
    }

    const map = mapRef.current;
    ensureMapClickListener(map);

    const normalized: NormalizedPoi[] = [];
    const nextKeySet = new Set<string>();

    for (const item of petPois ?? []) {
      const normalizedPoi = toNormalizedPoi(item);
      if (!normalizedPoi) continue;
      if (nextKeySet.has(normalizedPoi.key)) continue;

      normalized.push(normalizedPoi);
      nextKeySet.add(normalizedPoi.key);
    }

    for (const key of Array.from(markerEntriesRef.current.keys())) {
      if (!nextKeySet.has(key)) {
        removeEntry(key);
      }
    }

    for (const next of normalized) {
      const existing = markerEntriesRef.current.get(next.key);
      if (existing) {
        updateExistingEntry(existing, next, map);
        continue;
      }

      const created = createEntry(next, map);
      markerEntriesRef.current.set(created.key, created);
    }

    pendingSyncRef.current = false;
  }, [
    sdkReady,
    showPetPoi,
    clearAllMarkers,
    mapRef,
    ensureMapClickListener,
    petPois,
    removeEntry,
    updateExistingEntry,
    createEntry,
  ]);

  useEffect(() => {
    syncPetMarkers();
  }, [syncPetMarkers]);

  useEffect(() => {
    if (mapRef.current && pendingSyncRef.current) {
      queueMicrotask(syncPetMarkers);
    }
  }, [mapRef, sdkReady, syncPetMarkers]);

  useEffect(() => {
    return () => {
      clearAllMarkers();
    };
  }, [clearAllMarkers]);
}

