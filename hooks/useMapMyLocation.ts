"use client";

import {
  RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  requestOrientationPermissionIfNeeded,
  useWalkHeading,
} from "@/hooks/useWalkHeading";
import {
  buildUserMarkerHTML,
  USER_MARKER_SIZE_PX,
} from "@/adapters/map/naver/userMarker";
import {
  evaluateWalkSample,
  haversineMeters,
} from "@/features/walk/location/filters";
import {
  accumulatePausedTotalMs,
  toLatLngFromCoords,
} from "@/features/walk/location/session";
import { useMapStore } from "@/stores/mapStore";
import { useModalStore } from "@/stores/modal";
import { useMapControlStore } from "@/stores/mapControlStore";
import { useCoachmarkStore } from "@/stores/coachmark";
import { getGeoErrorInfo } from "@/lib/geolocationErrors";
import {
  buildRouteMarkerHTML,
  resolveRouteMarkers,
} from "@/lib/routeMarker";
import {
  setWalkDebugRouteSnapshot,
  startWalkDebugSession,
  walkDebug,
} from "@/lib/walkDebug";
import { modalPresets } from "@/lib/modalPresets";
import { useEmit, useOn } from "@/hooks/useEventBus";
import type { LatLng } from "@/types/mapEvents";

const FALLBACK = { lat: 37.5665, lng: 126.978 };
const PREWALK_RECENTER_MIN_MOVE_M = 3;

export function useMapMyLocation(
  mapRef: RefObject<naver.maps.Map | null>,
  sdkReady: boolean,
) {
  const myMarkerRef = useRef<naver.maps.Marker>(null);
  const routeMarkerRefs = useRef<Map<string, naver.maps.Marker>>(new Map());
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
  const handledMyLocationRequestSeqRef = useRef(0);

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
  const routeExperienceSource = useMapStore((s) => s.routeExperienceSource);
  const activeRouteLegIndex = useMapStore((s) => s.activeRouteLegIndex);
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
  const setActiveRouteLegIndex = useMapStore((s) => s.setActiveRouteLegIndex);
  const setHeading = useMapStore((s) => s.setHeading);
  const markerPlacementMode = useMapControlStore((s) => s.markerPlacementMode);
  const myLocationRequestSeq = useMapControlStore((s) => s.myLocationRequestSeq);
  const isCoachmarkResolved = useCoachmarkStore((s) => s.isResolved);
  const isCoachmarkActive = useCoachmarkStore((s) => s.isActive);
  const shouldDeferGeolocation = !isCoachmarkResolved || isCoachmarkActive;
  const completeMarkerPlacement = useMapControlStore(
    (s) => s.completeMarkerPlacement,
  );

  const emit = useEmit();

  const { coords, error, refresh } = useGeolocation({
    watch: false,
    immediate: !shouldDeferGeolocation,
    enableHighAccuracy: true,
  });

  const openModal = useModalStore((s) => s.open);

  const showGeoErrorModal = useCallback(
    (geoErr: GeolocationPositionError | Error) => {
      if (shouldDeferGeolocation) return;
      const info = getGeoErrorInfo(geoErr);

      openModal(modalPresets.locationError({ info }));
    },
    [openModal, shouldDeferGeolocation],
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

  const clearRouteMarkers = useCallback(() => {
    for (const marker of routeMarkerRefs.current.values()) {
      marker.setMap(null);
    }
    routeMarkerRefs.current.clear();
  }, []);

  const syncRouteMarkers = useCallback(
    (
      markers: Array<{
        key: string;
        coordinate: [number, number];
        title: string;
        variant: "start" | "pivot" | "facility" | "destination";
        zIndex: number;
        label?: string;
        facilitySource?: "trash-bin" | "fountain";
      }>,
    ) => {
      if (!window.naver?.maps) return;

      const map = mapRef.current;
      if (!map) {
        clearRouteMarkers();
        return;
      }

      const nextKeys = new Set(markers.map((marker) => marker.key));
      for (const [key, marker] of routeMarkerRefs.current.entries()) {
        if (nextKeys.has(key)) continue;
        marker.setMap(null);
        routeMarkerRefs.current.delete(key);
      }

      for (const next of markers) {
        const position = new window.naver.maps.LatLng(
          next.coordinate[1],
          next.coordinate[0],
        );
        const icon = {
          content: buildRouteMarkerHTML({
            variant: next.variant,
            label: next.label,
            title: next.title,
            facilitySource: next.facilitySource,
          }),
          anchor: new window.naver.maps.Point(0, 0),
        };
        const existing = routeMarkerRefs.current.get(next.key);

        if (existing) {
          existing.setPosition(position);
          existing.setTitle(next.title);
          existing.setIcon(icon);
          existing.setZIndex(next.zIndex);
          existing.setMap(map);
          continue;
        }

        routeMarkerRefs.current.set(
          next.key,
          new window.naver.maps.Marker({
            map,
            position,
            title: next.title,
            clickable: false,
            icon,
            zIndex: next.zIndex,
          }),
        );
      }
    },
    [clearRouteMarkers, mapRef],
  );

  useEffect(() => {
    if (!sdkReady) return;
    syncRouteMarkers(
      resolveRouteMarkers({
        route,
        drawRoute,
        pickedPos,
        routeExperienceSource,
        walking,
        activeRouteLegIndex,
      }),
    );
  }, [
    activeRouteLegIndex,
    drawRoute,
    pickedPos,
    route,
    routeExperienceSource,
    sdkReady,
    syncRouteMarkers,
    walking,
  ]);

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

  // GPS 새로고침 요청 처리
  useEffect(() => {
    if (myLocationRequestSeq <= handledMyLocationRequestSeqRef.current) return;
    handledMyLocationRequestSeqRef.current = myLocationRequestSeq;

    manualPosRef.current = false;
    lastGeoRef.current = null;

    const currentGeoPos = toLatLngFromCoords({
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    });
    if (currentGeoPos) {
      emit({
        type: "MOVE_TO",
        pos: currentGeoPos,
        animate: true,
        channel: "map",
      });
    }

    refresh();
  }, [coords?.latitude, coords?.longitude, emit, myLocationRequestSeq, refresh]);

  useOn("map", "START_WALKING", () => {
    const startedAt = new Date().toISOString();
    manualPosRef.current = false;
    lastGeoRef.current = null;
    resetWalkingRefs();
    setHeading(null);
    setWalkedDistanceM(0);
    setWalkingPausedTotalMs(0);
    setWalkingPausedAt(null);
    setWalkingPaused(false);
    setActiveRouteLegIndex(0);
    setDrawRoute(Boolean(route?.path?.length));
    startWalkDebugSession({
      startedAt,
      routeExperienceSource,
    });
    setWalkDebugRouteSnapshot(route ?? null);
    walkDebug("walk:session:start", {
      startedAt,
      myPos,
      pickedPos,
      routeExperienceSource,
      activeRouteLegIndex: 0,
      pathPointCount: route?.path?.length ?? 0,
    });
    seedHeadingFromRoute(route?.path, myPos);

    requestOrientationPermissionIfNeeded();
    setWalkingStartedAt(Date.now());
    setWalking(true);
  });

  useOn("map", "PAUSE_WALKING", () => {
    if (!walking || walkingPaused) return;
    const pausedAt = Date.now();
    walkDebug("walk:session:pause", {
      pausedAt: new Date(pausedAt).toISOString(),
      myPos,
      routeExperienceSource,
      activeRouteLegIndex,
      walkedDistanceM: useMapStore.getState().walkedDistanceM,
    });
    setWalkingPaused(true);
    setWalkingPausedAt(pausedAt);
    resetWalkingIntervalRefs();
  });

  useOn("map", "RESUME_WALKING", () => {
    if (!walking || !walkingPaused) return;

    const now = Date.now();
    walkDebug("walk:session:resume", {
      resumedAt: new Date(now).toISOString(),
      myPos,
      routeExperienceSource,
      activeRouteLegIndex,
      pausedDurationMs:
        walkingPausedAt != null ? Math.max(0, now - walkingPausedAt) : 0,
    });
    setWalkingPausedTotalMs(
      accumulatePausedTotalMs(walkingPausedTotalMs, walkingPausedAt, now),
    );
    setWalkingPausedAt(null);
    setWalkingPaused(false);
    resetWalkingIntervalRefs();
  });

  useOn("map", "STOP_WALKING", () => {
    manualPosRef.current = false;
    lastGeoRef.current = toLatLngFromCoords(coords);

    setDrawRoute(false);
    setPickedPos(null);
    setWalking(false);
    setWalkingPaused(false);
    setWalkingStartedAt(null);
    setWalkingPausedAt(null);
    setWalkingPausedTotalMs(0);
    setWalkedDistanceM(0);
    setActiveRouteLegIndex(0);
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

        const now = Date.now();
        const nextPos = { lat: c.latitude, lng: c.longitude };
        const last = lastWalkPosRef.current;
        const rawSpeedMps =
          typeof c.speed === "number" && Number.isFinite(c.speed)
            ? c.speed
            : null;
        const accuracyM =
          typeof c.accuracy === "number" && Number.isFinite(c.accuracy)
            ? c.accuracy
            : null;
        walkDebug("walk:location:received", {
          myPos: nextPos,
          accuracyM,
          speedMps: rawSpeedMps,
          activeRouteLegIndex,
          routeExperienceSource,
        });
        const sample = evaluateWalkSample({
          nowMs: now,
          lastWalkAtMs: lastWalkAtRef.current,
          accuracyM,
          rawSpeedMps,
          lastPos: last,
          nextPos,
          lowSpeedAnchorPos: lowSpeedAnchorPosRef.current,
        });
        if (!sample.accept) {
          lowSpeedAnchorPosRef.current = sample.nextLowSpeedAnchorPos;
          walkDebug("walk:location:rejected", {
            myPos: nextPos,
            accuracyM,
            speedMps: sample.speedMps,
            activeRouteLegIndex,
            routeExperienceSource,
            movedM: sample.movedM,
            reason: sample.rejectReason,
          });
          if (sample.lowSpeed) {
            walkDebug("walk:motion:low-speed", {
              myPos: nextPos,
              accuracyM,
              speedMps: sample.speedMps,
              activeRouteLegIndex,
              routeExperienceSource,
              movedM: sample.movedM,
              reason: sample.rejectReason,
            });
          }
          return;
        }

        if (sample.distanceToAddM > 0) {
          addWalkedDistanceM(sample.distanceToAddM);
          walkDebug("walk:distance:updated", {
            myPos: nextPos,
            accuracyM,
            speedMps: sample.speedMps,
            activeRouteLegIndex,
            routeExperienceSource,
            distanceAddedM: sample.distanceToAddM,
          });
        }

        lastWalkAtRef.current = now;
        lastWalkPosRef.current = nextPos;
        lowSpeedAnchorPosRef.current = sample.nextLowSpeedAnchorPos;

        walkDebug("walk:location:accepted", {
          myPos: nextPos,
          accuracyM,
          speedMps: sample.speedMps,
          activeRouteLegIndex,
          routeExperienceSource,
          movedM: sample.movedM,
          distanceAddedM: sample.distanceToAddM,
        });
        if (sample.lowSpeed) {
          walkDebug("walk:motion:low-speed", {
            myPos: nextPos,
            accuracyM,
            speedMps: sample.speedMps,
            activeRouteLegIndex,
            routeExperienceSource,
            movedM: sample.movedM,
            reason: "accepted-low-speed",
          });
        }
        updateMyPosition(nextPos);

        const gpsHeading =
          typeof c.heading === "number" && Number.isFinite(c.heading)
            ? c.heading
            : null;
        updateHeadingFromPosition({
          now,
          gpsHeading,
          speedMps: sample.speedMps,
          accuracyM,
          movedM: sample.movedM,
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
    activeRouteLegIndex,
    walking,
    walkingPaused,
    routeExperienceSource,
    updateHeadingFromPosition,
    showGeoErrorModal,
    updateMyPosition,
    addWalkedDistanceM,
    clearWalkWatch,
    setActiveRouteLegIndex,
  ]);

  // 내 위치/도착지 수동 배치 모드 처리 (지도 클릭 1회)
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.naver?.maps) return;

    clearMoveMarkerListener();
    if (markerPlacementMode === "none") return;

    const listener = mapRef.current.addListenerOnce(
      "click",
      (event: naver.maps.PointerEvent) => {
        const lng = event.coord.x;
        const lat = event.coord.y;

        if (markerPlacementMode === "my") {
          manualPosRef.current = true;
          emit({
            type: "MOVE_TO",
            pos: { lat, lng },
            zoom: 15,
            animate: true,
            channel: "map",
          });
          completeMarkerPlacement();
          return;
        }

        const nextPickedPos = { lat, lng };
        setPickedPos(nextPickedPos);
        completeMarkerPlacement();
      },
    );

    moveMarkerListenerRef.current = listener;
    return () => {
      clearMoveMarkerListener();
    };
  }, [
    clearMoveMarkerListener,
    completeMarkerPlacement,
    emit,
    mapRef,
    markerPlacementMode,
    sdkReady,
    setPickedPos,
  ]);

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
        clearRouteMarkers();
      }
    };
  }, [clearMoveMarkerListener, clearRouteMarkers, clearWalkWatch, mapRef]);
}
