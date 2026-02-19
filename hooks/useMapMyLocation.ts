"use client";

import {
  RefObject,
  createElement,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  requestOrientationPermissionIfNeeded,
  useWalkHeading,
} from "@/hooks/useWalkHeading";
import { useMapStore } from "@/stores/mapStore";
import { useModalStore } from "@/stores/modal";
import { getGeoErrorInfo } from "@/lib/geolocationErrors";
import { useEmit, useOn } from "@/hooks/useEventBus";
import type { LatLng } from "@/types/mapEvents";

const FALLBACK = { lat: 37.5665, lng: 126.978 };
const WALK_UPDATE_INTERVAL_MS = 1000;
const MAX_WALK_ACCURACY_M = 50;
const MIN_WALK_MOVE_M = 1.5;
const USER_MARKER_SIZE_PX = 44;
const USER_DIRECTION_TRIANGLE_WIDTH_PX = 8;
const USER_DIRECTION_TRIANGLE_HEIGHT_PX = 8;
const USER_DIRECTION_TRIANGLE_TOP_OFFSET_PX = -1;
const WALK_MOVE_FROM_ACCURACY_RATIO = 0.35;
const WALK_MOVE_FROM_ACCURACY_MAX_M = 7;
const WALK_LOW_SPEED_MPS = 0.8;
const WALK_LOW_SPEED_MIN_MOVE_M = 5;
const WALK_LOW_SPEED_MOVE_MAX_M = 8;
const WALK_LOW_SPEED_MOVE_FROM_ACCURACY_RATIO = 0.6;
const WALK_STATIONARY_DRIFT_MIN_M = 8;
const WALK_STATIONARY_DRIFT_MAX_M = 16;
const WALK_STATIONARY_DRIFT_FROM_ACCURACY_RATIO = 1.0;
const WALK_SPEED_VALID_MAX_ACCURACY_M = 15;
const PREWALK_RECENTER_MIN_MOVE_M = 3;

function buildUserMarkerHTML(headingDeg: number | null, walking: boolean) {
  const directionLayer =
    walking && headingDeg != null
      ? `<div style="position:absolute;inset:0;transform:rotate(${headingDeg.toFixed(1)}deg);transform-origin:50% 50%;">
        <svg width="${USER_DIRECTION_TRIANGLE_WIDTH_PX}" height="${USER_DIRECTION_TRIANGLE_HEIGHT_PX}" viewBox="0 0 6.9282 6" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;left:50%;top:${USER_DIRECTION_TRIANGLE_TOP_OFFSET_PX}px;transform:translateX(-50%);overflow:visible;filter:drop-shadow(0 1px 1px rgba(15, 23, 42, 0.3));">
          <path d="M3.4641 0L6.9282 6H0L3.4641 0Z" fill="#FFFFFF"/>
        </svg>
      </div>`
      : "";

  return `
    <div style="width:${USER_MARKER_SIZE_PX}px;height:${USER_MARKER_SIZE_PX}px;position:relative;pointer-events:none;">
      <svg width="${USER_MARKER_SIZE_PX}" height="${USER_MARKER_SIZE_PX}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;inset:0;">
        <circle cx="22" cy="22" r="22" fill="#0BDC00" fill-opacity="0.3"/>
        <g filter="url(#user-marker-filter)">
          <circle cx="22" cy="22" r="8" fill="#0BDC00"/>
          <circle cx="22" cy="22" r="9.5" stroke="white" stroke-width="3"/>
        </g>
        <defs>
          <filter id="user-marker-filter" x="2.2" y="2.2" width="39.6" height="39.6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset/>
            <feGaussianBlur stdDeviation="4.4"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.0431373 0 0 0 0 0.862745 0 0 0 0 0 0 0 0 1 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_181_3"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_181_3" result="shape"/>
          </filter>
        </defs>
      </svg>
      ${directionLayer}
    </div>
    `;
}
function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useMapMyLocation(
  mapRef: RefObject<naver.maps.Map | null>,
  sdkReady: boolean,
) {
  const myMarkerRef = useRef<naver.maps.Marker>(null);
  const destMarkerRef = useRef<naver.maps.Marker>(null);
  const moveMarkerListenerRef = useRef<naver.maps.MapEventListener | null>(
    null,
  );
  const walkWatchIdRef = useRef<number | null>(null);

  const manualPosRef = useRef(false);
  const didInitialAutoCenterRef = useRef(false);
  const lastGeoRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastWalkAtRef = useRef(0);
  const lastWalkPosRef = useRef<LatLng | null>(null);
  const lowSpeedAnchorPosRef = useRef<LatLng | null>(null);

  const route = useMapStore((s) => s.route);
  const drawRoute = useMapStore((s) => s.drawRoute);
  const myPos = useMapStore((s) => s.myPos);
  const pickedPos = useMapStore((s) => s.pickedPos);
  const focusedPoi = useMapStore((s) => s.focusedPoi);
  const walking = useMapStore((s) => s.walking);
  const walkingPaused = useMapStore((s) => s.walkingPaused);
  const walkingPausedAt = useMapStore((s) => s.walkingPausedAt);
  const walkingPausedTotalMs = useMapStore((s) => s.walkingPausedTotalMs);
  const heading = useMapStore((s) => s.heading);
  const setMyPos = useMapStore((s) => s.setMyPos);
  const setPickedPos = useMapStore((s) => s.setPickedPos);
  const setDrawRoute = useMapStore((s) => s.setDrawRoute);
  const setWalking = useMapStore((s) => s.setWalking);
  const setWalkingPaused = useMapStore((s) => s.setWalkingPaused);
  const setWalkingStartedAt = useMapStore((s) => s.setWalkingStartedAt);
  const setWalkingPausedAt = useMapStore((s) => s.setWalkingPausedAt);
  const setWalkingPausedTotalMs = useMapStore((s) => s.setWalkingPausedTotalMs);
  const setWalkedDistanceM = useMapStore((s) => s.setWalkedDistanceM);
  const addWalkedDistanceM = useMapStore((s) => s.addWalkedDistanceM);
  const setHeading = useMapStore((s) => s.setHeading);

  const emit = useEmit();

  const { coords, error, refresh } = useGeolocation({
    watch: false,
    immediate: true,
    enableHighAccuracy: true,
  });

  const openModal = useModalStore((s) => s.open);

  const showGeoErrorModal = useCallback(
    (geoErr: GeolocationPositionError | Error) => {
      const info = getGeoErrorInfo(geoErr);

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
    },
    [openModal],
  );

  const {
    resetHeadingTracking,
    seedHeadingFromRoute,
    updateHeadingFromPosition,
  } = useWalkHeading({
    walking,
    walkingPaused,
    setHeading,
  });

  const clearMoveMarkerListener = useCallback(
    (map: naver.maps.Map | null = mapRef.current) => {
      if (!map || !moveMarkerListenerRef.current) return;
      map.removeListener(moveMarkerListenerRef.current);
      moveMarkerListenerRef.current = null;
    },
    [mapRef],
  );

  const clearWalkWatch = useCallback(() => {
    if (walkWatchIdRef.current == null) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      walkWatchIdRef.current = null;
      return;
    }

    navigator.geolocation.clearWatch(walkWatchIdRef.current);
    walkWatchIdRef.current = null;
  }, []);

  const resetWalkingRefs = useCallback(() => {
    lastWalkAtRef.current = 0;
    lastWalkPosRef.current = null;
    lowSpeedAnchorPosRef.current = null;
    resetHeadingTracking();
  }, [resetHeadingTracking]);

  const resetWalkingIntervalRefs = useCallback(() => {
    lastWalkPosRef.current = null;
    lastWalkAtRef.current = 0;
    lowSpeedAnchorPosRef.current = null;
  }, []);

  const updateMyPosition = useCallback(
    (pos: LatLng) => {
      setMyPos(pos);

      if (!window.naver?.maps) return;

      const ll = new window.naver.maps.LatLng(pos.lat, pos.lng);
      const marker = myMarkerRef.current;
      if (!marker) return;

      marker.setPosition(ll);

      const map = mapRef.current;
      if (map && marker.getMap() !== map) {
        marker.setMap(map);
      }
    },
    [mapRef, setMyPos],
  );

  const syncDestinationMarker = useCallback(
    (pos: LatLng | null) => {
      if (!window.naver?.maps) return;

      const map = mapRef.current;
      if (!map || !pos) {
        destMarkerRef.current?.setMap(null);
        return;
      }

      const markerPos = new window.naver.maps.LatLng(pos.lat, pos.lng);

      if (!destMarkerRef.current) {
        destMarkerRef.current = new window.naver.maps.Marker({
          map,
          position: markerPos,
        });
        return;
      }

      destMarkerRef.current.setPosition(markerPos);
      destMarkerRef.current.setMap(map);
    },
    [mapRef],
  );

  // 도착지 마커 동기화:
  // - pickedPos 우선
  // - pickedPos가 없고 경로가 실제로 그려지는 중이면, 경로 마지막 점으로 fallback
  useEffect(() => {
    if (!sdkReady) return;

    let markerPos: LatLng | null = pickedPos;
    if (!markerPos && drawRoute && route?.path?.length) {
      const [lng, lat] = route.path[route.path.length - 1];
      markerPos = { lat, lng };
    }

    syncDestinationMarker(markerPos);
  }, [sdkReady, pickedPos, drawRoute, route?.path, syncDestinationMarker]);

  // geolocation 오류 → 모달 표시
  useEffect(() => {
    if (!error) return;
    showGeoErrorModal(error);
  }, [error, showGeoErrorModal]);

  // 지도 생성 시 내 마커 초기화
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.naver?.maps) return;
    if (myMarkerRef.current) return;

    const hasStorePos =
      typeof myPos?.lat === "number" && typeof myPos?.lng === "number";
    const hasGeoCoords =
      typeof coords?.latitude === "number" &&
      typeof coords?.longitude === "number";
    const initialPos = hasStorePos
      ? { lat: myPos.lat, lng: myPos.lng }
      : hasGeoCoords
        ? { lat: coords.latitude, lng: coords.longitude }
        : null;
    const initialLatLng = initialPos
      ? new window.naver.maps.LatLng(initialPos.lat, initialPos.lng)
      : mapRef.current.getCenter();

    myMarkerRef.current = new window.naver.maps.Marker({
      position: initialLatLng,
      map: initialPos ? mapRef.current : undefined,
      icon: {
        content: buildUserMarkerHTML(null, false),
        anchor: new window.naver.maps.Point(
          USER_MARKER_SIZE_PX / 2,
          USER_MARKER_SIZE_PX / 2,
        ),
      },
    });
  }, [sdkReady, mapRef, myPos, coords]);

  // heading / walking 상태를 마커 아이콘에 반영
  useEffect(() => {
    if (!myMarkerRef.current || !window.naver?.maps) return;

    myMarkerRef.current.setIcon({
      content: buildUserMarkerHTML(heading, walking),
      anchor: new window.naver.maps.Point(
        USER_MARKER_SIZE_PX / 2,
        USER_MARKER_SIZE_PX / 2,
      ),
    });
  }, [heading, walking, walkingPaused]);

  const geoLat = coords?.latitude;
  const geoLng = coords?.longitude;

  // 초기 geolocation → MOVE_TO 발행 (walking 중에는 watchPosition 경로만 사용)
  useEffect(() => {
    if (walking || manualPosRef.current) return;

    if (typeof geoLat === "number" && typeof geoLng === "number") {
      const nextGeoPos = { lat: geoLat, lng: geoLng };
      const last = lastGeoRef.current;
      if (last && last.lat === geoLat && last.lng === geoLng) return;

      lastGeoRef.current = nextGeoPos;
      updateMyPosition(nextGeoPos);

      if (didInitialAutoCenterRef.current) return;
      if (focusedPoi) {
        didInitialAutoCenterRef.current = true;
        return;
      }

      if (
        myPos &&
        haversineMeters(myPos, nextGeoPos) < PREWALK_RECENTER_MIN_MOVE_M
      ) {
        didInitialAutoCenterRef.current = true;
        return;
      }

      didInitialAutoCenterRef.current = true;
      emit({
        type: "MOVE_TO",
        pos: nextGeoPos,
        zoom: 15,
        animate: true,
        channel: "map",
      });
      return;
    }

    if (error) {
      if (didInitialAutoCenterRef.current) return;
      if (focusedPoi) {
        didInitialAutoCenterRef.current = true;
        return;
      }

      didInitialAutoCenterRef.current = true;
      emit({
        type: "MOVE_TO",
        pos: FALLBACK,
        zoom: 15,
        animate: true,
        channel: "map",
      });
    }
  }, [
    geoLat,
    geoLng,
    error,
    emit,
    focusedPoi,
    myPos,
    updateMyPosition,
    walking,
  ]);

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
        animate: true,
        channel: "map",
      });
    }

    refresh();
  });

  useOn("map", "START_WALKING", () => {
    manualPosRef.current = false;
    lastGeoRef.current = null;
    resetWalkingRefs();
    setHeading(null);
    setWalkedDistanceM(0);
    setWalkingPausedTotalMs(0);
    setWalkingPausedAt(null);
    setWalkingPaused(false);
    setDrawRoute(Boolean(route?.path?.length));
    seedHeadingFromRoute(route?.path, myPos);

    requestOrientationPermissionIfNeeded();
    setWalkingStartedAt(Date.now());
    setWalking(true);
  });

  useOn("map", "PAUSE_WALKING", () => {
    if (!walking || walkingPaused) return;
    setWalkingPaused(true);
    setWalkingPausedAt(Date.now());
    resetWalkingIntervalRefs();
  });

  useOn("map", "RESUME_WALKING", () => {
    if (!walking || !walkingPaused) return;

    const now = Date.now();
    const pausedAt = walkingPausedAt ?? now;
    const pausedMs = Math.max(0, now - pausedAt);

    setWalkingPausedTotalMs(walkingPausedTotalMs + pausedMs);
    setWalkingPausedAt(null);
    setWalkingPaused(false);
    resetWalkingIntervalRefs();
  });

  useOn("map", "STOP_WALKING", () => {
    manualPosRef.current = false;
    if (
      typeof coords?.latitude === "number" &&
      typeof coords?.longitude === "number"
    ) {
      lastGeoRef.current = { lat: coords.latitude, lng: coords.longitude };
    } else {
      lastGeoRef.current = null;
    }

    setWalking(false);
    setWalkingPaused(false);
    setWalkingStartedAt(null);
    setWalkingPausedAt(null);
    setWalkingPausedTotalMs(0);
    setWalkedDistanceM(0);
    resetWalkingRefs();
    setHeading(null);
    refresh();
  });

  // walking 중 위치 갱신 (watchPosition + 1초 throttle)
  useEffect(() => {
    if (!walking || walkingPaused) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;

        if (typeof c.latitude !== "number" || typeof c.longitude !== "number") {
          return;
        }

        if (
          typeof c.accuracy === "number" &&
          c.accuracy > MAX_WALK_ACCURACY_M
        ) {
          return;
        }

        const now = Date.now();
        const sinceLastMs = now - lastWalkAtRef.current;
        if (sinceLastMs < WALK_UPDATE_INTERVAL_MS) return;

        const nextPos = { lat: c.latitude, lng: c.longitude };
        const last = lastWalkPosRef.current;
        const movedM = last ? haversineMeters(last, nextPos) : 0;
        const rawSpeedMps =
          typeof c.speed === "number" && Number.isFinite(c.speed)
            ? c.speed
            : null;
        const speedMps =
          rawSpeedMps != null &&
          (c.accuracy ?? Number.POSITIVE_INFINITY) <=
            WALK_SPEED_VALID_MAX_ACCURACY_M
            ? rawSpeedMps
            : null;
        const lowSpeedMoveThresholdM = Math.max(
          WALK_LOW_SPEED_MIN_MOVE_M,
          Math.min(
            WALK_LOW_SPEED_MOVE_MAX_M,
            Math.max(
              0,
              (c.accuracy ?? 0) * WALK_LOW_SPEED_MOVE_FROM_ACCURACY_RATIO,
            ),
          ),
        );
        const accuracyMoveThresholdM = Math.min(
          WALK_MOVE_FROM_ACCURACY_MAX_M,
          Math.max(0, (c.accuracy ?? 0) * WALK_MOVE_FROM_ACCURACY_RATIO),
        );
        const moveThresholdM = Math.max(
          MIN_WALK_MOVE_M,
          accuracyMoveThresholdM,
        );
        const isLowSpeed = speedMps == null || speedMps < WALK_LOW_SPEED_MPS;

        if (last && movedM < moveThresholdM) return;

        if (last && isLowSpeed) {
          const anchor = lowSpeedAnchorPosRef.current ?? last;
          lowSpeedAnchorPosRef.current = anchor;

          const stationaryDriftThresholdM = Math.max(
            WALK_STATIONARY_DRIFT_MIN_M,
            Math.min(
              WALK_STATIONARY_DRIFT_MAX_M,
              Math.max(
                0,
                (c.accuracy ?? 0) * WALK_STATIONARY_DRIFT_FROM_ACCURACY_RATIO,
              ),
            ),
          );
          const driftFromAnchorM = haversineMeters(anchor, nextPos);

          if (
            movedM < lowSpeedMoveThresholdM ||
            driftFromAnchorM < stationaryDriftThresholdM
          )
            return;
        }

        if (last && movedM <= 80) {
          addWalkedDistanceM(movedM);
        }

        lastWalkAtRef.current = now;
        lastWalkPosRef.current = nextPos;
        lowSpeedAnchorPosRef.current = nextPos;

        updateMyPosition(nextPos);

        const gpsHeading =
          typeof c.heading === "number" && Number.isFinite(c.heading)
            ? c.heading
            : null;
        updateHeadingFromPosition({
          now,
          gpsHeading,
          speedMps,
          accuracyM: typeof c.accuracy === "number" ? c.accuracy : null,
          movedM,
          lastPos: last,
          nextPos,
        });
      },
      (geoErr) => {
        showGeoErrorModal(geoErr);
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      },
    );

    walkWatchIdRef.current = watchId;

    return () => {
      clearWalkWatch();
    };
  }, [
    walking,
    walkingPaused,
    updateHeadingFromPosition,
    showGeoErrorModal,
    updateMyPosition,
    addWalkedDistanceM,
    clearWalkWatch,
  ]);

  // 내 위치 수동 변경: 클릭 1회로 MOVE_TO
  useOn("map", "MOVE_MY_MARKER_READY", () => {
    if (!mapRef.current || !myMarkerRef.current) return;
    if (!window.naver?.maps) return;

    clearMoveMarkerListener();

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
    clearMoveMarkerListener();
  });

  // 도착지 수동 변경: 클릭 1회로 마커 배치
  useOn("map", "MOVE_DEST_READY", () => {
    if (!mapRef.current) return;
    if (!window.naver?.maps) return;

    clearMoveMarkerListener();

    const listener = mapRef.current.addListenerOnce(
      "click",
      (event: naver.maps.PointerEvent) => {
        const lng = event.coord.x;
        const lat = event.coord.y;
        const nextPickedPos = { lat, lng };

        syncDestinationMarker(nextPickedPos);
        setPickedPos(nextPickedPos);
        emit({ type: "DEST_MOVED", channel: "map" });
      },
    );

    moveMarkerListenerRef.current = listener;
  });

  useOn("map", "MOVE_DEST_CANCELLED", () => {
    clearMoveMarkerListener();
  });

  // MOVE_TO → 지도 이동 + 내 마커 이동 + myPos 반영
  useOn("map", "MOVE_TO", (cmd) => {
    // Keep store state in sync even before map instance is ready.
    setMyPos(cmd.pos);

    if (!mapRef.current || !window.naver?.maps) return;

    const ll = new window.naver.maps.LatLng(cmd.pos.lat, cmd.pos.lng);

    if (typeof cmd.zoom === "number") mapRef.current.setZoom(cmd.zoom);

    const animate = cmd.animate ?? true;
    if (animate) mapRef.current.panTo(ll);
    else mapRef.current.setCenter(ll);

    if (myMarkerRef.current) {
      myMarkerRef.current.setPosition(ll);
      if (myMarkerRef.current.getMap() !== mapRef.current) {
        myMarkerRef.current.setMap(mapRef.current);
      }
    }
  });

  // cleanup
  useEffect(() => {
    const map = mapRef.current;

    return () => {
      try {
        clearMoveMarkerListener(map);
        clearWalkWatch();
      } finally {
        moveMarkerListenerRef.current = null;
        walkWatchIdRef.current = null;
        myMarkerRef.current?.setMap(null);
        destMarkerRef.current?.setMap(null);
      }
    };
  }, [clearMoveMarkerListener, clearWalkWatch, mapRef]);
}
