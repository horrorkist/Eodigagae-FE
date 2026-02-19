"use client";

import Script from "next/script";
import { useNaverMap } from "@/hooks/useNaverMap";
import { useMapMyLocation } from "@/hooks/useMapMyLocation";
import { useMapRoute } from "@/hooks/useMapRoute";
import { useMapPetPoi } from "@/hooks/useMapPetPoi";
import { PetPoiItem } from "@/types/mapEvents";
import type { UseMapRouteOptions } from "@/hooks/useMapRoute";

export default function NaverMapClient(props: {
  showPetPoi: boolean;
  petPois: PetPoiItem[];
  routeOptions?: UseMapRouteOptions;
}) {
  const { showPetPoi, petPois, routeOptions } = props;

  const { mapRef, elRef, sdkReady, setSdkReady } = useNaverMap();
  useMapMyLocation(mapRef, sdkReady);
  useMapRoute(mapRef, routeOptions, sdkReady);
  useMapPetPoi(mapRef, sdkReady, showPetPoi, petPois);

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
