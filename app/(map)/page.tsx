// MapPage.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import BottomSheet from "@/components/BottomSheet";
import FocusedPoiSheet from "@/components/FocusedPoiSheet";
import MapOverlay from "@/components/MapOverlay";
import SheetTabs from "@/components/map-page/SheetTabs";
import PoiTabContent from "@/components/map-page/PoiTabContent";
import RouteTabContent from "@/components/map-page/RouteTabContent";
import SearchResultTabContent from "@/components/map-page/SearchResultTabContent";
import { useMapStore } from "@/stores/mapStore";
import { useBottomSheetStore } from "@/stores/bottomSheet";
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

type SheetContentMode = "main" | "poi" | "search";

const POI_INITIAL_RENDER_COUNT = 16;
const POI_RENDER_BATCH_COUNT = 12;

export default function MapPage() {
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

  const dog = useDogStore((s) => s.dog);
  const clearDog = useDogStore((s) => s.clearDog);
  const openBottomSheet = useBottomSheetStore((s) => s.open);
  const closeBottomSheet = useBottomSheetStore((s) => s.close);
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

  const canShowPoiTab = petPoiOn;
  const hasSearchResults = submittedSearchPois.length > 0;
  const canShowSearchTab = hasSearchResults;

  const [sheetMode, setSheetMode] = useState<SheetContentMode>("main");
  const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(false);
  const [preferRouteRecommendSheet, setPreferRouteRecommendSheet] = useState(
    () => !dog,
  );
  const activeSheetMode: SheetContentMode = useMemo(() => {
    if (sheetMode === "poi" && !canShowPoiTab) return "main";
    if (sheetMode === "search" && !canShowSearchTab) return "main";
    return sheetMode;
  }, [canShowPoiTab, canShowSearchTab, sheetMode]);
  const [visiblePoiCount, setVisiblePoiCount] = useState(
    POI_INITIAL_RENDER_COUNT,
  );
  const poiLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastPetPoiErrorRef = useRef<string | null>(null);

  const visiblePois = useMemo(
    () => petPois.slice(0, visiblePoiCount),
    [petPois, visiblePoiCount],
  );
  const hasMorePois = visiblePoiCount < petPois.length;

  const loadMorePois = useCallback(() => {
    setVisiblePoiCount((prev) =>
      Math.min(prev + POI_RENDER_BATCH_COUNT, petPois.length),
    );
  }, [petPois.length]);

  const handleFocusPetPoi = useCallback(
    (poi: PetPoiItem) => {
      closeBottomSheet();
      setFocusedPoi(fromPetPoiItem(poi));
    },
    [closeBottomSheet, setFocusedPoi],
  );

  const handleFocusSearchPoi = useCallback(
    (poi: TmapPoi) => {
      closeBottomSheet();
      setFocusedPoi(fromTmapPoi(poi));
    },
    [closeBottomSheet, setFocusedPoi],
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
      setSheetMode("main");
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
    setSheetMode("main");
    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    requestAnimationFrame(() => {
      openBottomSheet(0);
    });
  }, [emit, openBottomSheet, setPickedPos, setRouteState]);

  const handleMainTabClick = useCallback(() => {
    setSheetMode("main");
  }, []);

  const handlePoiTabClick = useCallback(() => {
    setSheetMode("poi");
    setVisiblePoiCount(
      Math.min(POI_INITIAL_RENDER_COUNT, petPois.length),
    );
  }, [petPois.length]);

  const handleSearchTabClick = useCallback(() => {
    setSheetMode("search");
  }, []);

  const handleGuideStart = useCallback(() => {
    if (routeRecommendLoading) return;

    const selectedRecommendation =
      routeRecommendations.find((item) => item.id === selectedRouteId) ??
      routeRecommendations[0];
    if (!selectedRecommendation) return;

    emit({ channel: "map", type: "START_WALKING" });
  }, [emit, routeRecommendLoading, routeRecommendations, selectedRouteId]);

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
    if (!hasSearchResults) return;

    requestAnimationFrame(() => {
      setSheetMode("search");
      openBottomSheet(0);
    });
  }, [
    consumePendingSearchResultsRevealSeq,
    hasSearchResults,
    openBottomSheet,
    submittedSearchSeq,
  ]);

  useEffect(() => {
    if (isRoutePlanningMode || focusedPoi) {
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_HIDE" });
      return;
    }

    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
  }, [emit, focusedPoi, isRoutePlanningMode]);

  useEffect(() => {
    if (activeSheetMode !== "poi") return;
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
  }, [activeSheetMode, hasMorePois, loadMorePois, visiblePoiCount]);

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
    <div className="w-full h-full pointer-events-none">
      <HomePetPoiLayerBridge showPetPoi={petPoiOn} petPois={petPois} />

      <MapOverlay
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
        <FocusedPoiSheet poi={focusedPoi} onClose={clearFocusedPoi} />
      ) : (
        <BottomSheet peekHeight={30} coverBottomNav>
          <div className="space-y-4">
            <SheetTabs
              activeMode={activeSheetMode}
              canShowPoiTab={canShowPoiTab}
              canShowSearchTab={canShowSearchTab}
              onMainClick={handleMainTabClick}
              onPoiClick={handlePoiTabClick}
              onSearchClick={handleSearchTabClick}
            />

            {activeSheetMode === "poi" ? (
              <PoiTabContent
                loading={petPoiLoading}
                totalCount={petPoiTotalCount}
                visiblePois={visiblePois}
                hasMorePois={hasMorePois}
                loadMoreRef={poiLoadMoreRef}
                onFocusPoi={handleFocusPetPoi}
              />
            ) : activeSheetMode === "search" ? (
              <SearchResultTabContent
                items={submittedSearchPois}
                onFocusPoi={handleFocusSearchPoi}
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
        </BottomSheet>
      )}

      <CoachmarkTour />
    </div>
  );
}
