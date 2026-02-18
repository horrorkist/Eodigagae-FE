// hooks/usePetPoiController.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useMapStore } from "@/stores/mapStore";
import type { PetPoiResponse } from "@/types/mapEvents";
import { useEmit, useOn } from "./useEventBus";
import { PETPOI_DEFAULTS } from "@/lib/petPoiDefaults";

type PetPoiControllerProps = {
  radius?: number;
  numOfRows?: number;
  grid?: number; // 서버 라운딩 격자 (서버에서 실제 라운딩 수행)
  revalidate?: number; // 서버 캐시 TTL(초)
  cooldownMs?: number; // 클라 재요청 쿨다운(= SWR dedupingInterval)
};

const petPoiFetcher = async (url: string): Promise<PetPoiResponse> => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return {
    key: data?.key ?? "",
    meta: data?.meta ?? null,
    items: Array.isArray(data?.items) ? data.items : [],
  };
};

function roundByGrid(n: number, grid: number) {
  if (!Number.isFinite(grid) || grid <= 0) return n;
  return Math.round(n / grid) * grid;
}

export function usePetPoiController(opts?: PetPoiControllerProps) {
  const emit = useEmit();
  const myPos = useMapStore((s) => s.myPos);
  const petPoiOn = useMapStore((s) => s.petPoiOn);
  const setPetPoiOnState = useMapStore((s) => s.setPetPoiOn);
  const [petPoiError, setPetPoiError] = useState<string | null>(null);

  const radius = opts?.radius ?? PETPOI_DEFAULTS.radius;
  const numOfRows = opts?.numOfRows ?? PETPOI_DEFAULTS.numOfRows;
  const grid = opts?.grid ?? PETPOI_DEFAULTS.grid;
  const revalidate = opts?.revalidate ?? PETPOI_DEFAULTS.revalidate;
  const cooldownMs = opts?.cooldownMs ?? 10 * 60 * 1000;

  const roundedPos = useMemo(() => {
    if (!myPos) return null;
    return {
      lat: roundByGrid(myPos.lat, grid),
      lng: roundByGrid(myPos.lng, grid),
    };
  }, [myPos, grid]);

  // SWR key: null disables fetching when toggled off or position unknown
  // 클라이언트에서도 grid 기반 key를 안정화해 불필요한 재요청/깜빡임을 줄임
  const swrKey = useMemo(() => {
    if (!petPoiOn || !roundedPos) return null;
    return (
      `/api/petpois?lat=${roundedPos.lat}&lng=${roundedPos.lng}` +
      `&radius=${radius}&numOfRows=${numOfRows}&pageNo=1` +
      `&grid=${grid}&revalidate=${revalidate}`
    );
  }, [petPoiOn, roundedPos, radius, numOfRows, grid, revalidate]);

  const { data, isValidating, mutate } = useSWR<PetPoiResponse>(
    swrKey,
    petPoiFetcher,
    {
      dedupingInterval: cooldownMs,
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess(res) {
        setPetPoiError(null);
        emit({
          channel: "pet",
          type: "PETPOI_RESULT",
          items: res.items,
          key: res.key,
          ts: Date.now(),
        });
      },
      onError(err) {
        const nextError = err?.message ?? "알 수 없는 오류";
        setPetPoiError(nextError);
        setPetPoiOnState(false);
        emit({
          type: "PETPOI_ERROR",
          message: nextError,
          key: swrKey ?? "petpoi:unknown",
          ts: Date.now(),
          channel: "pet",
        });
      },
    },
  );

  // 토글 이벤트: on/off만 반영, 나머지는 swrKey 변화로 SWR가 처리
  useOn("pet", "PETPOI_TOGGLE", (cmd) => setPetPoiOnState(cmd.on));

  // 새로고침 이벤트: bound mutate로 강제 revalidate
  useOn("pet", "PETPOI_REFRESH", () => {
    if (!petPoiOn) return;
    mutate();
  });

  // 외부에서 쓰기 좋은 helper
  const setPetPoiOn = useCallback(
    (next: boolean) => {
      setPetPoiOnState(next);
      emit({ type: "PETPOI_TOGGLE", on: next, channel: "pet" });
    },
    [emit, setPetPoiOnState],
  );

  const refreshPetPoi = useCallback(
    () => emit({ type: "PETPOI_REFRESH", channel: "pet" }),
    [emit],
  );
  const clearPetPoiError = useCallback(() => {
    setPetPoiError(null);
  }, []);

  return {
    petPoiOn,
    petPois: data?.items ?? [],
    petPoiTotalCount: data?.meta?.totalCount ?? null,
    petPoiLoading: isValidating,
    petPoiError,
    setPetPoiOn,
    refreshPetPoi,
    clearPetPoiError,
  };
}
