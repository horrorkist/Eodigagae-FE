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
import { usePetPoiController } from "@/hooks/usePetPoiController";
import { useDogStore, type DogInfoFormDraft } from "@/stores/dogStore";
import { useModalStore } from "@/stores/modal";
import { useEmit } from "@/hooks/useEventBus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { fromPetPoiItem, fromTmapPoi } from "@/lib/focusedPoi";
import WalkDebugPanel from "@/components/WalkDebugPanel";
import { PetPoiItem } from "@/types/mapEvents";
import {
  isWalkDebugPanelVisible,
  subscribeWalkDebugUpdates,
} from "@/lib/walkDebug";
import CoachmarkTour from "@/components/CoachmarkTour";
import HomePetPoiLayerBridge from "@/components/map-shell/HomePetPoiLayerBridge";
import {
  appIconPuppy,
  appIconTrashbin,
  appIconWaterdrop,
} from "@/components/icons/definitions.generated";
import { useRouteRecommendStore } from "@/stores/routeRecommendStore";
import { fetchRouteRecommendations } from "@/services/routeRecommend";
import type { RouteRecommendation } from "@/types/routeRecommend";
import type { TmapPoi } from "@/types/tmapPoi";

type HomeTabMode = "main" | "poi";
type SheetViewMode = "home" | "searchResults";
type FocusedEntrySnapshot = {
  sheetViewMode: SheetViewMode;
  homeTabMode: HomeTabMode;
  bottomSheetIsOpen: boolean;
  bottomSheetIndex: number;
};

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

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emit = useEmit();
  const showWalkDebugPanel = useSyncExternalStore(
    subscribeWalkDebugUpdates,
    isWalkDebugPanelVisible,
    () => true,
  );

  const myPos = useMapStore((s) => s.myPos);
  const focusedPoi = useMapStore((s) => s.focusedPoi);
  const setFocusedPoi = useMapStore((s) => s.setFocusedPoi);
  const clearFocusedPoi = useMapStore((s) => s.clearFocusedPoi);
  const submittedSearchPois = useMapStore((s) => s.submittedSearchPois);
  const submittedSearchSeq = useMapStore((s) => s.submittedSearchSeq);
  const consumePendingSearchResultsRevealSeq = useMapStore(
    (s) => s.consumePendingSearchResultsRevealSeq,
  );
  const setPickedPos = useMapStore((s) => s.setPickedPos);
  const setRouteState = useMapStore((s) => s.setRouteState);
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
  const clearDog = useDogStore((s) => s.clearDog);
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

  const {
    petPoiOn,
    petPois,
    petPoiTotalCount,
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
  const [bottomSheetFloatingMotion, setBottomSheetFloatingMotion] =
    useState<BottomSheetHeightMotion>(DEFAULT_BOTTOM_SHEET_MOTION);

  const hasSubmittedSearchResults = submittedSearchPois.length > 0;

  const [homeTabMode, setHomeTabMode] = useState<HomeTabMode>("main");
  const [sheetViewMode, setSheetViewMode] = useState<SheetViewMode>("home");
  const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(false);
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
  const focusedEntrySnapshotRef = useRef<FocusedEntrySnapshot | null>(null);
  const focusedCapturedByLocalHandlerRef = useRef(false);
  const prevFocusedPoiIdRef = useRef<string | null>(focusedPoi?.id ?? null);

  const visiblePois = useMemo(
    () => petPois.slice(0, visiblePoiCount),
    [petPois, visiblePoiCount],
  );
  const hasMorePois = visiblePoiCount < petPois.length;
  const focusedFloatingOffsetPx = useMemo(
    () =>
      Math.max(0, focusedSheetHeightPx - HOME_BOTTOM_SHEET_PEEK_HEIGHT),
    [focusedSheetHeightPx],
  );

  const loadMorePois = useCallback(() => {
    setVisiblePoiCount((prev) =>
      Math.min(prev + POI_RENDER_BATCH_COUNT, petPois.length),
    );
  }, [petPois.length]);

  const captureFocusedEntrySnapshot = useCallback(
    (capturedByLocalHandler: boolean) => {
      focusedEntrySnapshotRef.current = {
        sheetViewMode: activeSheetViewMode,
        homeTabMode: activeHomeTabMode,
        bottomSheetIsOpen,
        bottomSheetIndex,
      };
      focusedCapturedByLocalHandlerRef.current = capturedByLocalHandler;
    },
    [activeHomeTabMode, activeSheetViewMode, bottomSheetIndex, bottomSheetIsOpen],
  );

  const handleFocusPetPoi = useCallback(
    (poi: PetPoiItem) => {
      captureFocusedEntrySnapshot(true);
      closeBottomSheet();
      setFocusedPoi(fromPetPoiItem(poi));
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
  }, [clearFocusedPoi, closeBottomSheet, openBottomSheet]);

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

  const handleRouteRecommendRequested = useCallback(
    async (draft: DogInfoFormDraft) => {
      if (!myPos) {
        openModal({
          title: "내 위치를 확인 중이에요",
          body: <p>현재 위치를 확인한 뒤 다시 시도해 주세요.</p>,
        });
        return;
      }

      setPreferRouteRecommendSheet(true);
      setHomeTabMode("main");
      setSheetViewMode("home");
      startRouteRecommendLoading();

      try {
        const response = await fetchRouteRecommendations({
          start: myPos,
          draft,
        });
        setRouteRecommendations(response.recommendations, response.meta);

        if (response.recommendations.length === 0) {
          const message = "조건에 맞는 추천 경로를 찾지 못했어요.";
          setRouteRecommendError(message);
          setIsRoutePlanningMode(false);
          openModal({
            title: "추천 경로를 찾지 못했어요",
            body: <p>{message}</p>,
          });
          return;
        }

        const firstRecommendation = response.recommendations[0];
        selectRouteRecommendation(firstRecommendation.id);
        applyRecommendationRoute(firstRecommendation);

        setPreferRouteRecommendSheet(false);
        setIsRoutePlanningMode(true);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "추천 경로를 불러오지 못했어요.";

        setRouteRecommendError(message);
        setIsRoutePlanningMode(false);
        openModal({
          title: "추천 경로를 불러오지 못했어요",
          body: <p>{message}</p>,
        });
      }
    },
    [
      applyRecommendationRoute,
      myPos,
      openModal,
      selectRouteRecommendation,
      setRouteRecommendError,
      setRouteRecommendations,
      startRouteRecommendLoading,
    ],
  );

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
      drawRoute: false,
      routeLoading: false,
      routeError: null,
    });
    setIsRoutePlanningMode(false);
    setPreferRouteRecommendSheet(true);
    setHomeTabMode("main");
    setSheetViewMode("home");
    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    requestAnimationFrame(() => {
      openBottomSheet(0);
    });
  }, [emit, openBottomSheet, setPickedPos, setRouteState]);

  const handleMainTabClick = useCallback(() => {
    setHomeTabMode("main");
  }, []);

  const handlePoiTabClick = useCallback(() => {
    setHomeTabMode("poi");
    setVisiblePoiCount(POI_INITIAL_RENDER_COUNT);
  }, []);

  const handleOpenSearchResultsSheet = useCallback(() => {
    setSheetViewMode("searchResults");
    openBottomSheet(SEARCH_RESULTS_ENTRY_SNAP_INDEX);
  }, [openBottomSheet]);

  const handleCloseSearchResultsSheet = useCallback(() => {
    setSheetViewMode("home");
  }, []);

  const handleGuideStart = useCallback(() => {
    if (routeRecommendLoading) return;

    const selectedRecommendation =
      routeRecommendations.find((item) => item.id === selectedRouteId) ??
      routeRecommendations[0];
    if (!selectedRecommendation) return;

    emit({ channel: "map", type: "START_WALKING" });
  }, [emit, routeRecommendLoading, routeRecommendations, selectedRouteId]);

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
    if (isRoutePlanningMode) {
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_HIDE" });
      return;
    }

    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
  }, [emit, isRoutePlanningMode]);

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

  return (
    <div className="relative w-full h-full pointer-events-none">
      <HomePetPoiLayerBridge showPetPoi={petPoiOn} petPois={petPois} />

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
            value: showBin,
            onChange: setShowBin,
            disabled: !myPos,
            variant: "green",
            icon: appIconTrashbin,
          },
          {
            key: "water",
            labelOn: "음수대",
            value: showWater,
            onChange: setShowWater,
            disabled: !myPos,
            variant: "blue",
            icon: appIconWaterdrop,
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
      />

      {focusedPoi ? (
        <FocusedPoiSheet
          poi={focusedPoi}
          onClose={handleFocusedPoiClose}
          onHeightChange={handleFocusedPoiHeightChange}
        />
      ) : (
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
              onBackToHome={handleCloseSearchResultsSheet}
              onFocusPoi={handleFocusSearchResultPoi}
            />
          ) : (
            <div className="space-y-4">
              {hasSubmittedSearchResults && (
                <button
                  type="button"
                  onClick={handleOpenSearchResultsSheet}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-800"
                >
                  검색결과 {submittedSearchPois.length.toLocaleString()}건 보기
                </button>
              )}

              <SheetTabs
                activeMode={activeHomeTabMode}
                onMainClick={handleMainTabClick}
                onPoiClick={handlePoiTabClick}
              />

              {activeHomeTabMode === "poi" ? (
                <PoiTabContent
                  petPoiOn={petPoiOn}
                  loading={petPoiLoading}
                  totalCount={petPoiTotalCount}
                  visiblePois={visiblePois}
                  hasMorePois={hasMorePois}
                  loadMoreRef={poiLoadMoreRef}
                  onFocusPoi={handleFocusPetPoi}
                />
              ) : (
                <RouteTabContent
                  dog={dog}
                  preferRouteRecommendSheet={preferRouteRecommendSheet}
                  onRouteRecommendRequested={handleRouteRecommendRequested}
                  onEditDog={clearDog}
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
