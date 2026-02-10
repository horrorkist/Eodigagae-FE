"use client";

import { RefObject, createElement, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useMapStore } from "@/stores/mapStore";
import { useModalStore } from "@/stores/modal";
import { getGeoErrorInfo } from "@/lib/geolocationErrors";
import { useEmit, useOn } from "@/hooks/useEventBus";

const FALLBACK = { lat: 37.5665, lng: 126.978 };

export function useMapMyLocation(
  mapRef: RefObject<naver.maps.Map | null>,
  sdkReady: boolean,
) {
  const myMarkerRef = useRef<naver.maps.Marker>(null);
  const destMarkerRef = useRef<naver.maps.Marker>(null);
  const moveMarkerListenerRef = useRef<naver.maps.MapEventListener | null>(
    null,
  );
  const manualPosRef = useRef(false);
  const lastGeoRef = useRef<{ lat: number; lng: number } | null>(null);

  const setMyPos = useMapStore((s) => s.setMyPos);
  const setPickedPos = useMapStore((s) => s.setPickedPos);
  const emit = useEmit();

  const { coords, error, refresh } = useGeolocation({
    watch: false,
    immediate: true,
    enableHighAccuracy: true,
  });

  const openModal = useModalStore((s) => s.open);

  // geolocation 오류 → 모달 표시
  useEffect(() => {
    if (!error) return;

    const info = getGeoErrorInfo(error);

    openModal({
      title: info.title,
      icon: createElement(FontAwesomeIcon, {
        icon: faLocationDot,
        className: "w-8 h-8 text-red-400",
      }),
      body: createElement(
        "div",
        { className: "space-y-1" },
        createElement("p", null, info.description),
        createElement(
          "p",
          { className: "text-xs text-gray-400" },
          info.suggestion,
        ),
      ),
    });
  }, [error, openModal]);

  // 지도 생성 시 내 마커 초기화
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.naver?.maps) return;
    if (myMarkerRef.current) return;

    myMarkerRef.current = new window.naver.maps.Marker({
      position: mapRef.current.getCenter(),
      map: mapRef.current,
    });
  }, [sdkReady, mapRef]);

  const geoLat = coords?.latitude;
  const geoLng = coords?.longitude;

  // geolocation → MOVE_TO 발행 (MOVE_TO 핸들러가 setMyPos 담당)
  useEffect(() => {
    if (manualPosRef.current) return;

    if (typeof geoLat === "number" && typeof geoLng === "number") {
      const last = lastGeoRef.current;
      if (last && last.lat === geoLat && last.lng === geoLng) return;

      lastGeoRef.current = { lat: geoLat, lng: geoLng };

      emit({
        type: "MOVE_TO",
        pos: { lat: geoLat, lng: geoLng },
        zoom: 15,
        animate: true,
        channel: "map",
      });
      return;
    }

    if (error) {
      emit({
        type: "MOVE_TO",
        pos: FALLBACK,
        zoom: 15,
        animate: true,
        channel: "map",
      });
    }
  }, [geoLat, geoLng, error, emit]);

  // REQUEST_MY_LOCATION → GPS 새로고침
  useOn("map", "REQUEST_MY_LOCATION", () => {
    manualPosRef.current = false;
    lastGeoRef.current = null;

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

  // 내 위치 수동 변경: 클릭 1회로 MOVE_TO
  useOn("map", "MOVE_MY_MARKER_READY", () => {
    if (!mapRef.current || !myMarkerRef.current) return;
    if (!window.naver?.maps) return;

    if (moveMarkerListenerRef.current) {
      mapRef.current.removeListener(moveMarkerListenerRef.current);
      moveMarkerListenerRef.current = null;
    }

    const listener = mapRef.current.addListenerOnce(
      "click",
      (event: naver.maps.PointerEvent) => {
        const lng = event.coord.x;
        const lat = event.coord.y;

        manualPosRef.current = true;
        const pos = { lat, lng };

        emit({ type: "MOVE_TO", pos, zoom: 15, animate: true, channel: "map" });
        emit({ type: "MY_MARKER_MOVED", channel: "map" });
      },
    );

    moveMarkerListenerRef.current = listener;
  });

  useOn("map", "MOVE_MY_MARKER_CANCELLED", () => {
    if (!mapRef.current) return;
    const l = moveMarkerListenerRef.current;
    if (!l) return;
    mapRef.current.removeListener(l);
    moveMarkerListenerRef.current = null;
  });

  // 도착지 수동 변경: 클릭 1회로 마커 배치
  useOn("map", "MOVE_DEST_READY", () => {
    if (!mapRef.current) return;
    if (!window.naver?.maps) return;

    if (moveMarkerListenerRef.current) {
      mapRef.current.removeListener(moveMarkerListenerRef.current);
      moveMarkerListenerRef.current = null;
    }

    const listener = mapRef.current.addListenerOnce(
      "click",
      (event: naver.maps.PointerEvent) => {
        const lng = event.coord.x;
        const lat = event.coord.y;

        if (!destMarkerRef.current) {
          destMarkerRef.current = new window.naver.maps.Marker({
            map: mapRef.current!,
            position: { x: lng, y: lat },
          });
        } else {
          destMarkerRef.current.setPosition({ x: lng, y: lat });
        }

        setPickedPos({ lat, lng });
        emit({ type: "DEST_MOVED", channel: "map" });
      },
    );

    moveMarkerListenerRef.current = listener;
  });

  useOn("map", "MOVE_DEST_CANCELLED", () => {
    if (!mapRef.current) return;
    const l = moveMarkerListenerRef.current;
    if (!l) return;
    mapRef.current.removeListener(l);
    moveMarkerListenerRef.current = null;
  });

  // MOVE_TO → 지도 이동 + 내 마커 이동 + myPos 반영
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

  // cleanup
  useEffect(() => {
    return () => {
      try {
        if (mapRef.current && moveMarkerListenerRef.current) {
          mapRef.current.removeListener(moveMarkerListenerRef.current);
        }
      } finally {
        moveMarkerListenerRef.current = null;
      }
    };
  }, [mapRef]);
}
