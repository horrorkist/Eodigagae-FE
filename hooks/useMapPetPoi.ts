"use client";

import { MutableRefObject, useCallback, useEffect, useRef } from "react";
import { PetPoiItem } from "@/types/mapEvents";
import { buildPinMarkerHTML, buildLabelMarkerHTML } from "@/lib/poiMarker";
import { fromPetPoiItem } from "@/lib/focusedPoi";
import { useMapStore } from "@/stores/mapStore";

export function useMapPetPoi(
  mapRef: MutableRefObject<naver.maps.Map | null>,
  sdkReady: boolean,
  showPetPoi: boolean,
  petPois: PetPoiItem[],
) {
  const setFocusedPoi = useMapStore((s) => s.setFocusedPoi);
  const clearFocusedPoi = useMapStore((s) => s.clearFocusedPoi);
  const petPinMarkersRef = useRef<naver.maps.Marker[]>([]);
  const petLabelMarkersRef = useRef<naver.maps.Marker[]>([]);
  const pinListenersRef = useRef<naver.maps.MapEventListener[]>([]);
  const mapListenerRef = useRef<naver.maps.MapEventListener | null>(null);
  const activeLabelIdxRef = useRef<number | null>(null);
  const pendingDrawRef = useRef(false);

  const hideActiveLabel = useCallback(() => {
    const idx = activeLabelIdxRef.current;
    if (idx !== null && petLabelMarkersRef.current[idx]) {
      petLabelMarkersRef.current[idx].setMap(null);
      activeLabelIdxRef.current = null;
    }
  }, []);

  const clearPetMarkers = useCallback(() => {
    // Remove pin click listeners
    for (const l of pinListenersRef.current) {
      naver.maps.Event.removeListener(l);
    }
    pinListenersRef.current = [];

    // Remove map click listener
    if (mapListenerRef.current) {
      naver.maps.Event.removeListener(mapListenerRef.current);
      mapListenerRef.current = null;
    }

    activeLabelIdxRef.current = null;

    for (const m of petLabelMarkersRef.current) m.setMap(null);
    petLabelMarkersRef.current = [];

    for (const m of petPinMarkersRef.current) m.setMap(null);
    petPinMarkersRef.current = [];
  }, []);

  const drawPetMarkers = useCallback(() => {
    if (!sdkReady) return;
    if (!window.naver?.maps) return;

    if (!showPetPoi) {
      clearPetMarkers();
      return;
    }

    if (!mapRef.current) {
      pendingDrawRef.current = true;
      return;
    }

    clearPetMarkers();

    const map = mapRef.current;

    for (let i = 0; i < (petPois ?? []).length; i++) {
      const it = petPois[i];
      const lng = Number(it.mapx);
      const lat = Number(it.mapy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const pos = new window.naver.maps.LatLng(lat, lng);

      // Custom icon pin marker
      const pin = new window.naver.maps.Marker({
        map,
        position: pos,
        title: it.title ?? "",
        icon: {
          content: buildPinMarkerHTML(it.contenttypeid),
          anchor: new window.naver.maps.Point(0, 0),
        },
      });

      // Label marker — created but NOT placed on map yet
      const label = new window.naver.maps.Marker({
        map: undefined, // hidden initially
        position: pos,
        clickable: false,
        icon: {
          content: buildLabelMarkerHTML(it.title ?? "", it.contenttypeid),
          anchor: new window.naver.maps.Point(0, 0),
        },
        zIndex: 1000,
      });

      // Tap pin → toggle its label
      const idx = petPinMarkersRef.current.length; // capture index
      const listener = naver.maps.Event.addListener(pin, "click", () => {
        if (activeLabelIdxRef.current === idx) {
          // Tapping the same pin hides the label
          label.setMap(null);
          activeLabelIdxRef.current = null;
          clearFocusedPoi();
        } else {
          // Hide previous label
          hideActiveLabel();
          // Show this label
          label.setMap(map);
          activeLabelIdxRef.current = idx;
          setFocusedPoi(fromPetPoiItem(it));
        }
      });

      pinListenersRef.current.push(listener);
      petPinMarkersRef.current.push(pin);
      petLabelMarkersRef.current.push(label);
    }

    // Tap the map background → dismiss active label
    mapListenerRef.current = naver.maps.Event.addListener(
      map,
      "click",
      () => {
        hideActiveLabel();
      },
    );

    pendingDrawRef.current = false;
  }, [
    sdkReady,
    showPetPoi,
    petPois,
    mapRef,
    clearPetMarkers,
    hideActiveLabel,
    clearFocusedPoi,
    setFocusedPoi,
  ]);

  useEffect(() => {
    drawPetMarkers();
  }, [drawPetMarkers]);

  // 지도 생성 후 pending이면 그리기
  useEffect(() => {
    if (mapRef.current && pendingDrawRef.current) {
      queueMicrotask(drawPetMarkers);
    }
  }, [mapRef, sdkReady, drawPetMarkers]);

  useEffect(() => {
    return () => {
      clearPetMarkers();
    };
  }, [clearPetMarkers]);
}
