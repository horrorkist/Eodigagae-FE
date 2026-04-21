"use client";

import { useState } from "react";
import type { Area } from "react-easy-crop";
import PetPhotoPreviewOverlay from "@/components/my-page/PetPhotoPreviewOverlay";
import PetProfileModal from "@/components/my-page/PetProfileModal";
import { getGeoErrorInfo } from "@/lib/geolocationErrors";
import { modalPresets } from "@/lib/modalPresets";
import { useModalStore } from "@/stores/modal";
import type { ModalConfig } from "@/types/modal";
import type { DogInfo } from "@/types/dog";

type ModalDebugSpec = {
  key: string;
  source: string;
  description: string;
  buildConfig: () => ModalConfig;
  withConfirmLog?: boolean;
  withCancelLog?: boolean;
  withDismissLog?: boolean;
};

type ModalDebugGroup = {
  key: string;
  title: string;
  note: string;
  specs: ModalDebugSpec[];
};

type OverlayDemoKey =
  | "pet-create"
  | "pet-edit"
  | "photo-preview"
  | "photo-preview-error"
  | "photo-preview-uploading";

type ActivityEntry = {
  id: number;
  label: string;
};

const SAMPLE_DOG: DogInfo = {
  name: "보리",
  ageInMonths: 36,
  breed: "중형견",
  photo: {
    imageId: "debug-photo-image",
    variantUrl: "/pwa/icons/pwa-512.png",
    uploadedAt: "2026-04-21T09:00:00.000Z",
  },
};

function createGeoError(code: 1 | 2 | 3): GeolocationPositionError {
  return {
    code,
    message: "debug",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

const geoPermissionInfo = getGeoErrorInfo(createGeoError(1));
const geoUnavailableInfo = getGeoErrorInfo(createGeoError(2));
const geoTimeoutInfo = getGeoErrorInfo(createGeoError(3));
const geoUnsupportedInfo = getGeoErrorInfo(
  new Error("이 브라우저에서 위치 서비스를 지원하지 않습니다."),
);

const GLOBAL_MODAL_GROUPS: ModalDebugGroup[] = [
  {
    key: "route-planning",
    title: "경로 추천/길찾기",
    note: "지도 및 추천 경로 플로우에서 사용하는 안내 모달",
    specs: [
      {
        key: "missing-recommendation-draft",
        source: "app/(map)/page.tsx",
        description: "추천 폼 상태가 유실됐을 때",
        buildConfig: () => modalPresets.recommendationDraftMissing(),
      },
      {
        key: "missing-map-center",
        source: "app/(map)/page.tsx",
        description: "지도가 아직 준비되지 않았을 때",
        buildConfig: () => modalPresets.mapCenterUnavailable(),
      },
      {
        key: "recommendation-empty",
        source: "app/(map)/page.tsx",
        description: "조건에 맞는 경로가 없을 때",
        buildConfig: () =>
          modalPresets.recommendationEmpty({
            message: "조건에 맞는 추천 경로를 찾지 못했어요.",
          }),
      },
      {
        key: "recommendation-failed",
        source: "app/(map)/page.tsx",
        description: "추천 API가 실패했을 때",
        buildConfig: () =>
          modalPresets.recommendationLoadFailed({
            message: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
          }),
      },
      {
        key: "missing-current-location",
        source: "app/(map)/page.tsx",
        description: "POI 길찾기 시작 시 현재 위치가 없을 때",
        buildConfig: () => modalPresets.currentLocationRequired(),
      },
      {
        key: "poi-route-failed",
        source: "app/(map)/page.tsx",
        description: "POI 기준 길찾기 추천이 실패했을 때",
        buildConfig: () =>
          modalPresets.poiRouteLoadFailed({
            message: "길찾기 경로를 다시 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
          }),
      },
    ],
  },
  {
    key: "route-tracking",
    title: "산책 추적",
    note: "경로 이탈 및 도착 직전 알림 모달",
    specs: [
      {
        key: "off-route",
        source: "hooks/useMapRoute.ts",
        description: "경로에서 이탈했을 때 상태 유지 여부 확인",
        buildConfig: () =>
          modalPresets.offRoute({
            distanceM: 87,
            stopLabel: "길안내 종료",
          }),
        withConfirmLog: true,
      },
      {
        key: "arrival-poi-route",
        source: "hooks/useMapRoute.ts",
        description: "POI 길안내 종료 직전",
        buildConfig: () => modalPresets.arrival({ isPoiRoute: true }),
        withConfirmLog: true,
        withCancelLog: true,
        withDismissLog: true,
      },
      {
        key: "arrival-walk-route",
        source: "hooks/useMapRoute.ts",
        description: "산책 종료 직전",
        buildConfig: () => modalPresets.arrival({ isPoiRoute: false }),
        withConfirmLog: true,
        withCancelLog: true,
        withDismissLog: true,
      },
    ],
  },
  {
    key: "facilities",
    title: "시설/데이터 오류",
    note: "동반 가능 정보와 시설 프록시 실패 케이스",
    specs: [
      {
        key: "pet-poi-error",
        source: "app/(map)/page.tsx",
        description: "동반 가능 POI 데이터 로드 실패",
        buildConfig: () => modalPresets.dataLoadFailed({ subject: "동반 가능" }),
        withConfirmLog: true,
        withDismissLog: true,
      },
      {
        key: "water-error",
        source: "app/(map)/page.tsx",
        description: "음수대 시설 데이터 로드 실패",
        buildConfig: () => modalPresets.dataLoadFailed({ subject: "음수대" }),
      },
      {
        key: "trash-error",
        source: "app/(map)/page.tsx",
        description: "배변봉투함/쓰레기통 시설 데이터 로드 실패",
        buildConfig: () => modalPresets.dataLoadFailed({ subject: "쓰레기통" }),
      },
    ],
  },
  {
    key: "location",
    title: "위치 권한/오류",
    note: "현재 위치 확인 중 발생하는 브라우저 Geolocation 에러",
    specs: [
      {
        key: "geo-permission",
        source: "hooks/useMapMyLocation.ts",
        description: "권한 거부 에러",
        buildConfig: () => modalPresets.locationError({ info: geoPermissionInfo }),
      },
      {
        key: "geo-unavailable",
        source: "hooks/useMapMyLocation.ts",
        description: "위치 정보 불가 에러",
        buildConfig: () => modalPresets.locationError({ info: geoUnavailableInfo }),
      },
      {
        key: "geo-timeout",
        source: "hooks/useMapMyLocation.ts",
        description: "위치 확인 타임아웃",
        buildConfig: () => modalPresets.locationError({ info: geoTimeoutInfo }),
      },
      {
        key: "geo-unsupported",
        source: "hooks/useMapMyLocation.ts",
        description: "브라우저 미지원 또는 예외",
        buildConfig: () => modalPresets.locationError({ info: geoUnsupportedInfo }),
      },
    ],
  },
  {
    key: "utility",
    title: "유틸리티/설정",
    note: "주소 복사, 캐시 초기화, 반려동물 삭제 등 마이페이지/POI 유틸 모달",
    specs: [
      {
        key: "copy-success",
        source: "components/FocusedPoiSheet.tsx",
        description: "주소 복사 성공",
        buildConfig: () => modalPresets.copyAddressSuccess({ label: "목적지" }),
      },
      {
        key: "copy-failure",
        source: "components/FocusedPoiSheet.tsx",
        description: "주소 복사 실패",
        buildConfig: () => modalPresets.copyAddressFailure(),
      },
      {
        key: "cache-clear",
        source: "app/my/page.tsx",
        description: "설정 및 산책 기록 삭제 전 확인",
        buildConfig: () => modalPresets.cacheClearConfirm(),
        withConfirmLog: true,
      },
      {
        key: "pet-delete",
        source: "app/my/page.tsx",
        description: "반려동물 정보 삭제 전 확인",
        buildConfig: () => modalPresets.petDeleteConfirm(),
        withConfirmLog: true,
      },
    ],
  },
];

const OVERLAY_DEMOS: Array<{
  key: OverlayDemoKey;
  title: string;
  source: string;
  description: string;
}> = [
  {
    key: "pet-create",
    title: "PetProfileModal / 등록",
    source: "components/my-page/PetProfileModal.tsx",
    description: "반려동물 등록 상태",
  },
  {
    key: "pet-edit",
    title: "PetProfileModal / 수정",
    source: "components/my-page/PetProfileModal.tsx",
    description: "기존 반려동물 데이터 편집 상태",
  },
  {
    key: "photo-preview",
    title: "PetPhotoPreviewOverlay / 기본",
    source: "components/my-page/PetPhotoPreviewOverlay.tsx",
    description: "사진 자르기 가능한 기본 상태",
  },
  {
    key: "photo-preview-error",
    title: "PetPhotoPreviewOverlay / 에러",
    source: "components/my-page/PetPhotoPreviewOverlay.tsx",
    description: "업로드 전 에러 문구가 보이는 상태",
  },
  {
    key: "photo-preview-uploading",
    title: "PetPhotoPreviewOverlay / 업로드 중",
    source: "components/my-page/PetPhotoPreviewOverlay.tsx",
    description: "닫기/재선택이 막힌 업로드 진행 상태",
  },
];

function ActionChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
      {label}
    </span>
  );
}

export default function ModalsDebugPage() {
  const openModal = useModalStore((state) => state.open);
  const closeModal = useModalStore((state) => state.close);
  const isModalOpen = useModalStore((state) => state.isOpen);
  const [overlayDemo, setOverlayDemo] = useState<OverlayDemoKey | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const appendActivity = (label: string) => {
    const timestamp = new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());

    setActivity((current) => [
      {
        id: Date.now() + current.length,
        label: `${timestamp} ${label}`,
      },
      ...current,
    ].slice(0, 12));
  };

  const openDebugModal = (spec: ModalDebugSpec) => {
    const config = spec.buildConfig();
    const title = config.title ?? spec.key;

    openModal({
      ...config,
      onConfirm: spec.withConfirmLog
        ? () => appendActivity(`[전역 모달] ${title} / 확인`)
        : undefined,
      onCancel: spec.withCancelLog
        ? () => appendActivity(`[전역 모달] ${title} / 취소`)
        : undefined,
      onDismiss: spec.withDismissLog
        ? () => appendActivity(`[전역 모달] ${title} / 닫기`)
        : undefined,
    });
    appendActivity(`[전역 모달] ${title} / 열기`);
  };

  const openOverlayDemo = (key: OverlayDemoKey) => {
    closeModal();
    setOverlayDemo(key);
    appendActivity(`[컴포넌트 모달] ${key} / 열기`);
  };

  const closeOverlayDemo = (reason: string) => {
    setOverlayDemo(null);
    appendActivity(`[컴포넌트 모달] ${reason}`);
  };

  const handlePetSave = (dog: DogInfo) => {
    setOverlayDemo(null);
    appendActivity(
      `[컴포넌트 모달] 반려동물 저장 / ${dog.name ?? "이름 없음"} · ${dog.breed}`,
    );
  };

  const handlePhotoConfirm = (croppedAreaPixels: Area) => {
    if (croppedAreaPixels.width < 0) return;
    setOverlayDemo(null);
    appendActivity("[컴포넌트 모달] 사진 자르기 완료");
  };

  return (
    <main className="pointer-events-auto min-h-full bg-stone-50 text-stone-900">
      <div className="mx-auto flex min-h-full w-full max-w-[var(--app-shell-max-width)] flex-col px-4 pb-28 pt-5">
        <section className="sticky top-0 z-20 -mx-4 border-b border-stone-200 bg-stone-50/95 px-4 pb-4 pt-1 backdrop-blur">
          <div className="rounded-[28px] bg-white px-5 py-5 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Debug / Modals
                </p>
                <h1 className="text-2xl font-semibold text-stone-900">
                  모든 모달 디버그 페이지
                </h1>
                <p className="text-sm leading-6 text-stone-600">
                  전역 `useModalStore` 기반 케이스와 포털 기반 개별 모달
                  컴포넌트를 이 화면에서 바로 열어볼 수 있어요.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionChip label={isModalOpen ? "전역 모달 열림" : "전역 모달 닫힘"} />
                <ActionChip
                  label={
                    overlayDemo
                      ? `컴포넌트 모달 열림: ${overlayDemo}`
                      : "컴포넌트 모달 닫힘"
                  }
                />
                <ActionChip
                  label={`총 전역 케이스 ${GLOBAL_MODAL_GROUPS.flatMap((group) => group.specs).length}개`}
                />
                <ActionChip label={`총 컴포넌트 케이스 ${OVERLAY_DEMOS.length}개`} />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    appendActivity("[전역 모달] 강제 닫기");
                  }}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 active:bg-stone-100"
                >
                  전역 모달 닫기
                </button>
                <button
                  type="button"
                  onClick={() => closeOverlayDemo("닫기 버튼")}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 active:bg-stone-100"
                >
                  컴포넌트 모달 닫기
                </button>
                <button
                  type="button"
                  onClick={() => setActivity([])}
                  className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white active:bg-stone-700"
                >
                  액션 로그 초기화
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5">
          <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  컴포넌트 모달
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  별도 포털 컴포넌트로 구현된 모달/오버레이 데모
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {OVERLAY_DEMOS.map((demo) => (
                <article
                  key={demo.key}
                  className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {demo.title}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">{demo.source}</p>
                    </div>
                    <p className="text-sm leading-6 text-stone-600">
                      {demo.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openOverlayDemo(demo.key)}
                    className="mt-4 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
                  >
                    케이스 열기
                  </button>
                </article>
              ))}
            </div>
          </div>

          {GLOBAL_MODAL_GROUPS.map((group) => (
            <section
              key={group.key}
              className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-stone-900">
                  {group.title}
                </h2>
                <p className="mt-1 text-sm text-stone-600">{group.note}</p>
              </div>

              <div className="grid gap-3">
                {group.specs.map((spec) => {
                  const preview = spec.buildConfig();
                  const title = preview.title ?? spec.key;

                  return (
                    <article
                      key={spec.key}
                      className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-stone-900">
                              {title}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {spec.source}
                            </p>
                          </div>
                          <p className="text-sm leading-6 text-stone-600">
                            {spec.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <ActionChip
                              label={`확인: ${preview.confirmLabel ?? "확인"}`}
                            />
                            {preview.confirmTone === "danger" ? (
                              <ActionChip label="확인 톤: danger" />
                            ) : null}
                            {preview.cancelLabel ? (
                              <ActionChip label={`취소: ${preview.cancelLabel}`} />
                            ) : null}
                            {preview.icon ? <ActionChip label="아이콘 있음" /> : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openDebugModal(spec)}
                          className="inline-flex shrink-0 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white active:bg-stone-700"
                        >
                          전역 모달 열기
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-stone-900">액션 로그</h2>
            <p className="mt-1 text-sm text-stone-600">
              열기, 확인, 취소, 닫기 동작을 최근 12개까지 기록합니다.
            </p>

            <div className="mt-4 rounded-3xl bg-stone-950 p-4 text-stone-100">
              {activity.length === 0 ? (
                <p className="text-sm text-stone-400">아직 기록이 없어요.</p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      {entry.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </section>
      </div>

      {overlayDemo === "pet-create" ? (
        <PetProfileModal
          dog={null}
          onClose={() => closeOverlayDemo("반려동물 등록 닫기")}
          onSave={handlePetSave}
        />
      ) : null}

      {overlayDemo === "pet-edit" ? (
        <PetProfileModal
          dog={SAMPLE_DOG}
          onClose={() => closeOverlayDemo("반려동물 수정 닫기")}
          onSave={handlePetSave}
        />
      ) : null}

      {overlayDemo === "photo-preview" ? (
        <PetPhotoPreviewOverlay
          imageUrl={SAMPLE_DOG.photo?.variantUrl ?? "/pwa/icons/pwa-512.png"}
          error={null}
          canConfirm
          isUploading={false}
          onClose={() => closeOverlayDemo("사진 미리보기 닫기")}
          onReselect={() => appendActivity("[컴포넌트 모달] 사진 재선택")}
          onConfirmCrop={handlePhotoConfirm}
        />
      ) : null}

      {overlayDemo === "photo-preview-error" ? (
        <PetPhotoPreviewOverlay
          imageUrl={SAMPLE_DOG.photo?.variantUrl ?? "/pwa/icons/pwa-512.png"}
          error="이미지를 처리하는 중 오류가 발생했어요."
          canConfirm
          isUploading={false}
          onClose={() => closeOverlayDemo("사진 에러 상태 닫기")}
          onReselect={() => appendActivity("[컴포넌트 모달] 에러 상태 재선택")}
          onConfirmCrop={handlePhotoConfirm}
        />
      ) : null}

      {overlayDemo === "photo-preview-uploading" ? (
        <PetPhotoPreviewOverlay
          imageUrl={SAMPLE_DOG.photo?.variantUrl ?? "/pwa/icons/pwa-512.png"}
          error={null}
          canConfirm
          isUploading
          onClose={() => closeOverlayDemo("업로드 상태 닫기 시도")}
          onReselect={() => appendActivity("[컴포넌트 모달] 업로드 중 재선택")}
          onConfirmCrop={handlePhotoConfirm}
        />
      ) : null}
    </main>
  );
}
