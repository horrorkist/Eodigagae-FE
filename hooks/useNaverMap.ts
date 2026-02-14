"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOn } from "./useEventBus";
import { useMapStore } from "@/stores/mapStore";

const FALLBACK = { lat: 37.5665, lng: 126.978 };

export function useNaverMap() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const myPos = useMapStore((s) => s.myPos);

  const { coords } = useGeolocation({
    watch: false,
    immediate: true,
    enableHighAccuracy: true,
  });

  const initMapOnce = useCallback(() => {
    if (!elRef.current) return;
    if (!sdkReady) return;
    if (!window.naver?.maps) return;
    if (mapRef.current) return;

    const lat =
      typeof myPos?.lat === "number"
        ? myPos.lat
        : typeof coords?.latitude === "number"
          ? coords.latitude
          : FALLBACK.lat;
    const lng =
      typeof myPos?.lng === "number"
        ? myPos.lng
        : typeof coords?.longitude === "number"
          ? coords.longitude
          : FALLBACK.lng;

    const center = new window.naver.maps.LatLng(lat, lng);

    mapRef.current = new window.naver.maps.Map(elRef.current, {
      center,
      zoom: 15,
      minZoom: 13,
      disableKineticPan: false,
    });
  }, [sdkReady, coords, myPos]);

  useOn("map", "MOVE_MAP_CENTER", (cmd) => {
    if (!mapRef.current || !window.naver?.maps) return;

    const ll = new window.naver.maps.LatLng(cmd.pos.lat, cmd.pos.lng);

    if (typeof cmd.zoom === "number") mapRef.current.setZoom(cmd.zoom);

    const animate = cmd.animate ?? true;
    if (animate && (mapRef.current as any).panTo)
      (mapRef.current as any).panTo(ll);
    else mapRef.current.setCenter(ll);
  });

  useEffect(() => {
    initMapOnce();
  }, [initMapOnce]);

  return { mapRef, elRef, sdkReady, setSdkReady };
}
