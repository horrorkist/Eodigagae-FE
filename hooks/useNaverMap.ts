"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";

const FALLBACK = { lat: 37.5665, lng: 126.978 };

export function useNaverMap() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map>(null);
  const [sdkReady, setSdkReady] = useState(false);

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
      typeof coords?.latitude === "number" ? coords.latitude : FALLBACK.lat;
    const lng =
      typeof coords?.longitude === "number" ? coords.longitude : FALLBACK.lng;

    const center = new window.naver.maps.LatLng(lat, lng);

    mapRef.current = new window.naver.maps.Map(elRef.current, {
      center,
      zoom: 15,
      minZoom: 10,
    });
  }, [sdkReady, coords]);

  useEffect(() => {
    initMapOnce();
  }, [initMapOnce]);

  return { mapRef, elRef, sdkReady, setSdkReady };
}
