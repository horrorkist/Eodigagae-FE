"use client";

import { MutableRefObject, useCallback, useEffect, useRef } from "react";
import { PetPoiItem } from "@/types/mapEvents";

export function useMapPetPoi(
  mapRef: MutableRefObject<naver.maps.Map | null>,
  sdkReady: boolean,
  showPetPoi: boolean,
  petPois: PetPoiItem[],
) {
  const petPinMarkersRef = useRef<naver.maps.Marker[]>([]);
  const petLabelMarkersRef = useRef<naver.maps.Marker[]>([]);
  const pendingDrawRef = useRef(false);

  const clearPetMarkers = useCallback(() => {
    for (const m of petLabelMarkersRef.current) m.setMap(null);
    petLabelMarkersRef.current = [];

    for (const m of petPinMarkersRef.current) m.setMap(null);
    petPinMarkersRef.current = [];
  }, []);

  const makeLabelHTML = useCallback((title: string) => {
    const safe = (title ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    return `
      <div style="
        transform: translate(-50%, -120%);
        background: rgba(255,255,255,.92);
        border: 1px solid rgba(0,0,0,.15);
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 12px;
        line-height: 1;
        box-shadow: 0 2px 10px rgba(0,0,0,.12);
        white-space: nowrap;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
      ">${safe}</div>
    `;
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

    for (const it of petPois ?? []) {
      const lng = Number(it.mapx);
      const lat = Number(it.mapy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const pos = new window.naver.maps.LatLng(lat, lng);

      const pin = new window.naver.maps.Marker({
        map: mapRef.current,
        position: pos,
        title: it.title ?? "",
      });

      const label = new window.naver.maps.Marker({
        map: mapRef.current,
        position: pos,
        clickable: false,
        icon: {
          content: makeLabelHTML(it.title ?? ""),
          anchor: new window.naver.maps.Point(0, 0),
        },
        zIndex: 1000,
      });

      petPinMarkersRef.current.push(pin);
      petLabelMarkersRef.current.push(label);
    }

    pendingDrawRef.current = false;
  }, [sdkReady, showPetPoi, petPois, mapRef, clearPetMarkers, makeLabelHTML]);

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
