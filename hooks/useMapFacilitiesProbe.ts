"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  fetchFountainsByBounds,
  fetchTrashBinsByBounds,
} from "@/services/facilities";
import type { FountainItem, TrashBinItem } from "@/types/facilities";
import type { LatLng } from "@/types/mapEvents";

const IDLE_DEBOUNCE_MS = 350;
const DEFAULT_SIZE = 200;

type FacilityProbeStatus = {
  loading: boolean;
  error: string | null;
  count: number | null;
  lastFetchedAt: number | null;
};

type FacilityProbeState<TItem> = FacilityProbeStatus & {
  items: TItem[];
};

type UseMapFacilitiesProbeParams = {
  mapRef: RefObject<naver.maps.Map | null>;
  sdkReady: boolean;
  waterEnabled: boolean;
  trashEnabled: boolean;
};

const EMPTY_STATUS: FacilityProbeStatus = {
  loading: false,
  error: null,
  count: null,
  lastFetchedAt: null,
};

const EMPTY_WATER_STATE: FacilityProbeState<FountainItem> = {
  ...EMPTY_STATUS,
  items: [],
};

const EMPTY_TRASH_STATE: FacilityProbeState<TrashBinItem> = {
  ...EMPTY_STATUS,
  items: [],
};

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

function readViewport(map: naver.maps.Map) {
  const bounds = map.getBounds() as naver.maps.LatLngBounds;
  const ne = bounds.getNE();
  const sw = bounds.getSW();
  const center = map.getCenter() as naver.maps.LatLng;

  const minLat = sw.lat();
  const maxLat = ne.lat();
  const minLng = sw.lng();
  const maxLng = ne.lng();
  const centerLat = center.lat();
  const centerLng = center.lng();

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng) ||
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLng)
  ) {
    return null;
  }

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    center: {
      lat: centerLat,
      lng: centerLng,
    },
  };
}

export function useMapFacilitiesProbe({
  mapRef,
  sdkReady,
  waterEnabled,
  trashEnabled,
}: UseMapFacilitiesProbeParams) {
  const [water, setWater] =
    useState<FacilityProbeState<FountainItem>>(EMPTY_WATER_STATE);
  const [trash, setTrash] =
    useState<FacilityProbeState<TrashBinItem>>(EMPTY_TRASH_STATE);
  const [referenceCenter, setReferenceCenter] = useState<LatLng | null>(null);

  const waterAbortRef = useRef<AbortController | null>(null);
  const trashAbortRef = useRef<AbortController | null>(null);
  const prevWaterEnabledRef = useRef(false);
  const prevTrashEnabledRef = useRef(false);

  const refreshWater = useCallback(async () => {
    if (!sdkReady || !waterEnabled) return;
    const map = mapRef.current;
    if (!map) return;

    const viewport = readViewport(map);
    if (!viewport) return;
    setReferenceCenter(viewport.center);

    waterAbortRef.current?.abort();
    const controller = new AbortController();
    waterAbortRef.current = controller;

    setWater((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetchFountainsByBounds(
        {
          minLat: viewport.minLat,
          maxLat: viewport.maxLat,
          minLng: viewport.minLng,
          maxLng: viewport.maxLng,
          size: DEFAULT_SIZE,
        },
        { signal: controller.signal },
      );

      if (controller.signal.aborted) return;

      setWater({
        loading: false,
        error: response.error,
        count: response.items.length,
        lastFetchedAt: Date.now(),
        items: response.items,
      });
    } catch (error: unknown) {
      if (controller.signal.aborted || isAbortError(error)) return;
      const message =
        error instanceof Error ? error.message : "음수대 데이터를 불러오지 못했어요.";
      setWater({
        loading: false,
        error: message,
        count: null,
        lastFetchedAt: null,
        items: [],
      });
    }
  }, [mapRef, sdkReady, waterEnabled]);

  const refreshTrash = useCallback(async () => {
    if (!sdkReady || !trashEnabled) return;
    const map = mapRef.current;
    if (!map) return;

    const viewport = readViewport(map);
    if (!viewport) return;
    setReferenceCenter(viewport.center);

    trashAbortRef.current?.abort();
    const controller = new AbortController();
    trashAbortRef.current = controller;

    setTrash((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetchTrashBinsByBounds(
        {
          minLat: viewport.minLat,
          maxLat: viewport.maxLat,
          minLng: viewport.minLng,
          maxLng: viewport.maxLng,
          centerLat: viewport.center.lat,
          centerLng: viewport.center.lng,
          size: DEFAULT_SIZE,
        },
        { signal: controller.signal },
      );

      if (controller.signal.aborted) return;

      setTrash({
        loading: false,
        error: response.error,
        count: response.items.length,
        lastFetchedAt: Date.now(),
        items: response.items,
      });
    } catch (error: unknown) {
      if (controller.signal.aborted || isAbortError(error)) return;
      const message =
        error instanceof Error
          ? error.message
          : "쓰레기통 데이터를 불러오지 못했어요.";
      setTrash({
        loading: false,
        error: message,
        count: null,
        lastFetchedAt: null,
        items: [],
      });
    }
  }, [mapRef, sdkReady, trashEnabled]);

  const refreshEnabledFacilities = useCallback(() => {
    if (waterEnabled) {
      void refreshWater();
    }
    if (trashEnabled) {
      void refreshTrash();
    }
  }, [refreshTrash, refreshWater, trashEnabled, waterEnabled]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.naver?.maps) return;

    let timerId: number | null = null;
    const map = mapRef.current;
    const listener = naver.maps.Event.addListener(map, "idle", () => {
      if (waterEnabled) {
        setWater((prev) => ({
          ...prev,
          loading: true,
        }));
      }
      if (trashEnabled) {
        setTrash((prev) => ({
          ...prev,
          loading: true,
        }));
      }
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        refreshEnabledFacilities();
      }, IDLE_DEBOUNCE_MS);
    });

    return () => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      naver.maps.Event.removeListener(listener);
    };
  }, [mapRef, refreshEnabledFacilities, sdkReady, trashEnabled, waterEnabled]);

  useEffect(() => {
    const wasEnabled = prevWaterEnabledRef.current;
    let timerId: number | null = null;

    if (!waterEnabled) {
      if (wasEnabled) {
        waterAbortRef.current?.abort();
        waterAbortRef.current = null;
      }
      prevWaterEnabledRef.current = false;
      return;
    }

    if (!wasEnabled && sdkReady && mapRef.current) {
      timerId = window.setTimeout(() => {
        void refreshWater();
      }, 0);
    }
    prevWaterEnabledRef.current = true;
    return () => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
    };
  }, [mapRef, refreshWater, sdkReady, waterEnabled]);

  useEffect(() => {
    const wasEnabled = prevTrashEnabledRef.current;
    let timerId: number | null = null;

    if (!trashEnabled) {
      if (wasEnabled) {
        trashAbortRef.current?.abort();
        trashAbortRef.current = null;
      }
      prevTrashEnabledRef.current = false;
      return;
    }

    if (!wasEnabled && sdkReady && mapRef.current) {
      timerId = window.setTimeout(() => {
        void refreshTrash();
      }, 0);
    }
    prevTrashEnabledRef.current = true;
    return () => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
    };
  }, [mapRef, refreshTrash, sdkReady, trashEnabled]);

  useEffect(() => {
    return () => {
      waterAbortRef.current?.abort();
      trashAbortRef.current?.abort();
    };
  }, []);

  return {
    water: waterEnabled ? water : EMPTY_WATER_STATE,
    trash: trashEnabled ? trash : EMPTY_TRASH_STATE,
    referenceCenter,
  };
}
