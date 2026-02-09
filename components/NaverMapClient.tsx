"use client";

import Script from "next/script";
import { useNaverMap } from "@/hooks/useNaverMap";
import { useMapMyLocation } from "@/hooks/useMapMyLocation";
import { useMapRoute } from "@/hooks/useMapRoute";
import { useMapPetPoi } from "@/hooks/useMapPetPoi";
import { PetPoiItem } from "@/types/mapEvents";

export default function NaverMapClient(props: {
  showPetPoi: boolean;
  petPois: PetPoiItem[];
}) {
  const { showPetPoi, petPois } = props;

  const { mapRef, elRef, sdkReady, setSdkReady } = useNaverMap();
  useMapMyLocation(mapRef, sdkReady);
  useMapRoute(mapRef);
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
