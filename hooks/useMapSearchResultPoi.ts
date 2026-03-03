"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { appIconMapPin } from "@/components/icons/definitions.generated";
import { fromTmapPoi } from "@/lib/focusedPoi";
import { buildMarkerShellHTML } from "@/lib/markerShell";
import {
  createOrUpdateClusterer,
  disposeClusterer,
} from "@/lib/naverMarkerCluster";
import { useMapStore } from "@/stores/mapStore";
import type { TmapPoi } from "@/types/tmapPoi";

type MarkerEntry = {
  key: string;
  poi: TmapPoi;
  lat: number;
  lng: number;
  marker: naver.maps.Marker;
  listener: naver.maps.MapEventListener;
};

type NormalizedPoi = {
  key: string;
  poi: TmapPoi;
  lat: number;
  lng: number;
};

const SEARCH_RESULT_MARKER_COLOR = "#4b5563";

function buildSearchResultMarkerHTML(title = "") {
  return buildMarkerShellHTML({
    wrapperColor: SEARCH_RESULT_MARKER_COLOR,
    innerIconBody: appIconMapPin.body,
    innerIconViewBox: appIconMapPin.viewBox,
    innerIconColor: "#ffffff",
    title,
  });
}

function toPoiKey(poi: TmapPoi) {
  const id = String(poi.id ?? "").trim();
  if (id) return `tmap:${id}`;
  return `fallback:${poi.lat}:${poi.lng}:${poi.name}`;
}

function toNormalizedPoi(poi: TmapPoi): NormalizedPoi | null {
  const lat = Number(poi.lat);
  const lng = Number(poi.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    key: toPoiKey(poi),
    poi,
    lat,
    lng,
  };
}

function normalizePois(pois: TmapPoi[]): NormalizedPoi[] {
  const out: NormalizedPoi[] = [];
  const seen = new Set<string>();

  for (const poi of pois) {
    const normalized = toNormalizedPoi(poi);
    if (!normalized) continue;
    if (seen.has(normalized.key)) continue;
    seen.add(normalized.key);
    out.push(normalized);
  }

  return out;
}

export function useMapSearchResultPoi(
  mapRef: RefObject<naver.maps.Map | null>,
  sdkReady: boolean,
  submittedSearchPois: TmapPoi[],
  submittedSearchSeq: number,
) {
  const setFocusedPoi = useMapStore((s) => s.setFocusedPoi);
  const markerEntriesRef = useRef<Map<string, MarkerEntry>>(new Map());
  const clustererRef = useRef<MarkerClustering | null>(null);
  const pendingMarkerSyncRef = useRef(false);
  const pendingCameraSyncRef = useRef(false);
  const lastCameraSeqRef = useRef(0);

  const removeEntry = useCallback((key: string) => {
    const entry = markerEntriesRef.current.get(key);
    if (!entry) return;

    naver.maps.Event.removeListener(entry.listener);
    entry.marker.setMap(null);
    markerEntriesRef.current.delete(key);
  }, []);

  const clearAllMarkers = useCallback(() => {
    for (const key of markerEntriesRef.current.keys()) {
      removeEntry(key);
    }
    disposeClusterer(clustererRef);
  }, [removeEntry]);

  const updateExistingEntry = useCallback(
    (entry: MarkerEntry, next: NormalizedPoi) => {
      const moved = entry.lat !== next.lat || entry.lng !== next.lng;
      const titleChanged = entry.poi.name !== next.poi.name;

      if (moved) {
        entry.marker.setPosition(new window.naver.maps.LatLng(next.lat, next.lng));
      }

      if (titleChanged) {
        entry.marker.setTitle(next.poi.name ?? "");
        entry.marker.setIcon({
          content: buildSearchResultMarkerHTML(next.poi.name ?? ""),
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
    (next: NormalizedPoi, map: naver.maps.Map): MarkerEntry => {
      const marker = new window.naver.maps.Marker({
        map,
        position: new window.naver.maps.LatLng(next.lat, next.lng),
        title: next.poi.name ?? "",
        icon: {
          content: buildSearchResultMarkerHTML(next.poi.name ?? ""),
          anchor: new window.naver.maps.Point(0, 0),
        },
        zIndex: 1100,
      });

      const key = next.key;
      const listener = naver.maps.Event.addListener(marker, "click", () => {
        const current = markerEntriesRef.current.get(key);
        if (!current) return;
        setFocusedPoi(fromTmapPoi(current.poi));
      });

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
    if (!sdkReady || !window.naver?.maps) return;

    if (!mapRef.current) {
      pendingMarkerSyncRef.current = true;
      return;
    }

    const map = mapRef.current;
    const normalized = normalizePois(submittedSearchPois);
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

    createOrUpdateClusterer({
      clustererRef,
      map,
      markers: Array.from(markerEntriesRef.current.values()).map(
        (entry) => entry.marker,
      ),
      source: "tmap",
      zIndex: 1090,
    });

    pendingMarkerSyncRef.current = false;
  }, [
    createEntry,
    mapRef,
    removeEntry,
    sdkReady,
    submittedSearchPois,
    updateExistingEntry,
  ]);

  const syncCamera = useCallback(() => {
    if (submittedSearchSeq === lastCameraSeqRef.current) return;
    if (!sdkReady || !window.naver?.maps) return;

    if (!mapRef.current) {
      pendingCameraSyncRef.current = true;
      return;
    }

    const map = mapRef.current;
    const normalized = normalizePois(submittedSearchPois);

    if (normalized.length === 1) {
      const target = normalized[0];
      const center = new window.naver.maps.LatLng(target.lat, target.lng);
      if (map.getZoom() < 16) map.setZoom(16);
      map.panTo(center);
    } else if (normalized.length > 1) {
      const points = normalized.map(
        (item) => new window.naver.maps.LatLng(item.lat, item.lng),
      );
      map.fitBounds(points, {
        top: 72,
        right: 40,
        bottom: 140,
        left: 40,
      });
    }

    lastCameraSeqRef.current = submittedSearchSeq;
    pendingCameraSyncRef.current = false;
  }, [mapRef, sdkReady, submittedSearchPois, submittedSearchSeq]);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  useEffect(() => {
    syncCamera();
  }, [syncCamera]);

  useEffect(() => {
    if (mapRef.current && pendingMarkerSyncRef.current) {
      queueMicrotask(syncMarkers);
    }
    if (mapRef.current && pendingCameraSyncRef.current) {
      queueMicrotask(syncCamera);
    }
  }, [mapRef, sdkReady, syncCamera, syncMarkers]);

  useEffect(() => {
    return () => {
      clearAllMarkers();
    };
  }, [clearAllMarkers]);
}
