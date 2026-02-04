"use client";

import { useGeolocation } from "@/hooks/useGeolocation";
import { useMapStore } from "@/stores/mapStore";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

export default function NaverMapClient() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map>(null);

  const markerRef = useRef<naver.maps.Marker>(null);
  const destMarkerRef = useRef<naver.maps.Marker>(null);
  const polylineRef = useRef<naver.maps.Polyline>(null);

  const listenerAttachedRef = useRef(false);

  const [sdkReady, setSdkReady] = useState(false);

  const setMyPos = useMapStore((s) => s.setMyPos);
  const setPickedPos = useMapStore((s) => s.setPickedPos);

  const route = useMapStore((s) => s.route);
  const drawRoute = useMapStore((s) => s.drawRoute);

  const { coords, loading, error, supported, refresh } = useGeolocation({
    enableHighAccuracy: true,
  });

  // 내 위치 store 업데이트
  useEffect(() => {
    const lat = coords?.latitude;
    const lng = coords?.longitude;
    if (typeof lat === "number" && typeof lng === "number")
      setMyPos({ lat, lng });
    else setMyPos(null);
  }, [coords, setMyPos]);

  const initOrUpdate = useCallback(() => {
    if (!elRef.current) return;
    if (!sdkReady) return;
    if (!window.naver?.maps) return;

    const lat = coords?.latitude;
    const lng = coords?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const center = new window.naver.maps.LatLng(lat, lng);

    if (!mapRef.current) {
      mapRef.current = new window.naver.maps.Map(elRef.current, {
        center,
        zoom: 15,
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.TOP_RIGHT,
          style: naver.maps.ZoomControlStyle.SMALL,
        },
        minZoom: 10,
      });

      markerRef.current = new window.naver.maps.Marker({
        position: center,
        map: mapRef.current,
      });
    } else {
      mapRef.current.setCenter(center);
      markerRef.current?.setPosition(center);
    }

    // ✅ click listener는 한 번만
    if (mapRef.current && !listenerAttachedRef.current) {
      listenerAttachedRef.current = true;

      window.naver.maps.Event.addListener(mapRef.current, "click", (e: any) => {
        const latlng = e?.coord;
        if (!latlng) return;

        setPickedPos({ lat: latlng.lat(), lng: latlng.lng() });

        if (!destMarkerRef.current) {
          destMarkerRef.current = new window.naver.maps.Marker({
            position: latlng,
            map: mapRef.current!,
          });
        } else {
          destMarkerRef.current.setPosition(latlng);
        }
      });
    }
  }, [coords, sdkReady, setPickedPos]);

  useEffect(() => {
    initOrUpdate();
  }, [initOrUpdate]);

  // ✅ drawRoute + route.path 변화에 따라 폴리라인 제어
  useEffect(() => {
    if (!sdkReady) return;
    if (!window.naver?.maps) return;
    if (!mapRef.current) return;

    // draw 꺼졌거나 route 없으면 제거
    if (!drawRoute || !route?.path?.length) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const latLngPath = route.path.map(
      ([lng, lat]) => new window.naver.maps.LatLng(lat, lng),
    );

    if (!polylineRef.current) {
      polylineRef.current = new window.naver.maps.Polyline({
        map: mapRef.current,
        path: latLngPath,
      });
    } else {
      polylineRef.current.setPath(latLngPath);
      polylineRef.current.setMap(mapRef.current);
    }

    // 보기 좋게 bounds 맞춤
    const bounds = polylineRef.current.getBounds();
    if (bounds) mapRef.current.fitBounds(bounds);
  }, [sdkReady, drawRoute, route]);

  const key = process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID;

  return (
    <>
      <Script
        id="naver-maps-sdk"
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${key}`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />

      {/* {error && (
        <div className="flex items-center h-full w-full p-4">
          {supported && !loading && (
            <div className="flex w-full justify-between gap-4">
              <p>위치 오류.</p>
              <p className="flex-1">{error.message}</p>
              <button
                className="hover:cursor-pointer p-2 border"
                onClick={refresh}
              >
                다시 요청
              </button>
            </div>
          )}
        </div>
      )} */}

      {!loading && !error && <div ref={elRef} className="w-full h-full" />}
    </>
  );
}
