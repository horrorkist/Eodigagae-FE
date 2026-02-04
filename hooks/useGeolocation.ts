"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GeoCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
};

type GeoState = {
  coords: GeoCoords | null;
  timestamp: number | null;
  loading: boolean;
  error: GeolocationPositionError | Error | null;
  supported: boolean;
};

type UseGeolocationOptions = {
  /**
   * true면 watchPosition으로 추적 시작
   * false면 필요할 때 refresh()로 단발성 조회
   */
  watch?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  /**
   * watch일 때 최초 마운트 시 바로 한번 가져올지
   */
  immediate?: boolean;
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    watch = false,
    immediate = true,
    enableHighAccuracy = true,
    timeout = 10_000,
    maximumAge = 0,
  } = options;

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "geolocation" in navigator;

  const [state, setState] = useState<GeoState>({
    coords: null,
    timestamp: null,
    loading: watch ? immediate : false,
    error: null,
    supported,
  });

  const watchIdRef = useRef<number | null>(null);

  const onSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const c = pos.coords;
      setState((prev) => ({
        ...prev,
        coords: {
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: c.accuracy,
          altitude: c.altitude,
          altitudeAccuracy: c.altitudeAccuracy,
          heading: c.heading,
          speed: c.speed,
        },
        timestamp: pos.timestamp,
        loading: false,
        error: null,
        supported,
      }));
    },
    [supported],
  );

  const onError = useCallback(
    (err: GeolocationPositionError) => {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
        supported,
      }));
    },
    [supported],
  );

  const refresh = useCallback(() => {
    if (!supported) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: new Error("Geolocation is not supported in this environment."),
        supported,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  }, [supported, onSuccess, onError, enableHighAccuracy, timeout, maximumAge]);

  const start = useCallback(() => {
    if (!supported) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: new Error("Geolocation is not supported in this environment."),
        supported,
      }));
      return;
    }

    // 이미 추적 중이면 중복 시작 방지
    if (watchIdRef.current != null) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const id = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });

    watchIdRef.current = id;
  }, [supported, onSuccess, onError, enableHighAccuracy, timeout, maximumAge]);

  const stop = useCallback(() => {
    if (!supported) return;
    if (watchIdRef.current == null) return;

    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;

    setState((prev) => ({ ...prev, loading: false }));
  }, [supported]);

  // 옵션 watch에 따른 자동 동작
  useEffect(() => {
    if (!supported) return;

    if (watch) {
      if (immediate) start();
      return () => stop();
    } else {
      // 단발성 모드에서 immediate면 1회 가져오기
      if (immediate) refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, immediate, supported]);

  return {
    ...state,
    refresh, // 단발성/수동 갱신
    start, // 추적 시작
    stop, // 추적 중지
    watching: watchIdRef.current != null,
  };
}
