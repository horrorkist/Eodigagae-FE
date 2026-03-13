"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RefObject } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchTmapReverseGeocode } from "@/services/tmapReverseGeocode";
import type { LatLng } from "@/types/mapEvents";

const ADDRESS_LOADING_TEXT = "주소를 확인하는 중...";
const ADDRESS_ERROR_TEXT = "주소를 확인할 수 없어요";
const CENTER_DEBOUNCE_MS = 300;

function isLatLngCoord(
  coord: naver.maps.Coord | null | undefined,
): coord is naver.maps.LatLng {
  if (!coord) return false;

  return (
    "lat" in coord &&
    "lng" in coord &&
    typeof coord.lat === "function" &&
    typeof coord.lng === "function"
  );
}

function toCoordKey(center: LatLng) {
  return `${center.lat.toFixed(7)}:${center.lng.toFixed(7)}`;
}

type UseStartPointAddressParams = {
  mapRef: RefObject<naver.maps.Map | null>;
  sdkReady: boolean;
  enabled: boolean;
};

export function useStartPointAddress({
  mapRef,
  sdkReady,
  enabled,
}: UseStartPointAddressParams) {
  const [addressText, setAddressText] = useState(ADDRESS_LOADING_TEXT);
  const [center, setCenter] = useState<LatLng | null>(null);
  const debouncedCenter = useDebouncedValue(center, CENTER_DEBOUNCE_MS);
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestedKeyRef = useRef<string | null>(null);
  const latestRequestKeyRef = useRef<string | null>(null);
  const didRequestInitialLookupRef = useRef(false);

  const requestAddress = useEffectEvent(async (targetCenter: LatLng) => {
    const nextKey = toCoordKey(targetCenter);
    if (lastRequestedKeyRef.current === nextKey) return;

    lastRequestedKeyRef.current = nextKey;
    latestRequestKeyRef.current = nextKey;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAddressText(ADDRESS_LOADING_TEXT);

    try {
      const response = await fetchTmapReverseGeocode({
        lat: targetCenter.lat,
        lng: targetCenter.lng,
        signal: controller.signal,
      });

      if (
        controller.signal.aborted ||
        latestRequestKeyRef.current !== nextKey
      ) {
        return;
      }

      setAddressText(response.displayAddress ?? ADDRESS_ERROR_TEXT);
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }

      if (latestRequestKeyRef.current !== nextKey) return;
      setAddressText(ADDRESS_ERROR_TEXT);
    }
  });

  useEffect(() => {
    if (enabled) return;

    abortRef.current?.abort();
    abortRef.current = null;
    lastRequestedKeyRef.current = null;
    latestRequestKeyRef.current = null;
    didRequestInitialLookupRef.current = false;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !sdkReady || !mapRef.current || !window.naver?.maps) return;

    const map = mapRef.current;
    const syncCenter = () => {
      const nextCenter = map.getCenter();
      if (!isLatLngCoord(nextCenter)) return null;

      const normalizedCenter = {
        lat: nextCenter.lat(),
        lng: nextCenter.lng(),
      };
      setCenter(normalizedCenter);
      return normalizedCenter;
    };

    const initialCenter = syncCenter();
    if (initialCenter && !didRequestInitialLookupRef.current) {
      didRequestInitialLookupRef.current = true;
      void requestAddress(initialCenter);
    }

    const listener = naver.maps.Event.addListener(map, "idle", () => {
      syncCenter();
    });

    return () => {
      naver.maps.Event.removeListener(listener);
    };
  }, [enabled, mapRef, sdkReady]);

  useEffect(() => {
    if (!enabled || !debouncedCenter || !didRequestInitialLookupRef.current) {
      return;
    }

    void requestAddress(debouncedCenter);
  }, [debouncedCenter, enabled]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    addressText: enabled ? addressText : ADDRESS_LOADING_TEXT,
  };
}
