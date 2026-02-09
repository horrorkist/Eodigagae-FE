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

export function usePetPoiController(opts?: PetPoiControllerProps) {
  const emit = useEmit();
  const myPos = useMapStore((s) => s.myPos);

  const radius = opts?.radius ?? PETPOI_DEFAULTS.radius;
  const numOfRows = opts?.numOfRows ?? PETPOI_DEFAULTS.numOfRows;
  const grid = opts?.grid ?? PETPOI_DEFAULTS.grid;
  const revalidate = opts?.revalidate ?? PETPOI_DEFAULTS.revalidate;
  const cooldownMs = opts?.cooldownMs ?? 10 * 60 * 1000;

  const [on, setOn] = useState(false);

  // SWR key: null disables fetching when toggled off or position unknown
  // 라운딩은 서버가 담당 — 클라이언트는 raw 좌표 + grid 파라미터만 전달
  const swrKey = useMemo(() => {
    if (!on || !myPos) return null;
    return (
      `/api/petpois?lat=${myPos.lat}&lng=${myPos.lng}` +
      `&radius=${radius}&numOfRows=${numOfRows}&pageNo=1` +
      `&grid=${grid}&revalidate=${revalidate}`
    );
  }, [on, myPos, radius, numOfRows, grid, revalidate]);

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
          key: res.key,
          ts: Date.now(),
        });
      },
      onError(err) {
        emit({
          type: "PETPOI_ERROR",
          message: err?.message ?? "알 수 없는 오류",
          key: swrKey ?? "petpoi:unknown",
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
    petPoiTotalCount: data?.meta?.totalCount ?? null,
    petPoiLoading: isValidating,
    petPoiError: error?.message ?? null,
    setPetPoiOn,
    refreshPetPoi,
  };
}
