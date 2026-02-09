"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";

export function useMapRoute(mapRef: RefObject<naver.maps.Map | null>) {
  const routeLineRef = useRef<naver.maps.Polyline | null>(null);

  const clearRouteLine = useCallback(() => {
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }
  }, []);

  const drawRouteLine = useCallback(
    (path: [number, number][]) => {
      if (!mapRef.current || !window.naver?.maps) return;
      if (!path?.length) return;

      const pts = path.map(
        ([lng, lat]) => new window.naver.maps.LatLng(lat, lng),
      );

      if (!routeLineRef.current) {
        routeLineRef.current = new window.naver.maps.Polyline({
          map: mapRef.current,
          path: pts,
          strokeWeight: 6,
          strokeOpacity: 0.9,
        });
      } else {
        routeLineRef.current.setPath(pts);
        routeLineRef.current.setMap(mapRef.current);
      }
    },
    [mapRef],
  );

  const route = useMapStore((s) => s.route);
  const drawRoute = useMapStore((s) => s.drawRoute);

  useEffect(() => {
    if (!drawRoute || !route?.path?.length) {
      clearRouteLine();
      return;
    }
    drawRouteLine(route.path);
  }, [route, drawRoute, drawRouteLine, clearRouteLine]);

  useEffect(() => {
    return () => {
      clearRouteLine();
    };
  }, [clearRouteLine]);
}
