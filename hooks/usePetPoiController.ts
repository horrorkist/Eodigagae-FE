// hooks/usePetPoiController.ts
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useEmitMapCmd, useMapCmd } from "@/hooks/useMapCmd";
import type { PetPoiItem } from "@/types/mapEvents";

type Options = {
  radius?: number;
  numOfRows?: number;
  grid?: number; // 라운딩 격자
  revalidate?: number; // 서버 캐시 TTL(초)
  cooldownMs?: number; // 클라 재요청 쿨다운
};

export function usePetPoiController(opts?: Options) {
  const emit = useEmitMapCmd();
  const myPos = useMapStore((s) => s.myPos);

  const radius = opts?.radius ?? 1000;
  const numOfRows = opts?.numOfRows ?? 80;
  const grid = opts?.grid ?? 0.002;
  const revalidate = opts?.revalidate ?? 600;
  const cooldownMs = opts?.cooldownMs ?? 10 * 60 * 1000;

  const [on, setOn] = useState(false);
  const [items, setItems] = useState<PetPoiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 최근 fetch 상태(쿨다운/중복 방지)
  const lastKeyRef = useRef<string | null>(null);
  const lastFetchAtRef = useRef<number>(0);

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

  const fetchNow = useCallback(
    async (force?: boolean) => {
      if (!myPos || !rounded || !cacheKey) {
        setError("내 위치가 필요해요.");
        return;
      }
      if (loading) return;

      const now = Date.now();
      const isSameKey = lastKeyRef.current === cacheKey;
      const inCooldown = now - lastFetchAtRef.current < cooldownMs;

      if (!force && isSameKey && inCooldown && items.length > 0) {
        // 굳이 다시 안 쏨
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url =
          `/api/petpois?lat=${rounded.lat}&lng=${rounded.lng}` +
          `&radius=${radius}&numOfRows=${numOfRows}&pageNo=1` +
          `&grid=${grid}&revalidate=${revalidate}`;

        const res = await fetch(url, { method: "GET" });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

        const list: PetPoiItem[] = Array.isArray(data?.items) ? data.items : [];

        setItems(list);

        lastKeyRef.current = data?.key ?? cacheKey;
        lastFetchAtRef.current = now;

        emit({
          type: "PETPOI_RESULT",
          items: list,
          key: String(data?.key ?? cacheKey),
          ts: now,
        });
      } catch (e: any) {
        const msg = e?.message ?? "알 수 없는 오류";
        setError(msg);

        emit({
          type: "PETPOI_ERROR",
          message: msg,
          key: String(cacheKey ?? "petpoi:unknown"),
          ts: Date.now(),
        });
      } finally {
        setLoading(false);
      }
    },
    [
      myPos,
      rounded,
      cacheKey,
      radius,
      numOfRows,
      grid,
      revalidate,
      cooldownMs,
      items.length,
      loading,
      emit,
    ],
  );

  // ✅ 토글 이벤트: ON 될 때만 fetch(기본 1회)
  useMapCmd("PETPOI_TOGGLE", (cmd) => {
    setOn(cmd.on);

    if (!cmd.on) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    // ON
    fetchNow(false);
  });

  // ✅ 새로고침 이벤트
  useMapCmd("PETPOI_REFRESH", () => {
    if (!on) return;
    fetchNow(true); // force
  });

  // 외부에서 쓰기 좋은 helper
  const setPetPoiOn = useCallback(
    (next: boolean) => emit({ type: "PETPOI_TOGGLE", on: next }),
    [emit],
  );

  const refreshPetPoi = useCallback(
    () => emit({ type: "PETPOI_REFRESH" }),
    [emit],
  );

  return {
    petPoiOn: on,
    petPois: items,
    petPoiLoading: loading,
    petPoiError: error,
    petPoiCacheKey: cacheKey,
    setPetPoiOn,
    refreshPetPoi,
  };
}
