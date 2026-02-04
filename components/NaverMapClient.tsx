"use client";

import { useGeolocation } from "@/hooks/useGeolocation";
import { useMapStore } from "@/stores/mapStore";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PetPoiItem = {
  contentid: string;
  title: string;
  addr1?: string;
  tel?: string;
  mapx: string; // lng
  mapy: string; // lat
};

export default function NaverMapClient(props: {
  showPetPoi: boolean;
  petPois: PetPoiItem[];
}) {
  const { showPetPoi, petPois } = props;

  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map>(null);
  const markerRef = useRef<naver.maps.Marker>(null);

  // ✅ 토글 ON을 눌렀는데 map이 아직 준비 전이면, 준비되는 순간에 1회 그리기
  const pendingDrawRef = useRef(false);

  // ✅ POI 마커/인포윈도우
  const petMarkersRef = useRef<naver.maps.Marker[]>([]);
  const petInfoRef = useRef<naver.maps.InfoWindow[]>([]);

  const [sdkReady, setSdkReady] = useState(false);

  const setMyPos = useMapStore((s) => s.setMyPos);
  const cmd = useMapStore((s) => s.cmd);
  const clearCmd = useMapStore((s) => s.clearCmd);
  const emitCmd = useMapStore((s) => s.emitCmd);

  const fallback = useMemo(() => ({ lat: 37.5665, lng: 126.978 }), []);

  const { coords, error, refresh } = useGeolocation({
    watch: false,
    immediate: true,
    enableHighAccuracy: true,
  });

  const clearPetMarkers = useCallback(() => {
    for (const inf of petInfoRef.current) inf.close?.();
    petInfoRef.current = [];

    for (const m of petMarkersRef.current) m.setMap(null);
    petMarkersRef.current = [];
  }, []);

  const drawPetMarkers = useCallback(() => {
    // SDK/지도 준비 체크
    if (!sdkReady) return;
    if (!window.naver?.maps) return;

    // 토글 OFF면 "그리지 않는다" + 기존 마커 제거
    if (!showPetPoi) {
      clearPetMarkers();
      return;
    }

    // 토글 ON인데 map이 아직 없으면 "나중에" 그리도록 예약
    if (!mapRef.current) {
      pendingDrawRef.current = true;
      return;
    }

    // 여기부터는 map 존재 + showPetPoi ON
    clearPetMarkers();

    for (const it of petPois ?? []) {
      const lng = Number(it.mapx);
      const lat = Number(it.mapy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const pos = new window.naver.maps.LatLng(lat, lng);

      const marker = new window.naver.maps.Marker({
        map: mapRef.current,
        position: pos,
        title: it.title ?? "",
      });

      const info = new window.naver.maps.InfoWindow({
        content: `
          <div style="padding:10px;max-width:240px;">
            <div style="font-weight:700;margin-bottom:6px;">${it.title ?? ""}</div>
            <div style="font-size:12px;opacity:.85;margin-bottom:6px;">${it.addr1 ?? ""}</div>
            ${it.tel ? `<div style="font-size:12px;opacity:.85;">☎ ${it.tel}</div>` : ""}
          </div>
        `,
        borderWidth: 0,
        backgroundColor: "white",
        anchorSize: new window.naver.maps.Size(12, 12),
      });

      window.naver.maps.Event.addListener(marker, "click", () => {
        if (info.getMap()) info.close();
        else info.open(mapRef.current!, marker);
      });

      petMarkersRef.current.push(marker);
      petInfoRef.current.push(info);
    }

    // 이번에 그렸으니 pending 해제
    pendingDrawRef.current = false;
  }, [sdkReady, showPetPoi, petPois, clearPetMarkers]);

  // ✅ 지도 생성/내 위치 마커 세팅 (기존 로직 유지)
  const initOrUpdate = useCallback(() => {
    if (!elRef.current) return;
    if (!sdkReady) return;
    if (!window.naver?.maps) return;

    const lat =
      typeof coords?.latitude === "number" ? coords.latitude : fallback.lat;
    const lng =
      typeof coords?.longitude === "number" ? coords.longitude : fallback.lng;

    const center = new window.naver.maps.LatLng(lat, lng);

    if (!mapRef.current) {
      mapRef.current = new window.naver.maps.Map(elRef.current, {
        center,
        zoom: 15,
        minZoom: 10,
      });

      markerRef.current = new window.naver.maps.Marker({
        position: center,
        map: mapRef.current,
      });

      // ✅ "토글 ON을 이미 눌러둔 상태"로 지도 생성이 늦게 된 경우에만 그리기
      if (pendingDrawRef.current) {
        // 여기서 drawPetMarkers를 직접 deps로 물리지 않기 위해, 다음 tick에서 실행
        queueMicrotask(() => drawPetMarkers());
      }
    } else {
      markerRef.current?.setPosition(center);

      // (선택) map이 이미 있는데 pending이 남아있다면 그리기 시도
      if (pendingDrawRef.current) {
        queueMicrotask(() => drawPetMarkers());
      }
    }
  }, [coords, sdkReady, fallback, drawPetMarkers]);

  useEffect(() => {
    initOrUpdate();
  }, [initOrUpdate]);

  // ✅ 토글 ON/OFF, petPois 변경 시에만 POI 마커 갱신
  useEffect(() => {
    drawPetMarkers();
  }, [drawPetMarkers]);

  // ✅ (pubsub) REQUEST_MY_LOCATION 구독 → refresh 실행
  useEffect(() => {
    if (!cmd) return;
    if (cmd.type !== "REQUEST_MY_LOCATION") return;

    refresh();
    clearCmd();
  }, [cmd, refresh, clearCmd]);

  // ✅ 위치 결과가 오면: myPos 업데이트 + 지도 이동 커맨드 발행
  useEffect(() => {
    const lat = coords?.latitude;
    const lng = coords?.longitude;

    if (typeof lat === "number" && typeof lng === "number") {
      const pos = { lat, lng };
      setMyPos(pos);
      emitCmd({ type: "MOVE_TO", pos, zoom: 15, animate: true });
      return;
    }

    if (error) {
      setMyPos(fallback);
      emitCmd({ type: "MOVE_TO", pos: fallback, zoom: 15, animate: true });
    }
  }, [coords, error, setMyPos, emitCmd, fallback]);

  // ✅ MOVE_TO 구독 → 실제 지도 이동 실행
  useEffect(() => {
    if (!cmd) return;
    if (cmd.type !== "MOVE_TO") return;
    if (!mapRef.current || !window.naver?.maps) return;

    const ll = new window.naver.maps.LatLng(cmd.pos.lat, cmd.pos.lng);

    if (typeof cmd.zoom === "number") mapRef.current.setZoom(cmd.zoom);

    const animate = cmd.animate ?? true;
    if (animate && (mapRef.current as any).panTo)
      (mapRef.current as any).panTo(ll);
    else mapRef.current.setCenter(ll);

    markerRef.current?.setPosition(ll);

    clearCmd();
  }, [cmd, clearCmd]);

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
