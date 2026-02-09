"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useMapStore } from "@/stores/mapStore";
import { fetchNaverRoute, fetchTmapWalkRoute } from "@/services/routes";

export function useRouteActions() {
  const { myPos, pickedPos, setRouteState } = useMapStore(
    useShallow((s) => ({
      myPos: s.myPos,
      pickedPos: s.pickedPos,
      setRouteState: s.setRouteState,
    })),
  );

  const requestRoute = useCallback(async () => {
    if (!myPos || !pickedPos) {
      setRouteState({
        routeError: "출발/도착 좌표가 필요해요.",
        route: null,
        drawRoute: false,
      });
      return;
    }

    setRouteState({ routeLoading: true, routeError: null });

    try {
      const result = await fetchNaverRoute({ start: myPos, goal: pickedPos });

      setRouteState({
        route: result,
        routeLoading: false,
        routeError: null,
        drawRoute: false,
      });
    } catch (e: any) {
      const msg = e?.message ?? "알 수 없는 오류";

      setRouteState({
        route: null,
        routeLoading: false,
        routeError: msg,
        drawRoute: false,
      });
    }
  }, [myPos, pickedPos, setRouteState]);

  const requestTmapWalkRoute = useCallback(async () => {
    if (!myPos || !pickedPos) {
      setRouteState({
        routeError: "출발/도착 좌표가 필요해요.",
        route: null,
        drawRoute: false,
      });
      return;
    }

    setRouteState({ routeLoading: true, routeError: null });

    try {
      const result = await fetchTmapWalkRoute({
        start: myPos,
        goal: pickedPos,
      });

      setRouteState({
        route: result,
        routeLoading: false,
        routeError: null,
        drawRoute: false,
      });
    } catch (e: any) {
      const msg = e?.message ?? "알 수 없는 오류";

      setRouteState({
        route: null,
        routeLoading: false,
        routeError: msg,
        drawRoute: false,
      });
    }
  }, [myPos, pickedPos, setRouteState]);

  return { requestRoute, requestTmapWalkRoute };
}
