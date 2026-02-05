// hooks/useCmdBus.ts
"use client";

import { useEffect } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useShallow } from "zustand/shallow";

export function useCmdBus() {
  const { cmdQueue, shiftCmd, publishCmd } = useMapStore(
    useShallow((s) => ({
      cmdQueue: s.cmdQueue,
      shiftCmd: s.shiftCmd,
      publishCmd: s.publishCmd,
    })),
  );

  useEffect(() => {
    if (cmdQueue.length === 0) return;

    let guard = 0;
    while (guard < 1000) {
      const head = shiftCmd();
      if (!head) break;
      publishCmd(head);
      guard++;
    }
  }, [cmdQueue, shiftCmd, publishCmd]);
}
