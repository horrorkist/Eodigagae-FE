"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  fetchFountainsByBounds,
  fetchTrashBinsByBounds,
} from "@/services/facilities";
import {
  shouldRefreshFacilityProbe,
  type FacilityProbeAnchor,
} from "@/lib/facilitiesProbeRefreshPolicy";
import type { FountainItem, TrashBinItem } from "@/types/facilities";
import type { LatLng } from "@/types/mapEvents";

const IDLE_DEBOUNCE_MS = 350;
const DEFAULT_SIZE = 50;
const CENTER_CLAMP_GRID_DEG = 0.001;
const CENTER_REFRESH_MIN_MOVE_M = 250;

type FacilityProbeStatus = {
  loading: boolean;
  error: string | null;
  count: number | null;
  lastFetchedAt: number | null;
};

type FacilityProbeState<TItem> = FacilityProbeStatus & {
  items: TItem[];
};

type ViewportSnapshot = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  center: LatLng;
  zoom: number;
};

type RefreshOptions = {
  force?: boolean;
  includeWater?: boolean;
  includeTrash?: boolean;
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
  const zoom = Math.round(Number(map.getZoom()));

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
    !Number.isFinite(centerLng) ||
    !Number.isFinite(zoom)
  ) {
    return null;
  }

  const viewport: ViewportSnapshot = {
    minLat,
    maxLat,
    minLng,
    maxLng,
    center: {
      lat: centerLat,
      lng: centerLng,
    },
    zoom,
  };

  return viewport;
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
  const waterInFlightRef = useRef(false);
  const trashInFlightRef = useRef(false);
  const lastFetchAnchorRef = useRef<FacilityProbeAnchor | null>(null);
  const prevWaterEnabledRef = useRef(false);
  const prevTrashEnabledRef = useRef(false);

  const refreshWaterByViewport = useCallback(async (viewport: ViewportSnapshot) => {
    waterAbortRef.current?.abort();
    const controller = new AbortController();
    waterAbortRef.current = controller;
    waterInFlightRef.current = true;

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
    } finally {
      if (waterAbortRef.current === controller) {
        waterInFlightRef.current = false;
      }
    }
  }, []);

  const refreshTrashByViewport = useCallback(async (viewport: ViewportSnapshot) => {
    trashAbortRef.current?.abort();
    const controller = new AbortController();
    trashAbortRef.current = controller;
    trashInFlightRef.current = true;

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
    } finally {
      if (trashAbortRef.current === controller) {
        trashInFlightRef.current = false;
      }
    }
  }, []);

  const clearSkippedLoading = useCallback(
    (includeWater: boolean, includeTrash: boolean) => {
      if (includeWater && !waterInFlightRef.current) {
        setWater((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      }
      if (includeTrash && !trashInFlightRef.current) {
        setTrash((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      }
    },
    [],
  );

  const refreshFacilities = useCallback(
    (options?: RefreshOptions) => {
      const includeWater = options?.includeWater ?? waterEnabled;
      const includeTrash = options?.includeTrash ?? trashEnabled;
      if (!includeWater && !includeTrash) return;
      if (!sdkReady || !mapRef.current) {
        clearSkippedLoading(includeWater, includeTrash);
        return;
      }

      const viewport = readViewport(mapRef.current);
      if (!viewport) {
        clearSkippedLoading(includeWater, includeTrash);
        return;
      }

      setReferenceCenter(viewport.center);

      const decision = shouldRefreshFacilityProbe({
        center: viewport.center,
        zoom: viewport.zoom,
        lastAnchor: lastFetchAnchorRef.current,
        force: options?.force ?? false,
        clampGridDeg: CENTER_CLAMP_GRID_DEG,
        minMoveM: CENTER_REFRESH_MIN_MOVE_M,
      });

      if (!decision.shouldRefresh) {
        clearSkippedLoading(includeWater, includeTrash);
        return;
      }

      lastFetchAnchorRef.current = {
        center: decision.clampedCenter,
        zoom: viewport.zoom,
      };

      if (includeWater) {
        void refreshWaterByViewport(viewport);
      }
      if (includeTrash) {
        void refreshTrashByViewport(viewport);
      }
    },
    [
      clearSkippedLoading,
      mapRef,
      refreshTrashByViewport,
      refreshWaterByViewport,
      sdkReady,
      trashEnabled,
      waterEnabled,
    ],
  );

  const setIdleLoading = useCallback(() => {
    if (waterEnabled) {
      setWater((prev) => (prev.loading ? prev : { ...prev, loading: true }));
    }
    if (trashEnabled) {
      setTrash((prev) => (prev.loading ? prev : { ...prev, loading: true }));
    }
  }, [trashEnabled, waterEnabled]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.naver?.maps) return;

    let timerId: number | null = null;
    const map = mapRef.current;
    const listener = naver.maps.Event.addListener(map, "idle", () => {
      const viewport = readViewport(map);
      if (viewport) {
        setReferenceCenter(viewport.center);
        const decision = shouldRefreshFacilityProbe({
          center: viewport.center,
          zoom: viewport.zoom,
          lastAnchor: lastFetchAnchorRef.current,
          clampGridDeg: CENTER_CLAMP_GRID_DEG,
          minMoveM: CENTER_REFRESH_MIN_MOVE_M,
        });
        if (decision.shouldRefresh) {
          setIdleLoading();
        }
      }
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        refreshFacilities();
      }, IDLE_DEBOUNCE_MS);
    });

    return () => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      naver.maps.Event.removeListener(listener);
    };
  }, [mapRef, refreshFacilities, sdkReady, setIdleLoading]);

  useEffect(() => {
    const wasEnabled = prevWaterEnabledRef.current;
    let timerId: number | null = null;

    if (!waterEnabled) {
      if (wasEnabled) {
        waterAbortRef.current?.abort();
        waterAbortRef.current = null;
        waterInFlightRef.current = false;
      }
      prevWaterEnabledRef.current = false;
      return;
    }

    if (!wasEnabled && sdkReady && mapRef.current) {
      timerId = window.setTimeout(() => {
        refreshFacilities({
          force: true,
          includeWater: true,
          includeTrash: false,
        });
      }, 0);
    }
    prevWaterEnabledRef.current = true;
    return () => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
    };
  }, [mapRef, refreshFacilities, sdkReady, waterEnabled]);

  useEffect(() => {
    const wasEnabled = prevTrashEnabledRef.current;
    let timerId: number | null = null;

    if (!trashEnabled) {
      if (wasEnabled) {
        trashAbortRef.current?.abort();
        trashAbortRef.current = null;
        trashInFlightRef.current = false;
      }
      prevTrashEnabledRef.current = false;
      return;
    }

    if (!wasEnabled && sdkReady && mapRef.current) {
      timerId = window.setTimeout(() => {
        refreshFacilities({
          force: true,
          includeWater: false,
          includeTrash: true,
        });
      }, 0);
    }
    prevTrashEnabledRef.current = true;
    return () => {
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
    };
  }, [mapRef, refreshFacilities, sdkReady, trashEnabled]);

  useEffect(() => {
    return () => {
      waterAbortRef.current?.abort();
      trashAbortRef.current?.abort();
      waterInFlightRef.current = false;
      trashInFlightRef.current = false;
    };
  }, []);

  return {
    water: waterEnabled ? water : EMPTY_WATER_STATE,
    trash: trashEnabled ? trash : EMPTY_TRASH_STATE,
    referenceCenter,
  };
}
