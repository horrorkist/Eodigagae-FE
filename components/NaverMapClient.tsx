"use client";

import { useGeolocation } from "@/hooks/useGeolocation";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useEmit, useOn } from "@/hooks/useEventBus";
import { PetPoiItem } from "@/types/mapEvents";

export default function NaverMapClient(props: {
  showPetPoi: boolean;
  petPois: PetPoiItem[];
}) {
  const { showPetPoi, petPois } = props;

  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map>(null);

  // 내 위치 마커
  const myMarkerRef = useRef<naver.maps.Marker>(null);

  // POI 핀/라벨 마커
  const petPinMarkersRef = useRef<naver.maps.Marker[]>([]);
  const petLabelMarkersRef = useRef<naver.maps.Marker[]>([]);

  // "내 위치 변경" 클릭 리스너 (1회용)
  const moveMyMarkerListenerRef = useRef<naver.maps.MapEventListener | null>(
    null,
  );

  // 지도 생성이 늦었는데 토글 ON이면, 지도 생성 직후 1회 그리기
  const pendingDrawRef = useRef(false);

  // 수동 위치 변경을 했으면, geolocation이 덮어쓰지 않게(원하면 제거 가능)
  const manualPosRef = useRef(false);

  const [sdkReady, setSdkReady] = useState(false);

  const setMyPos = useMapStore((s) => s.setMyPos);
  const emit = useEmit();

  const fallback = useMemo(() => ({ lat: 37.5665, lng: 126.978 }), []);

  const { coords, error, refresh } = useGeolocation({
    watch: false,
    immediate: true,
    enableHighAccuracy: true,
  });

  // -----------------------------
  // POI 마커 유틸
  // -----------------------------
  const clearPetMarkers = useCallback(() => {
    for (const m of petLabelMarkersRef.current) m.setMap(null);
    petLabelMarkersRef.current = [];

    for (const m of petPinMarkersRef.current) m.setMap(null);
    petPinMarkersRef.current = [];
  }, []);

  const makeLabelHTML = useCallback((title: string) => {
    const safe = (title ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    return `
      <div style="
        transform: translate(-50%, -120%);
        background: rgba(255,255,255,.92);
        border: 1px solid rgba(0,0,0,.15);
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 12px;
        line-height: 1;
        box-shadow: 0 2px 10px rgba(0,0,0,.12);
        white-space: nowrap;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
      ">${safe}</div>
    `;
  }, []);

  const drawPetMarkers = useCallback(() => {
    if (!sdkReady) return;
    if (!window.naver?.maps) return;

    // OFF면 제거
    if (!showPetPoi) {
      clearPetMarkers();
      return;
    }

    // ON인데 map이 아직 없으면 예약
    if (!mapRef.current) {
      pendingDrawRef.current = true;
      return;
    }

    clearPetMarkers();

    for (const it of petPois ?? []) {
      const lng = Number(it.mapx);
      const lat = Number(it.mapy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const pos = new window.naver.maps.LatLng(lat, lng);

      const pin = new window.naver.maps.Marker({
        map: mapRef.current,
        position: pos,
        title: it.title ?? "",
      });

      const label = new window.naver.maps.Marker({
        map: mapRef.current,
        position: pos,
        clickable: false,
        icon: {
          content: makeLabelHTML(it.title ?? ""),
          anchor: new window.naver.maps.Point(0, 0),
        },
        zIndex: 1000,
      });

      petPinMarkersRef.current.push(pin);
      petLabelMarkersRef.current.push(label);
    }

    pendingDrawRef.current = false;
  }, [sdkReady, showPetPoi, petPois, clearPetMarkers, makeLabelHTML]);

  useEffect(() => {
    drawPetMarkers();
  }, [drawPetMarkers]);

  // -----------------------------
  // 지도 생성: 1회만
  //  - 중요: 토글/POI 변경으로 지도/내마커가 coords로 "덮어써지지" 않게
  // -----------------------------
  const initMapOnce = useCallback(() => {
    if (!elRef.current) return;
    if (!sdkReady) return;
    if (!window.naver?.maps) return;
    if (mapRef.current) return; // ✅ 이미 만들었으면 절대 건드리지 않음

    const lat =
      typeof coords?.latitude === "number" ? coords.latitude : fallback.lat;
    const lng =
      typeof coords?.longitude === "number" ? coords.longitude : fallback.lng;

    const center = new window.naver.maps.LatLng(lat, lng);

    mapRef.current = new window.naver.maps.Map(elRef.current, {
      center,
      zoom: 15,
      minZoom: 10,
    });

    myMarkerRef.current = new window.naver.maps.Marker({
      position: center,
      map: mapRef.current,
    });

    if (pendingDrawRef.current) queueMicrotask(drawPetMarkers);
  }, [
    sdkReady,
    coords?.latitude,
    coords?.longitude,
    fallback.lat,
    fallback.lng,
    drawPetMarkers,
  ]);

  useEffect(() => {
    initMapOnce();
  }, [initMapOnce]);

  // -----------------------------
  // geolocation 결과 → MOVE_TO 발행 (중복 방지 + 수동모드면 무시)
  // -----------------------------
  const geoLat = coords?.latitude;
  const geoLng = coords?.longitude;
  const lastGeoRef = useRef<{ lat: number; lng: number } | null>(null);

  // -----------------------------
  // pubsub: REQUEST_MY_LOCATION → refresh
  // -----------------------------

  useOn("map", "REQUEST_MY_LOCATION", () => {
    manualPosRef.current = false;
    lastGeoRef.current = null;

    // 즉시 이동(가능하면)
    if (
      typeof coords?.latitude === "number" &&
      typeof coords?.longitude === "number"
    ) {
      emit({
        type: "MOVE_TO",
        pos: { lat: coords.latitude, lng: coords.longitude },
        zoom: 15,
        animate: true,
        channel: "map",
      });
    }

    refresh();
  });

  // -----------------------------
  // 내 위치 변경(수동): 다음 클릭 1회로 MOVE_TO
  // -----------------------------
  useOn("map", "MOVE_MY_MARKER_READY", () => {
    if (!mapRef.current || !myMarkerRef.current) return;
    if (!window.naver?.maps) return;

    // 이전 리스너가 남아있으면 제거
    if (moveMyMarkerListenerRef.current) {
      mapRef.current.removeListener(moveMyMarkerListenerRef.current);
      moveMyMarkerListenerRef.current = null;
    }

    const listener = mapRef.current.addListenerOnce(
      "click",
      (event: naver.maps.PointerEvent) => {
        const lng = event.coord.x;
        const lat = event.coord.y;

        manualPosRef.current = true; // ✅ 이후 geolocation이 덮어쓰지 않게
        const pos = { lat, lng };

        // 상태/지도 이동은 MOVE_TO에서 통일
        emit({ type: "MOVE_TO", pos, zoom: 15, animate: true, channel: "map" });

        emit({ type: "MY_MARKER_MOVED", channel: "map" });
      },
    );

    moveMyMarkerListenerRef.current = listener;
  });

  useOn("map", "MOVE_MY_MARKER_CANCELLED", () => {
    if (!mapRef.current) return;
    const l = moveMyMarkerListenerRef.current;
    if (!l) return;
    mapRef.current.removeListener(l);
    moveMyMarkerListenerRef.current = null;
  });

  useEffect(() => {
    // 수동 위치 변경 후에는 GPS가 덮어쓰지 않게
    if (manualPosRef.current) return;

    if (typeof geoLat === "number" && typeof geoLng === "number") {
      const last = lastGeoRef.current;
      if (last && last.lat === geoLat && last.lng === geoLng) return;

      lastGeoRef.current = { lat: geoLat, lng: geoLng };

      const pos = { lat: geoLat, lng: geoLng };
      setMyPos(pos);
      emit({ type: "MOVE_TO", pos, zoom: 15, animate: true, channel: "map" });
      return;
    }

    if (error) {
      setMyPos(fallback);
      emit({
        type: "MOVE_TO",
        pos: fallback,
        zoom: 15,
        animate: true,
        channel: "map",
      });
    }
  }, [geoLat, geoLng, error, setMyPos, emit, fallback]);

  // -----------------------------
  // pubsub: MOVE_TO → 지도 이동 + 내마커 이동 + myPos 반영
  // -----------------------------
  useOn("map", "MOVE_TO", (cmd) => {
    if (!mapRef.current || !window.naver?.maps) return;

    setMyPos(cmd.pos);

    const ll = new window.naver.maps.LatLng(cmd.pos.lat, cmd.pos.lng);

    if (typeof cmd.zoom === "number") mapRef.current.setZoom(cmd.zoom);

    const animate = cmd.animate ?? true;
    if (animate && (mapRef.current as any).panTo)
      (mapRef.current as any).panTo(ll);
    else mapRef.current.setCenter(ll);

    myMarkerRef.current?.setPosition(ll);
  });

  // -----------------------------
  // cleanup: 리스너 남아있으면 제거
  // -----------------------------
  useEffect(() => {
    return () => {
      try {
        if (mapRef.current && moveMyMarkerListenerRef.current) {
          mapRef.current.removeListener(moveMyMarkerListenerRef.current);
        }
      } finally {
        moveMyMarkerListenerRef.current = null;
        clearPetMarkers();
      }
    };
  }, [clearPetMarkers]);

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
