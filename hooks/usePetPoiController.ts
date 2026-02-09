// hooks/usePetPoiController.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useMapStore } from "@/stores/mapStore";
import type { PetPoiItem } from "@/types/mapEvents";
import { useEmit, useOn } from "./useEventBus";

type PetPoiControllerProps = {
  radius?: number;
  numOfRows?: number;
  grid?: number; // 라운딩 격자
  revalidate?: number; // 서버 캐시 TTL(초)
  cooldownMs?: number; // 클라 재요청 쿨다운(= SWR dedupingInterval)
};

type PetPoiResponse = {
  key: string;
  items: PetPoiItem[];
};

const petPoiFetcher = async (url: string): Promise<PetPoiResponse> => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return {
    key: data?.key ?? "",
    items: Array.isArray(data?.items) ? data.items : [],
  };
};

export function usePetPoiController(opts?: PetPoiControllerProps) {
  const emit = useEmit();
  const myPos = useMapStore((s) => s.myPos);

  const radius = opts?.radius ?? 1000;
  const numOfRows = opts?.numOfRows ?? 80;
  const grid = opts?.grid ?? 0.002;
  const revalidate = opts?.revalidate ?? 600;
  const cooldownMs = opts?.cooldownMs ?? 10 * 60 * 1000;

  const [on, setOn] = useState(false);

  const rounded = useMemo(() => {
    if (!myPos) return null;
    const rLat = Math.round(myPos.lat / grid) * grid;
    const rLng = Math.round(myPos.lng / grid) * grid;
    return { lat: rLat, lng: rLng };
  }, [myPos, grid]);

  const cacheKey = useMemo(() => {
    if (!rounded) return null;
    return `petpoi:${rounded.lat.toFixed(6)}:${rounded.lng.toFixed(6)}:r${radius}:n${numOfRows}`;
  }, [rounded, radius, numOfRows]);

  // SWR key: null disables fetching when toggled off or position unknown
  const swrKey = useMemo(() => {
    if (!on || !rounded) return null;
    return (
      `/api/petpois?lat=${rounded.lat}&lng=${rounded.lng}` +
      `&radius=${radius}&numOfRows=${numOfRows}&pageNo=1` +
      `&grid=${grid}&revalidate=${revalidate}`
    );
  }, [on, rounded, radius, numOfRows, grid, revalidate]);

  const { data, error, isValidating, mutate } = useSWR<PetPoiResponse>(
    swrKey,
    petPoiFetcher,
    {
      dedupingInterval: cooldownMs,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess(res) {
        emit({
          channel: "pet",
          type: "PETPOI_RESULT",
          items: res.items,
          key: res.key || String(cacheKey ?? ""),
          ts: Date.now(),
        });
      },
      onError(err) {
        emit({
          type: "PETPOI_ERROR",
          message: err?.message ?? "알 수 없는 오류",
          key: String(cacheKey ?? "petpoi:unknown"),
          ts: Date.now(),
          channel: "pet",
        });
      },
    },
  );

  // 토글 이벤트: on/off만 반영, 나머지는 swrKey 변화로 SWR가 처리
  useOn("pet", "PETPOI_TOGGLE", (cmd) => setOn(cmd.on));

  // 새로고침 이벤트: bound mutate로 강제 revalidate
  useOn("pet", "PETPOI_REFRESH", () => {
    if (!on) return;
    mutate();
  });

  // 외부에서 쓰기 좋은 helper
  const setPetPoiOn = useCallback(
    (next: boolean) =>
      emit({ type: "PETPOI_TOGGLE", on: next, channel: "pet" }),
    [emit],
  );

  const refreshPetPoi = useCallback(
    () => emit({ type: "PETPOI_REFRESH", channel: "pet" }),
    [emit],
  );

  return {
    petPoiOn: on,
    petPois: data?.items ?? [],
    petPoiLoading: isValidating,
    petPoiError: error?.message ?? null,
    petPoiCacheKey: cacheKey,
    setPetPoiOn,
    refreshPetPoi,
  };
}
