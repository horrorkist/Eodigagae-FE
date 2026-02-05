// hooks/useMapCmd.ts (완전 교체)
"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import type { MapCmd } from "@/types/mapEvents";

export function useEmitMapCmd() {
  return useMapStore((s) => s.emitCmd) as (cmd: MapCmd) => void;
}

export function useMapCmd<T extends MapCmd["type"]>(
  type: T,
  handler: (cmd: Extract<MapCmd, { type: T }>) => void,
) {
  const subscribeCmd = useMapStore((s) => s.subscribeCmd);

  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return subscribeCmd(type, (cmd) => handlerRef.current(cmd as any));
  }, [subscribeCmd, type]);
}
