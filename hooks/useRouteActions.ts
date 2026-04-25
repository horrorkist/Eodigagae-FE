"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useMapStore } from "@/stores/mapStore";
import { walkDebug } from "@/lib/walkDebug";
import {
  fetchTmapWalkRoute,
  type TmapPedestrianSearchOption,
} from "@/services/routes";

export function useRouteActions() {
  const { myPos, pickedPos, setRouteState } = useMapStore(
    useShallow((s) => ({
      myPos: s.myPos,
      pickedPos: s.pickedPos,
      setRouteState: s.setRouteState,
    })),
  );

  const requestTmapWalkRoute = useCallback(
    async (searchOption?: TmapPedestrianSearchOption) => {
      if (!myPos || !pickedPos) {
        walkDebug("route:request:error", {
          reason: "missing-positions",
          myPos,
          pickedPos,
          searchOption: searchOption ?? null,
        });
        setRouteState({
          routeError: "출발/도착 좌표가 필요해요.",
          route: null,
          routeRawResponse: null,
          drawRoute: false,
        });
        return;
      }

      walkDebug("route:request:start", {
        myPos,
        pickedPos,
        searchOption: searchOption ?? null,
      });
      setRouteState({ routeLoading: true, routeError: null });

      try {
        const result = await fetchTmapWalkRoute({
          start: myPos,
          goal: pickedPos,
          searchOption,
        });

        walkDebug("route:request:success", {
          myPos,
          pickedPos,
          searchOption: searchOption ?? null,
          pathPointCount: result.route.path.length,
          distanceM: result.route.summary?.distance ?? null,
          durationMs: result.route.summary?.duration ?? null,
        });
        walkDebug("route:applied", {
          source: "tmap-pedestrian",
          myPos,
          pickedPos,
          pathPointCount: result.route.path.length,
          distanceM: result.route.summary?.distance ?? null,
          durationMs: result.route.summary?.duration ?? null,
        });
        setRouteState({
          route: result.route,
          routeRawResponse: result.rawResponse,
          routeLoading: false,
          routeError: null,
          drawRoute: false,
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "알 수 없는 오류";

        walkDebug("route:request:error", {
          myPos,
          pickedPos,
          searchOption: searchOption ?? null,
          reason: msg,
        });
        setRouteState({
          route: null,
          routeRawResponse: null,
          routeLoading: false,
          routeError: msg,
          drawRoute: false,
        });
      }
    },
    [myPos, pickedPos, setRouteState],
  );

  return { requestTmapWalkRoute };
}
