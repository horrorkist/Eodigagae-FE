// MapPage.tsx
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomSheet, {
  type BottomSheetHeightMotion,
} from "@/components/BottomSheet";
import FocusedPoiSheet from "@/components/FocusedPoiSheet";
import MapOverlay from "@/components/MapOverlay";
import SheetTabs from "@/components/map-page/SheetTabs";
import PoiTabContent from "@/components/map-page/PoiTabContent";
import RouteTabContent from "@/components/map-page/RouteTabContent";
import SearchResultsBottomSheetContent from "@/components/map-page/SearchResultsBottomSheetContent";
import SearchOverlayPanel from "@/components/map-page/SearchOverlayPanel";
import { useMapStore } from "@/stores/mapStore";
import { useBottomSheetStore } from "@/stores/bottomSheet";
import { useMapViewportStore } from "@/stores/mapViewport";
import { useBottomNavOverrideStore } from "@/stores/bottomNavOverride";
import { usePetPoiController } from "@/hooks/usePetPoiController";
import { useMapRuntime } from "@/hooks/useMapRuntime";
import { useMapFacilitiesProbe } from "@/hooks/useMapFacilitiesProbe";
import { useDogStore, type DogInfoFormDraft } from "@/stores/dogStore";
import { useModalStore } from "@/stores/modal";
import { useEmit } from "@/hooks/useEventBus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { fromHomePoiListItem, fromTmapPoi } from "@/lib/focusedPoi";
import { mergeAndSortHomePois } from "@/lib/homePoiNormalizer";
import WalkDebugPanel from "@/components/WalkDebugPanel";
import {
  isWalkDebugPanelVisible,
  subscribeWalkDebugUpdates,
} from "@/lib/walkDebug";
import CoachmarkTour from "@/components/CoachmarkTour";
import HomePetPoiLayerBridge from "@/components/map-shell/HomePetPoiLayerBridge";
import HomeFacilitiesPoiLayerBridge from "@/components/map-shell/HomeFacilitiesPoiLayerBridge";
import {
  appIconPuppy,
  appIconTrashbin,
  appIconWaterdrop,
} from "@/components/icons/definitions.generated";
import { useRouteRecommendStore } from "@/stores/routeRecommendStore";
import { fetchRouteRecommendations } from "@/services/routeRecommend";
import { fetchPoiRouteRecommendations } from "@/services/routes";
import { fetchTmapPois } from "@/services/tmapPois";
import type { FacilityHomePoiListItem, HomePoiListItem } from "@/types/homePoi";
import type { FocusedPoi } from "@/types/focusedPoi";
import type { RouteRecommendation } from "@/types/routeRecommend";
import type { TmapPoi, TmapPoiSearchSort } from "@/types/tmapPoi";

type HomeTabMode = "main" | "poi";
type SheetViewMode = "home" | "searchResults";
type FocusedEntrySnapshot = {
  sheetViewMode: SheetViewMode;
  homeTabMode: HomeTabMode;
  bottomSheetIsOpen: boolean;
  bottomSheetIndex: number;
};
type RoutePlanningSource = "dog-recommend" | "poi-route";
type PoiRouteReturnTarget =
  | { kind: "focused"; poi: FocusedPoi }
  | { kind: "sheet"; snapshot: FocusedEntrySnapshot }
  | null;

const POI_INITIAL_RENDER_COUNT = 16;
const POI_RENDER_BATCH_COUNT = 12;
const SEARCH_RESULTS_ENTRY_SNAP_INDEX = 1;
const HOME_BOTTOM_SHEET_PEEK_HEIGHT = 30;
const SEARCH_QUERY_KEY = "search";
const FOCUS_QUERY_KEY = "focus";
const DEFAULT_BOTTOM_SHEET_MOTION: BottomSheetHeightMotion = {
  durationMs: 0,
  easing: "linear",
};

function isLatLngCoord(
  coord: naver.maps.Coord | null | undefined,
): coord is naver.maps.LatLng {
  if (!coord) return false;
  return (
    "lat" in coord &&
    "lng" in coord &&
    typeof coord.lat === "function" &&
    typeof coord.lng === "function"
  );
}

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emit = useEmit();
  const showWalkDebugPanel = useSyncExternalStore(
    subscribeWalkDebugUpdates,
    isWalkDebugPanelVisible,
    () => true,
  );
  const { mapRef, sdkReady } = useMapRuntime();

  const myPos = useMapStore((s) => s.myPos);
  const focusedPoi = useMapStore((s) => s.focusedPoi);
  const setFocusedPoi = useMapStore((s) => s.setFocusedPoi);
  const clearFocusedPoi = useMapStore((s) => s.clearFocusedPoi);
  const submittedSearchPois = useMapStore((s) => s.submittedSearchPois);
  const submittedSearchKeyword = useMapStore((s) => s.submittedSearchKeyword);
  const submittedSearchSort = useMapStore((s) => s.submittedSearchSort);
  const submittedSearchCenter = useMapStore((s) => s.submittedSearchCenter);
  const submittedSearchSeq = useMapStore((s) => s.submittedSearchSeq);
  const commitSubmittedSearchPois = useMapStore(
    (s) => s.commitSubmittedSearchPois,
  );
  const consumePendingSearchResultsRevealSeq = useMapStore(
    (s) => s.consumePendingSearchResultsRevealSeq,
  );
  const setPickedPos = useMapStore((s) => s.setPickedPos);
  const setRouteState = useMapStore((s) => s.setRouteState);
  const walking = useMapStore((s) => s.walking);
  const setRouteSceneMode = useMapStore((s) => s.setRouteSceneMode);
  const resetRouteSceneMode = useMapStore((s) => s.resetRouteSceneMode);
  const bottomSheetOffsetPx = useMapViewportStore((s) => s.bottomSheetOffsetPx);
  const focusedSheetHeightPx = useMapViewportStore(
    (s) => s.focusedSheetHeightPx,
  );
  const setBottomSheetOffsetPx = useMapViewportStore(
    (s) => s.setBottomSheetOffsetPx,
  );
  const resetBottomSheetOffset = useMapViewportStore(
    (s) => s.resetBottomSheetOffset,
  );
  const setFocusedSheetHeightPx = useMapViewportStore(
    (s) => s.setFocusedSheetHeightPx,
  );
  const resetFocusedSheetHeight = useMapViewportStore(
    (s) => s.resetFocusedSheetHeight,
  );

  const dog = useDogStore((s) => s.dog);
  const clearSubmittedSearchPois = useMapStore((s) => s.clearSubmittedSearchPois);
  const openBottomSheet = useBottomSheetStore((s) => s.open);
  const closeBottomSheet = useBottomSheetStore((s) => s.close);
  const bottomSheetIndex = useBottomSheetStore((s) => s.index);
  const bottomSheetIsOpen = useBottomSheetStore((s) => s.isOpen);
  const openModal = useModalStore((s) => s.open);
  const routeRecommendations = useRouteRecommendStore((s) => s.recommendations);
  const selectedRouteId = useRouteRecommendStore((s) => s.selectedRouteId);
  const routeRecommendLoading = useRouteRecommendStore((s) => s.loading);
  const routeRecommendError = useRouteRecommendStore((s) => s.error);
  const startRouteRecommendLoading = useRouteRecommendStore(
    (s) => s.startLoading,
  );
  const setRouteRecommendations = useRouteRecommendStore(
    (s) => s.setRecommendations,
  );
  const setRouteRecommendError = useRouteRecommendStore((s) => s.setError);
  const selectRouteRecommendation = useRouteRecommendStore(
    (s) => s.selectRoute,
  );
  const clearRouteRecommendations = useRouteRecommendStore((s) => s.clear);
  const showStartPointCta = useBottomNavOverrideStore(
    (s) => s.showStartPointCta,
  );
  const setStartPointConfirmDisabled = useBottomNavOverrideStore(
    (s) => s.setStartPointConfirmDisabled,
  );
  const clearBottomNavOverride = useBottomNavOverrideStore(
    (s) => s.clearOverride,
  );

  const {
    petPoiOn,
    petPois,
    petPoiLoading,
    petPoiError,
    setPetPoiOn,
    clearPetPoiError,
  } = usePetPoiController({
    radius: 10000,
    numOfRows: 80,
    grid: 0.002,
    revalidate: 600, // 서버 캐시 10분
    cooldownMs: 10 * 60 * 1000, // 클라 쿨다운 10분
  });

  const [showBin, setShowBin] = useState<boolean>(false);
  const [showWater, setShowWater] = useState<boolean>(false);
  const facilitiesProbe = useMapFacilitiesProbe({
    mapRef,
    sdkReady,
    waterEnabled: showWater,
    trashEnabled: showBin,
  });
  const [bottomSheetFloatingMotion, setBottomSheetFloatingMotion] =
    useState<BottomSheetHeightMotion>(DEFAULT_BOTTOM_SHEET_MOTION);
  const [searchResultSortLoading, setSearchResultSortLoading] = useState(false);
  const [searchResultSortError, setSearchResultSortError] = useState<string | null>(
    null,
  );
  const [optimisticSearchSort, setOptimisticSearchSort] =
    useState<TmapPoiSearchSort | null>(null);

  const hasSubmittedSearchResults = submittedSearchPois.length > 0;

  const [homeTabMode, setHomeTabMode] = useState<HomeTabMode>("main");
  const [sheetViewMode, setSheetViewMode] = useState<SheetViewMode>("home");
  const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(false);
  const [isStartPointSelectionMode, setIsStartPointSelectionMode] =
    useState(false);
  const [pendingRouteRecommendDraft, setPendingRouteRecommendDraft] =
    useState<DogInfoFormDraft | null>(null);
  const [routePlanningSource, setRoutePlanningSource] =
    useState<RoutePlanningSource | null>(null);
  const [poiRouteReturnTarget, setPoiRouteReturnTarget] =
    useState<PoiRouteReturnTarget>(null);
  const isSearchOverlayOpen = searchParams.get(SEARCH_QUERY_KEY) === "1";
  const shouldFocusSearchInput = searchParams.get(FOCUS_QUERY_KEY) === "1";
  const [preferRouteRecommendSheet, setPreferRouteRecommendSheet] = useState(
    () => !dog,
  );
  const activeHomeTabMode: HomeTabMode = homeTabMode;
  const activeSheetViewMode: SheetViewMode =
    !hasSubmittedSearchResults && sheetViewMode === "searchResults"
      ? "home"
      : sheetViewMode;
  const [visiblePoiCount, setVisiblePoiCount] = useState(
    POI_INITIAL_RENDER_COUNT,
  );
  const poiLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastPetPoiErrorRef = useRef<string | null>(null);
  const lastWaterErrorRef = useRef<string | null>(null);
  const lastTrashErrorRef = useRef<string | null>(null);
  const focusedEntrySnapshotRef = useRef<FocusedEntrySnapshot | null>(null);
  const focusedCapturedByLocalHandlerRef = useRef(false);
  const prevFocusedPoiIdRef = useRef<string | null>(focusedPoi?.id ?? null);
  const hasAnyPoiSourceOn = petPoiOn || showWater || showBin;
  const referencePos = myPos ?? facilitiesProbe.referenceCenter;
  const mergedPoiList = useMemo(
    () =>
      mergeAndSortHomePois({
        petPois,
        fountains: facilitiesProbe.water.items,
        trashBins: facilitiesProbe.trash.items,
        enabledSources: {
          kto: petPoiOn,
          fountain: showWater,
          "trash-bin": showBin,
        },
        referencePos,
      }),
    [
      facilitiesProbe.trash.items,
      facilitiesProbe.water.items,
      petPoiOn,
      petPois,
      referencePos,
      showBin,
      showWater,
    ],
  );
  const visiblePois = useMemo(
    () => mergedPoiList.slice(0, visiblePoiCount),
    [mergedPoiList, visiblePoiCount],
  );
  const facilityMarkerPois = useMemo(
    () =>
      mergedPoiList.filter(
        (poi): poi is FacilityHomePoiListItem =>
          poi.source === "fountain" || poi.source === "trash-bin",
      ),
    [mergedPoiList],
  );
  const hasMorePois = visiblePoiCount < mergedPoiList.length;
  const poiListLoading =
    (petPoiOn && petPoiLoading) ||
    (showWater && facilitiesProbe.water.loading) ||
    (showBin && facilitiesProbe.trash.loading);
  const focusedFloatingOffsetPx = useMemo(
    () => Math.max(0, focusedSheetHeightPx - HOME_BOTTOM_SHEET_PEEK_HEIGHT),
    [focusedSheetHeightPx],
  );

  const loadMorePois = useCallback(() => {
    setVisiblePoiCount((prev) =>
      Math.min(prev + POI_RENDER_BATCH_COUNT, mergedPoiList.length),
    );
  }, [mergedPoiList.length]);

  const buildFocusedEntrySnapshot = useCallback(
    (): FocusedEntrySnapshot => ({
      sheetViewMode: activeSheetViewMode,
      homeTabMode: activeHomeTabMode,
      bottomSheetIsOpen,
      bottomSheetIndex,
    }),
    [
      activeHomeTabMode,
      activeSheetViewMode,
      bottomSheetIndex,
      bottomSheetIsOpen,
    ],
  );

  const captureFocusedEntrySnapshot = useCallback(
    (capturedByLocalHandler: boolean) => {
      focusedEntrySnapshotRef.current = buildFocusedEntrySnapshot();
      focusedCapturedByLocalHandlerRef.current = capturedByLocalHandler;
    },
    [buildFocusedEntrySnapshot],
  );

  const restoreFocusedEntrySnapshot = useCallback(
    (snapshot: FocusedEntrySnapshot | null) => {
      if (!snapshot) return;

      setSheetViewMode(snapshot.sheetViewMode);
      setHomeTabMode(snapshot.homeTabMode);

      if (snapshot.bottomSheetIsOpen) {
        requestAnimationFrame(() => {
          openBottomSheet(snapshot.bottomSheetIndex);
        });
        return;
      }

      closeBottomSheet();
    },
    [closeBottomSheet, openBottomSheet],
  );

  const handleFocusHomePoi = useCallback(
    (poi: HomePoiListItem) => {
      captureFocusedEntrySnapshot(true);
      closeBottomSheet();
      setFocusedPoi(fromHomePoiListItem(poi));
    },
    [captureFocusedEntrySnapshot, closeBottomSheet, setFocusedPoi],
  );

  const handleFocusSearchResultPoi = useCallback(
    (poi: TmapPoi) => {
      captureFocusedEntrySnapshot(true);
      closeBottomSheet();
      setFocusedPoi(fromTmapPoi(poi));
    },
    [captureFocusedEntrySnapshot, closeBottomSheet, setFocusedPoi],
  );

  const handleFocusedPoiClose = useCallback(() => {
    const snapshot = focusedEntrySnapshotRef.current;
    clearFocusedPoi();
    restoreFocusedEntrySnapshot(snapshot);
  }, [clearFocusedPoi, restoreFocusedEntrySnapshot]);

  const handleFocusedPoiHeightChange = useCallback(
    (heightPx: number) => {
      setFocusedSheetHeightPx(heightPx);
    },
    [setFocusedSheetHeightPx],
  );

  const handleBottomSheetVisibleHeightChange = useCallback(
    (heightPx: number, motion?: BottomSheetHeightMotion) => {
      setBottomSheetOffsetPx(heightPx);
      setBottomSheetFloatingMotion(motion ?? DEFAULT_BOTTOM_SHEET_MOTION);
    },
    [setBottomSheetOffsetPx],
  );

  const applyRecommendationRoute = useCallback(
    (recommendation: RouteRecommendation) => {
      setPickedPos({
        lat: recommendation.waypoint.lat,
        lng: recommendation.waypoint.lng,
      });
      setRouteState({
        route: recommendation.route,
        routeRawResponse: null,
        routeLoading: false,
        routeError: null,
        drawRoute: true,
      });
    },
    [setPickedPos, setRouteState],
  );

  const reopenRouteRecommendForm = useCallback(() => {
    setRoutePlanningSource(null);
    setPoiRouteReturnTarget(null);
    setPreferRouteRecommendSheet(true);
    setHomeTabMode("main");
    setSheetViewMode("home");
    requestAnimationFrame(() => {
      openBottomSheet(0);
    });
  }, [openBottomSheet]);

  const handleRequestDogEdit = useCallback(() => {
    setRoutePlanningSource(null);
    setPoiRouteReturnTarget(null);
    setPreferRouteRecommendSheet(true);
    setHomeTabMode("main");
    setSheetViewMode("home");
    setIsRoutePlanningMode(false);
    setIsStartPointSelectionMode(false);
    setPendingRouteRecommendDraft(null);
  }, []);

  const handleRouteRecommendRequested = useCallback(
    (draft: DogInfoFormDraft) => {
      setRoutePlanningSource(null);
      setPoiRouteReturnTarget(null);
      setPendingRouteRecommendDraft(draft);
      setPreferRouteRecommendSheet(true);
      setHomeTabMode("main");
      setSheetViewMode("home");
      setIsRoutePlanningMode(false);
      setIsStartPointSelectionMode(true);
      closeBottomSheet();
    },
    [closeBottomSheet],
  );

  const handleStartPointBack = useCallback(() => {
    setRoutePlanningSource(null);
    setPoiRouteReturnTarget(null);
    setIsStartPointSelectionMode(false);
    setPendingRouteRecommendDraft(null);
    reopenRouteRecommendForm();
  }, [reopenRouteRecommendForm]);

  const handleStartPointConfirm = useCallback(async () => {
    if (routeRecommendLoading) return;
    if (!pendingRouteRecommendDraft) {
      openModal({
        title: "추천 정보를 확인할 수 없어요",
        body: <p>반려견 정보를 다시 입력한 뒤 시도해 주세요.</p>,
      });
      return;
    }

    const center = mapRef.current?.getCenter();
    const centerLat = isLatLngCoord(center) ? center.lat() : NaN;
    const centerLng = isLatLngCoord(center) ? center.lng() : NaN;

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      openModal({
        title: "지도 중심 좌표를 확인할 수 없어요",
        body: <p>지도가 로드된 뒤 다시 시도해 주세요.</p>,
      });
      return;
    }

    startRouteRecommendLoading();

    try {
      const response = await fetchRouteRecommendations({
        start: { lat: centerLat, lng: centerLng },
        draft: pendingRouteRecommendDraft,
      });
      setRouteRecommendations(response.recommendations, response.meta);

      if (response.recommendations.length === 0) {
        const message = "조건에 맞는 추천 경로를 찾지 못했어요.";
        setRouteRecommendError(message);
        setRoutePlanningSource(null);
        setPoiRouteReturnTarget(null);
        setIsRoutePlanningMode(false);
        setIsStartPointSelectionMode(false);
        setPendingRouteRecommendDraft(null);
        reopenRouteRecommendForm();
        openModal({
          title: "추천 경로를 찾지 못했어요",
          body: <p>{message}</p>,
        });
        return;
      }

      const firstRecommendation = response.recommendations[0];
      selectRouteRecommendation(firstRecommendation.id);
      applyRecommendationRoute(firstRecommendation);

      setRoutePlanningSource("dog-recommend");
      setPoiRouteReturnTarget(null);
      setPreferRouteRecommendSheet(false);
      setIsStartPointSelectionMode(false);
      setPendingRouteRecommendDraft(null);
      setIsRoutePlanningMode(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "추천 경로를 불러오지 못했어요.";

      setRouteRecommendError(message);
      setRoutePlanningSource(null);
      setPoiRouteReturnTarget(null);
      setIsRoutePlanningMode(false);
      setIsStartPointSelectionMode(false);
      setPendingRouteRecommendDraft(null);
      reopenRouteRecommendForm();
      openModal({
        title: "추천 경로를 불러오지 못했어요",
        body: <p>{message}</p>,
      });
    }
  }, [
    applyRecommendationRoute,
    mapRef,
    openModal,
    pendingRouteRecommendDraft,
    reopenRouteRecommendForm,
    routeRecommendLoading,
    selectRouteRecommendation,
    setRouteRecommendError,
    setRouteRecommendations,
    startRouteRecommendLoading,
  ]);

  const restorePoiRouteOrigin = useCallback(
    (target: PoiRouteReturnTarget) => {
      if (!target) return;

      if (target.kind === "focused") {
        setFocusedPoi(target.poi);
        return;
      }

      restoreFocusedEntrySnapshot(target.snapshot);
    },
    [restoreFocusedEntrySnapshot, setFocusedPoi],
  );

  const startPoiRoutePlanning = useCallback(
    async (poi: FocusedPoi, returnTarget: Exclude<PoiRouteReturnTarget, null>) => {
      if (!myPos) {
        openModal({
          title: "현재 위치가 필요해요",
          body: <p>위치 권한을 허용하거나 현재 위치를 먼저 확인한 뒤 다시 시도해 주세요.</p>,
        });
        return;
      }

      setRoutePlanningSource("poi-route");
      setPoiRouteReturnTarget(returnTarget);
      setIsStartPointSelectionMode(false);
      setIsRoutePlanningMode(true);
      startRouteRecommendLoading();
      clearFocusedPoi();
      closeBottomSheet();
      setRouteState({
        route: null,
        routeRawResponse: null,
        routeLoading: false,
        routeError: null,
        drawRoute: false,
      });

      try {
        const response = await fetchPoiRouteRecommendations({
          start: myPos,
          poi,
        });

        if (response.recommendations.length === 0) {
          throw new Error(
            response.errors[0] ?? "길찾기 경로를 불러오지 못했어요.",
          );
        }

        setRouteRecommendations(response.recommendations, null);
        const firstRecommendation = response.recommendations[0];
        selectRouteRecommendation(firstRecommendation.id);
        applyRecommendationRoute(firstRecommendation);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "길찾기 경로를 불러오지 못했어요.";

        setRouteRecommendError(message);
        setIsRoutePlanningMode(false);
        setRoutePlanningSource(null);
        setPoiRouteReturnTarget(null);
        restorePoiRouteOrigin(returnTarget);
        openModal({
          title: "길찾기 경로를 불러오지 못했어요",
          body: <p>{message}</p>,
        });
      }
    },
    [
      applyRecommendationRoute,
      clearFocusedPoi,
      closeBottomSheet,
      myPos,
      openModal,
      restorePoiRouteOrigin,
      selectRouteRecommendation,
      setRouteRecommendations,
      setRouteRecommendError,
      setRouteState,
      startRouteRecommendLoading,
    ],
  );

  const handleFocusedPoiRouteClick = useCallback(
    (poi: FocusedPoi) => {
      void startPoiRoutePlanning(poi, { kind: "focused", poi });
    },
    [startPoiRoutePlanning],
  );

  const handleHomePoiRouteClick = useCallback(
    (poi: HomePoiListItem) => {
      void startPoiRoutePlanning(fromHomePoiListItem(poi), {
        kind: "sheet",
        snapshot: buildFocusedEntrySnapshot(),
      });
    },
    [buildFocusedEntrySnapshot, startPoiRoutePlanning],
  );

  const handleSearchResultRouteClick = useCallback(
    (poi: TmapPoi) => {
      void startPoiRoutePlanning(fromTmapPoi(poi), {
        kind: "sheet",
        snapshot: buildFocusedEntrySnapshot(),
      });
    },
    [buildFocusedEntrySnapshot, startPoiRoutePlanning],
  );

  useEffect(() => {
    if (!isStartPointSelectionMode) return;

    showStartPointCta({
      backLabel: "이전",
      confirmLabel: "경로 추천",
      confirmDisabled: routeRecommendLoading || !pendingRouteRecommendDraft,
      onBack: handleStartPointBack,
      onConfirm: () => {
        void handleStartPointConfirm();
      },
    });

    return () => {
      clearBottomNavOverride();
    };
  }, [
    clearBottomNavOverride,
    handleStartPointBack,
    handleStartPointConfirm,
    isStartPointSelectionMode,
    pendingRouteRecommendDraft,
    routeRecommendLoading,
    showStartPointCta,
  ]);

  useEffect(() => {
    if (!isStartPointSelectionMode) return;
    setStartPointConfirmDisabled(routeRecommendLoading || !pendingRouteRecommendDraft);
  }, [
    isStartPointSelectionMode,
    pendingRouteRecommendDraft,
    routeRecommendLoading,
    setStartPointConfirmDisabled,
  ]);

  const handleRouteRecommendationSelect = useCallback(
    (routeId: string) => {
      const selectedRecommendation = routeRecommendations.find(
        (item) => item.id === routeId,
      );
      if (!selectedRecommendation) return;

      selectRouteRecommendation(routeId);
      applyRecommendationRoute(selectedRecommendation);
    },
    [applyRecommendationRoute, routeRecommendations, selectRouteRecommendation],
  );

  const handleRouteEdit = useCallback(() => {
    setPickedPos(null);
    setRouteState({
      route: null,
      routeRawResponse: null,
      drawRoute: false,
      routeLoading: false,
      routeError: null,
    });
    clearRouteRecommendations();
    setIsRoutePlanningMode(false);

    if (routePlanningSource === "poi-route") {
      const target = poiRouteReturnTarget;
      setRoutePlanningSource(null);
      setPoiRouteReturnTarget(null);
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
      restorePoiRouteOrigin(target);
      return;
    }

    setRoutePlanningSource(null);
    setPoiRouteReturnTarget(null);
    setPreferRouteRecommendSheet(true);
    setHomeTabMode("main");
    setSheetViewMode("home");
    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    requestAnimationFrame(() => {
      openBottomSheet(0);
    });
  }, [
    clearRouteRecommendations,
    emit,
    openBottomSheet,
    poiRouteReturnTarget,
    restorePoiRouteOrigin,
    routePlanningSource,
    setPickedPos,
    setRouteState,
  ]);

  const handleMainTabClick = useCallback(() => {
    setHomeTabMode("main");
  }, []);

  const handlePoiTabClick = useCallback(() => {
    setHomeTabMode("poi");
    setVisiblePoiCount(POI_INITIAL_RENDER_COUNT);
  }, []);

  const handleToggleSheetViewFromOverlay = useCallback(() => {
    if (!hasSubmittedSearchResults) return;

    if (activeSheetViewMode === "searchResults") {
      setSheetViewMode("home");
      return;
    }

    setSheetViewMode("searchResults");
    openBottomSheet(SEARCH_RESULTS_ENTRY_SNAP_INDEX);
  }, [activeSheetViewMode, hasSubmittedSearchResults, openBottomSheet]);

  const sheetViewToggleLabel = useMemo(() => {
    if (activeSheetViewMode === "searchResults") {
      return "경로 추천";
    }

    return "검색 결과";
  }, [activeSheetViewMode]);

  const shouldShowSheetViewToggle =
    hasSubmittedSearchResults &&
    !focusedPoi &&
    !isRoutePlanningMode &&
    !isStartPointSelectionMode;
  const effectiveSearchResultSort =
    optimisticSearchSort ?? submittedSearchSort;

  const handleGuideStart = useCallback(() => {
    if (routeRecommendLoading) return;

    const selectedRecommendation =
      routeRecommendations.find((item) => item.id === selectedRouteId) ??
      routeRecommendations[0];
    if (!selectedRecommendation) return;

    emit({ channel: "map", type: "START_WALKING" });
  }, [emit, routeRecommendLoading, routeRecommendations, selectedRouteId]);

  const handleSearchResultSortChange = useCallback(
    async (nextSort: TmapPoiSearchSort) => {
      if (searchResultSortLoading) return;
      if (!submittedSearchKeyword) return;
      if (!submittedSearchCenter) {
        setSearchResultSortError(
          "검색 중심 좌표를 찾을 수 없어 정렬을 변경할 수 없어요.",
        );
        return;
      }
      if (effectiveSearchResultSort === nextSort) return;

      setOptimisticSearchSort(nextSort);
      setSearchResultSortLoading(true);
      setSearchResultSortError(null);

      try {
        const response = await fetchTmapPois({
          keyword: submittedSearchKeyword,
          sort: nextSort,
          center: submittedSearchCenter,
        });

        commitSubmittedSearchPois(
          response.items,
          submittedSearchKeyword,
          nextSort,
          submittedSearchCenter,
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "정렬을 변경하지 못했어요.";
        setSearchResultSortError(message);
      } finally {
        setOptimisticSearchSort(null);
        setSearchResultSortLoading(false);
      }
    },
    [
      commitSubmittedSearchPois,
      effectiveSearchResultSort,
      searchResultSortLoading,
      submittedSearchCenter,
      submittedSearchKeyword,
    ],
  );

  const handleClearSearchResults = useCallback(() => {
    clearSubmittedSearchPois();
    setSheetViewMode("home");
    setSearchResultSortError(null);
    setSearchResultSortLoading(false);
    setOptimisticSearchSort(null);
    closeBottomSheet();
  }, [clearSubmittedSearchPois, closeBottomSheet]);

  const handleCloseSearchOverlay = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(SEARCH_QUERY_KEY);
    next.delete(FOCUS_QUERY_KEY);
    const qs = next.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }, [router, searchParams]);

  useEffect(() => {
    emit({ channel: "ui", type: "UI_HOME_ENTERED" });
    return () => {
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    };
  }, [emit]);

  useEffect(() => {
    const pendingRevealSeq = consumePendingSearchResultsRevealSeq();
    if (pendingRevealSeq == null) return;
    if (pendingRevealSeq !== submittedSearchSeq) return;
    if (!hasSubmittedSearchResults) return;

    requestAnimationFrame(() => {
      setSheetViewMode("searchResults");
      openBottomSheet(SEARCH_RESULTS_ENTRY_SNAP_INDEX);
    });
  }, [
    consumePendingSearchResultsRevealSeq,
    hasSubmittedSearchResults,
    openBottomSheet,
    submittedSearchSeq,
  ]);

  useEffect(() => {
    const prevFocusedPoiId = prevFocusedPoiIdRef.current;
    const currentFocusedPoiId = focusedPoi?.id ?? null;
    const focusedJustOpened =
      prevFocusedPoiId == null && currentFocusedPoiId != null;
    const focusedJustClosed =
      prevFocusedPoiId != null && currentFocusedPoiId == null;

    if (focusedJustOpened && !focusedCapturedByLocalHandlerRef.current) {
      captureFocusedEntrySnapshot(false);
    }
    if (focusedJustClosed) {
      focusedCapturedByLocalHandlerRef.current = false;
    }

    prevFocusedPoiIdRef.current = currentFocusedPoiId;
  }, [captureFocusedEntrySnapshot, focusedPoi]);

  useEffect(() => {
    if (focusedPoi) {
      resetBottomSheetOffset();
      return;
    }

    resetFocusedSheetHeight();
  }, [focusedPoi, resetBottomSheetOffset, resetFocusedSheetHeight]);

  useEffect(() => {
    return () => {
      resetBottomSheetOffset();
      resetFocusedSheetHeight();
    };
  }, [resetBottomSheetOffset, resetFocusedSheetHeight]);

  useEffect(() => {
    if (walking) {
      setRouteSceneMode("walking");
      return;
    }

    if (isStartPointSelectionMode) {
      setRouteSceneMode("start-point");
      return;
    }

    if (isRoutePlanningMode) {
      setRouteSceneMode("planning");
      return;
    }

    setRouteSceneMode("idle");
  }, [
    isRoutePlanningMode,
    isStartPointSelectionMode,
    setRouteSceneMode,
    walking,
  ]);

  useEffect(() => {
    return () => {
      resetRouteSceneMode();
    };
  }, [resetRouteSceneMode]);

  useEffect(() => {
    const shouldHideBottomChrome = isRoutePlanningMode || walking;

    if (shouldHideBottomChrome) {
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_HIDE" });
      return;
    }

    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
  }, [emit, isRoutePlanningMode, walking]);

  useEffect(() => {
    if (activeSheetViewMode !== "home") return;
    if (activeHomeTabMode !== "poi") return;
    if (!hasMorePois) return;

    const target = poiLoadMoreRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadMorePois();
            break;
          }
        }
      },
      {
        root: null,
        rootMargin: "160px 0px",
        threshold: 0,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    activeHomeTabMode,
    activeSheetViewMode,
    hasMorePois,
    loadMorePois,
    visiblePoiCount,
  ]);

  useEffect(() => {
    if (!petPoiError) {
      lastPetPoiErrorRef.current = null;
      return;
    }
    if (lastPetPoiErrorRef.current === petPoiError) return;

    lastPetPoiErrorRef.current = petPoiError;
    openModal({
      title: "동반 가능 정보를 불러오지 못했어요",
      icon: (
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="w-8 h-8 text-red-400"
        />
      ),
      body: (
        <p className="whitespace-pre-line">
          {"일시적인 오류가 발생했어요.\n잠시 후 다시 시도해 주세요."}
        </p>
      ),
      onDismiss: clearPetPoiError,
      onConfirm: clearPetPoiError,
    });
  }, [clearPetPoiError, openModal, petPoiError]);

  useEffect(() => {
    const waterError = facilitiesProbe.water.error;
    if (!waterError) {
      lastWaterErrorRef.current = null;
      return;
    }
    if (lastWaterErrorRef.current === waterError) return;

    lastWaterErrorRef.current = waterError;
    openModal({
      title: "음수대 정보를 불러오지 못했어요",
      icon: (
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="w-8 h-8 text-red-400"
        />
      ),
      body: (
        <p className="whitespace-pre-line">
          {"일시적인 오류가 발생했어요.\n잠시 후 다시 시도해 주세요."}
        </p>
      ),
    });
  }, [facilitiesProbe.water.error, openModal]);

  useEffect(() => {
    const trashError = facilitiesProbe.trash.error;
    if (!trashError) {
      lastTrashErrorRef.current = null;
      return;
    }
    if (lastTrashErrorRef.current === trashError) return;

    lastTrashErrorRef.current = trashError;
    openModal({
      title: "쓰레기통 정보를 불러오지 못했어요",
      icon: (
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="w-8 h-8 text-red-400"
        />
      ),
      body: (
        <p className="whitespace-pre-line">
          {"일시적인 오류가 발생했어요.\n잠시 후 다시 시도해 주세요."}
        </p>
      ),
    });
  }, [facilitiesProbe.trash.error, openModal]);

  return (
    <div className="relative w-full h-full pointer-events-none">
      <HomePetPoiLayerBridge showPetPoi={petPoiOn} petPois={petPois} />
      <HomeFacilitiesPoiLayerBridge facilityPois={facilityMarkerPois} />

      <MapOverlay
        floatingControlsBottomOffsetPx={
          focusedPoi ? focusedFloatingOffsetPx : bottomSheetOffsetPx
        }
        floatingControlsBottomTransitionMs={
          focusedPoi ? 0 : bottomSheetFloatingMotion.durationMs
        }
        floatingControlsBottomTransitionEasing={
          focusedPoi ? "linear" : bottomSheetFloatingMotion.easing
        }
        searchKeyword={hasSubmittedSearchResults ? submittedSearchKeyword : ""}
        showSearchResultClearButton={hasSubmittedSearchResults}
        onClearSearchResults={handleClearSearchResults}
        bottomLeftSlot={
          shouldShowSheetViewToggle ? (
            <button
              type="button"
              onClick={handleToggleSheetViewFromOverlay}
              className="pointer-events-auto rounded-full bg-white/95 px-4 py-2.5 text-sm font-semibold text-dg-black shadow-lg shadow-black/15 backdrop-blur transition-colors"
            >
              {sheetViewToggleLabel}
            </button>
          ) : undefined
        }
        toggles={[
          {
            key: "petpoi",
            labelOn: "동반 가능",
            value: petPoiOn,
            onChange: setPetPoiOn,
            disabled: !myPos || Boolean(petPoiError),
            variant: "orange",
            icon: appIconPuppy,
            loading: petPoiLoading,
          },
          {
            key: "bin",
            labelOn: "쓰레기통",
            labelOff: "쓰레기통",
            value: showBin,
            onChange: setShowBin,
            variant: "green",
            icon: appIconTrashbin,
            loading: facilitiesProbe.trash.loading,
          },
          {
            key: "water",
            labelOn: "음수대",
            labelOff: "음수대",
            value: showWater,
            onChange: setShowWater,
            variant: "blue",
            icon: appIconWaterdrop,
            loading: facilitiesProbe.water.loading,
          },
        ]}
        isRoutePlanningMode={isRoutePlanningMode}
        onRouteEdit={handleRouteEdit}
        onGuideStart={handleGuideStart}
        routePlanningRecommendations={routeRecommendations}
        routePlanningSelectedRouteId={selectedRouteId}
        routePlanningLoading={routeRecommendLoading}
        routePlanningError={routeRecommendError}
        onRoutePlanningSelect={handleRouteRecommendationSelect}
        isStartPointSelectionMode={isStartPointSelectionMode}
      />

      {focusedPoi ? (
        <FocusedPoiSheet
          poi={focusedPoi}
          onClose={handleFocusedPoiClose}
          onRouteClick={handleFocusedPoiRouteClick}
          onHeightChange={handleFocusedPoiHeightChange}
        />
      ) : isStartPointSelectionMode ? null : (
        <BottomSheet
          peekHeight={HOME_BOTTOM_SHEET_PEEK_HEIGHT}
          showBackdrop={
            activeSheetViewMode === "home" && activeHomeTabMode === "main"
          }
          onVisibleHeightChange={handleBottomSheetVisibleHeightChange}
        >
          {activeSheetViewMode === "searchResults" ? (
            <SearchResultsBottomSheetContent
              items={submittedSearchPois}
              sort={effectiveSearchResultSort}
              sortLoading={searchResultSortLoading}
              sortError={searchResultSortError}
              onSortChange={(nextSort) => {
                void handleSearchResultSortChange(nextSort);
              }}
              onFocusPoi={handleFocusSearchResultPoi}
              onRouteClick={handleSearchResultRouteClick}
            />
          ) : (
            <div className="space-y-4">
              <SheetTabs
                activeMode={activeHomeTabMode}
                onMainClick={handleMainTabClick}
                onPoiClick={handlePoiTabClick}
              />

              {activeHomeTabMode === "poi" ? (
                <PoiTabContent
                  hasAnySourceOn={hasAnyPoiSourceOn}
                  loading={poiListLoading}
                  visiblePois={visiblePois}
                  hasMorePois={hasMorePois}
                  loadMoreRef={poiLoadMoreRef}
                  onFocusPoi={handleFocusHomePoi}
                  onRouteClick={handleHomePoiRouteClick}
                />
              ) : (
                <RouteTabContent
                  dog={dog}
                  preferRouteRecommendSheet={preferRouteRecommendSheet}
                  onRouteRecommendRequested={handleRouteRecommendRequested}
                  onRequestDogEdit={handleRequestDogEdit}
                />
              )}

              {showWalkDebugPanel && (
                <>
                  <div className="border border-blue-200 bg-blue-50 rounded-md p-3 text-sm"></div>
                  <WalkDebugPanel />
                </>
              )}
            </div>
          )}
        </BottomSheet>
      )}

      {isSearchOverlayOpen && (
        <SearchOverlayPanel
          shouldFocusInput={shouldFocusSearchInput}
          onClose={handleCloseSearchOverlay}
        />
      )}

      <CoachmarkTour />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageContent />
    </Suspense>
  );
}
