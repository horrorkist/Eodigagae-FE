// MapPage.tsx
"use client";

import dynamic from "next/dynamic";
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
import { useMapStore } from "@/stores/mapStore";
import { useBottomSheetStore } from "@/stores/bottomSheet";
import { usePetPoiController } from "@/hooks/usePetPoiController";
import DogInfoForm from "@/components/DogInfoForm";
import { useDogStore } from "@/stores/dogStore";
import { useModalStore } from "@/stores/modal";
import { useEmit } from "@/hooks/useEventBus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaw,
  faPenToSquare,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { POI_STYLES } from "@/lib/poiMarker";
import { fromPetPoiItem } from "@/lib/focusedPoi";
import PoiCard from "@/components/PoiCard";
import WalkDebugPanel from "@/components/WalkDebugPanel";
import { PetPoiItem } from "@/types/mapEvents";
import {
  isWalkDebugPanelVisible,
  subscribeWalkDebugUpdates,
} from "@/lib/walkDebug";
import {
  appIconPuppy,
  appIconTrashbin,
  appIconWaterdrop,
} from "@/components/icons/definitions.generated";

const NaverMapClient = dynamic(() => import("@/components/NaverMapClient"), {
  ssr: false,
});

type SheetContentMode = "main" | "poi";

const TAB_BUTTON_BASE_CLASS =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors";
const TAB_BUTTON_INACTIVE_CLASS = "text-gray-600 hover:text-gray-800";
const TAB_BUTTON_ACTIVE_CLASS = "bg-white text-gray-900 shadow-sm";
const POI_INITIAL_RENDER_COUNT = 16;
const POI_RENDER_BATCH_COUNT = 12;

function PetPoiSummary({
  loading,
  totalCount,
}: {
  loading: boolean;
  totalCount: number | null;
}) {
  return (
    <div className="border border-amber-200 bg-amber-50 rounded-md p-3 flex items-center gap-2 text-sm">
      <FontAwesomeIcon
        icon={faPaw}
        className="w-3.5 h-3.5 text-amber-600 shrink-0"
      />
      <span className="font-semibold text-amber-800">반려동물 동반 시설</span>
      <span className="ml-auto text-amber-700 font-bold">
        {loading ? "..." : totalCount != null ? `${totalCount}곳` : "-"}
      </span>
    </div>
  );
}

function formatDogAgeLabel(ageInMonths: number) {
  if (ageInMonths < 12) {
    return `${ageInMonths}개월`;
  }

  return `${Math.floor(ageInMonths / 12)}살`;
}

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

  const dog = useDogStore((s) => s.dog);
  const clearDog = useDogStore((s) => s.clearDog);
  const openBottomSheet = useBottomSheetStore((s) => s.open);
  const openModal = useModalStore((s) => s.open);

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

  const [sheetMode, setSheetMode] = useState<SheetContentMode>("main");
  const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(false);
  const [preferRouteRecommendSheet, setPreferRouteRecommendSheet] = useState(
    () => !dog,
  );
  const activeSheetMode: SheetContentMode =
    canShowPoiTab || sheetMode !== "poi" ? sheetMode : "main";
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
      setFocusedPoi(fromPetPoiItem(poi));
    },
    [setFocusedPoi],
  );

  const handleRouteRecommendRequested = useCallback(() => {
    setPreferRouteRecommendSheet(true);
    setSheetMode("main");
    setIsRoutePlanningMode(true);
  }, []);

  const handleRouteEdit = useCallback(() => {
    setIsRoutePlanningMode(false);
    setPreferRouteRecommendSheet(true);
    setSheetMode("main");
    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    requestAnimationFrame(() => {
      openBottomSheet(0);
    });
  }, [emit, openBottomSheet]);

  const handleGuideStart = useCallback(() => {
    // 안내 시작 기능은 다음 단계에서 연결 예정
  }, []);

  useEffect(() => {
    emit({ channel: "ui", type: "UI_HOME_ENTERED" });
    return () => {
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    };
  }, [emit]);

  useEffect(() => {
    if (isRoutePlanningMode) {
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_HIDE" });
      return;
    }

    if (focusedPoi) return;
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
    <div className="w-full h-full">
      <NaverMapClient showPetPoi={petPoiOn} petPois={petPois} />

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
      />

      {focusedPoi ? (
        <FocusedPoiSheet poi={focusedPoi} onClose={clearFocusedPoi} />
      ) : (
        <BottomSheet peekHeight={30} coverBottomNav>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setSheetMode("main")}
                className={[
                  TAB_BUTTON_BASE_CLASS,
                  activeSheetMode === "main"
                    ? TAB_BUTTON_ACTIVE_CLASS
                    : TAB_BUTTON_INACTIVE_CLASS,
                ].join(" ")}
              >
                경로 추천
              </button>
              <button
                type="button"
                onClick={() => {
                  setSheetMode("poi");
                  setVisiblePoiCount(
                    Math.min(POI_INITIAL_RENDER_COUNT, petPois.length),
                  );
                }}
                disabled={!canShowPoiTab}
                className={[
                  TAB_BUTTON_BASE_CLASS,
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  activeSheetMode === "poi"
                    ? TAB_BUTTON_ACTIVE_CLASS
                    : TAB_BUTTON_INACTIVE_CLASS,
                ].join(" ")}
              >
                장소 목록
              </button>
            </div>

            {activeSheetMode === "poi" ? (
              <>
                <PetPoiSummary
                  loading={petPoiLoading}
                  totalCount={petPoiTotalCount}
                />

                {visiblePois.map((poi) => {
                  const style = POI_STYLES[poi.contenttypeid];
                  return (
                    <PoiCard
                      key={poi.contentid}
                      poi={poi}
                      style={style}
                      onClick={() => handleFocusPetPoi(poi)}
                    />
                  );
                })}

                {!petPoiLoading && visiblePois.length === 0 && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                    표시할 장소가 없어요. 상단의 동반 가능 토글을 확인해 주세요.
                  </div>
                )}

                {hasMorePois && (
                  <div
                    ref={poiLoadMoreRef}
                    className="h-10 flex items-center justify-center text-xs text-gray-400"
                  >
                    목록 불러오는 중...
                  </div>
                )}
              </>
            ) : (
              <>
                {!dog || preferRouteRecommendSheet ? (
                  <DogInfoForm
                    onRouteRecommendRequested={handleRouteRecommendRequested}
                  />
                ) : (
                  <div className="border rounded-md p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <FontAwesomeIcon
                        icon={faPaw}
                        className="w-3.5 h-3.5 text-blue-500"
                      />
                      <span className="font-semibold">{dog.name}</span>
                      <span className="text-gray-500">
                        {formatDogAgeLabel(dog.ageInMonths)} · {dog.breed}
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                      onClick={clearDog}
                    >
                      <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3" />
                      수정
                    </button>
                  </div>
                )}
              </>
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
    </div>
  );
}
