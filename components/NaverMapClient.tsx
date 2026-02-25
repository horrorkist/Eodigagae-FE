"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useNaverMap } from "@/hooks/useNaverMap";
import { useMapMyLocation } from "@/hooks/useMapMyLocation";
import { useMapRoute } from "@/hooks/useMapRoute";
import type { UseMapRouteOptions } from "@/hooks/useMapRoute";
import type { MapRuntimeRegistration } from "@/components/map-shell/MapRuntimeProvider";

export default function NaverMapClient(props: {
  routeOptions?: UseMapRouteOptions;
  onRuntimeChange?: (runtime: MapRuntimeRegistration) => void;
}) {
  const { routeOptions, onRuntimeChange } = props;

  const { mapRef, elRef, sdkReady, setSdkReady } = useNaverMap();
  useMapMyLocation(mapRef, sdkReady);
  useMapRoute(mapRef, routeOptions, sdkReady);

  useEffect(() => {
    onRuntimeChange?.({
      mapRef,
      sdkReady,
    });
  }, [mapRef, onRuntimeChange, sdkReady]);

  const key = process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID;

  return (
    <>
      <Script
        id="naver-maps-sdk"
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${key}`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />
      <div ref={elRef} className="w-full h-full" />
    </>
  );
}
