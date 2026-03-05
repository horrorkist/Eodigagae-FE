"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconBell,
  appIconCamera,
  appIconChevronRight,
  appIconMarkerCrossed,
  appIconMessage,
  appIconNotice,
  appIconPenToSquare,
  appIconPlus,
  appIconPuppy,
  appIconTrashbin,
} from "@/components/icons/definitions.generated";
import PetProfileModal from "@/components/my-page/PetProfileModal";
import {
  COACHMARK_COOKIE_NAME,
  ONBOARDING_COOKIE_NAME,
} from "@/lib/onboarding";
import { clearAppCache } from "@/lib/storage/appCache";
import {
  isWalkDebugPanelVisible,
  setWalkDebugPanelVisible,
  subscribeWalkDebugUpdates,
} from "@/lib/walkDebug";
import { useDogStore } from "@/stores/dogStore";
import { useModalStore } from "@/stores/modal";
import { useMySettingsStore } from "@/stores/mySettingsStore";
import type { DogInfo } from "@/types/dog";

function RowIcon({
  icon,
  iconClassName,
}: {
  icon: typeof appIconBell;
  iconClassName: string;
}) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dg-gray-400">
      <AppIcon
        icon={icon}
        className={["h-3.5 w-3.5", iconClassName].join(" ")}
      />
    </span>
  );
}

function formatDogAgeLabel(ageInMonths: number) {
  if (ageInMonths < 12) return `${ageInMonths}개월`;
  return `${Math.floor(ageInMonths / 12)}살`;
}

export default function MyPage() {
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [isCookieResetDone, setIsCookieResetDone] = useState(false);
  const [petPhotoPreviewUrl, setPetPhotoPreviewUrl] = useState<string | null>(
    null,
  );
  const [petPhotoError, setPetPhotoError] = useState<string | null>(null);
  const petPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const petPhotoObjectUrlRef = useRef<string | null>(null);

  const dog = useDogStore((s) => s.dog);
  const setDog = useDogStore((s) => s.setDog);
  const setFormDraft = useDogStore((s) => s.setFormDraft);
  const clearDog = useDogStore((s) => s.clearDog);

  const notificationsEnabled = useMySettingsStore(
    (s) => s.notificationsEnabled,
  );
  const setNotificationsEnabled = useMySettingsStore(
    (s) => s.setNotificationsEnabled,
  );

  const openModal = useModalStore((s) => s.open);
  const showWalkDebugPanel = useSyncExternalStore(
    subscribeWalkDebugUpdates,
    isWalkDebugPanelVisible,
    () => true,
  );

  const dogDisplayName = dog?.name?.trim() ? dog.name.trim() : "이름";

  const clearPetPhotoPreview = () => {
    if (petPhotoObjectUrlRef.current) {
      URL.revokeObjectURL(petPhotoObjectUrlRef.current);
      petPhotoObjectUrlRef.current = null;
    }
    setPetPhotoPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (petPhotoObjectUrlRef.current) {
        URL.revokeObjectURL(petPhotoObjectUrlRef.current);
      }
    };
  }, []);

  const handleOpenPetPhotoPicker = () => {
    petPhotoInputRef.current?.click();
  };

  const handlePetPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPetPhotoError("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    setPetPhotoError(null);
    if (petPhotoObjectUrlRef.current) {
      URL.revokeObjectURL(petPhotoObjectUrlRef.current);
    }

    const nextObjectUrl = URL.createObjectURL(file);
    petPhotoObjectUrlRef.current = nextObjectUrl;
    setPetPhotoPreviewUrl(nextObjectUrl);
  };

  const handlePetSave = (nextDog: DogInfo) => {
    setDog(nextDog);
    setFormDraft(null);
    setPetPhotoError(null);
    setIsPetModalOpen(false);
  };

  const handleResetOnboardingAndCoachmark = () => {
    if (typeof document === "undefined") return;

    const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = [
      `${ONBOARDING_COOKIE_NAME}=`,
      "Path=/",
      "Max-Age=0",
      `Expires=${expires}`,
      "SameSite=Lax",
    ].join("; ");
    document.cookie = [
      `${COACHMARK_COOKIE_NAME}=`,
      "Path=/",
      "Max-Age=0",
      `Expires=${expires}`,
      "SameSite=Lax",
    ].join("; ");
    setIsCookieResetDone(true);
  };

  const handleConfirmCacheClear = () => {
    clearAppCache();
  };

  const handleOpenCacheClearModal = () => {
    openModal({
      title: "캐시 데이터 삭제",
      body: (
        <p>
          캐시 데이터를 삭제하면 산책 기록과 설정이 함께 삭제됩니다. 소중한
          기록이 사라질 수 있으니 다시 한 번 확인해주세요.
        </p>
      ),
      cancelLabel: "취소",
      confirmLabel: "삭제",
      onConfirm: handleConfirmCacheClear,
    });
  };

  const handleConfirmPetDelete = () => {
    clearDog();
    clearPetPhotoPreview();
    setPetPhotoError(null);
  };

  const handleOpenPetDeleteModal = () => {
    openModal({
      title: "반려동물 정보 삭제",
      body: (
        <p>
          반려동물 정보를 삭제하시겠어요?
          <br />
          삭제된 정보는 되돌릴 수 없습니다.
        </p>
      ),
      cancelLabel: "취소",
      confirmLabel: "삭제",
      onConfirm: handleConfirmPetDelete,
    });
  };

  const renderPetEmptyState = () => (
    <div className="min-h-[420px] px-1 pb-5 flex flex-col">
      <h2 className="text-xl font-semibold text-dg-black">함께하는 반려동물</h2>
      <div className="flex-1 flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => setIsPetModalOpen(true)}
          className="flex flex-col items-center gap-3 text-sm font-semibold text-dg-gray-600"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-dg-gray-400 text-dg-gray-600">
            <AppIcon icon={appIconPlus} className="h-4 w-4" />
          </span>
          <span className="text-base text-dg-gray-600">반려동물 등록하기</span>
        </button>
      </div>
    </div>
  );

  const renderPetRegisteredState = () => {
    if (!dog) return null;

    return (
      <div className="min-h-[420px] px-1 pb-5 flex flex-col">
        <h2 className="text-xl font-semibold text-dg-black">
          함께하는 반려동물
        </h2>

        <div className="mx-auto mt-5 w-full max-w-[300px] overflow-hidden rounded-2xl bg-dg-gray-400">
          <div className="relative h-[340px] w-full">
            {petPhotoPreviewUrl ? (
              <Image
                src={petPhotoPreviewUrl}
                alt="반려동물 사진"
                fill
                sizes="430px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-dg-gray-500">
                <AppIcon icon={appIconPuppy} className="h-8 w-8" />
                <span className="text-sm font-medium">사진이 없어요</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenPetPhotoPicker}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-dg-black px-3 py-1.5 text-xs font-medium text-white"
            >
              <AppIcon icon={appIconCamera} className="h-3.5 w-3.5" />
              <span>사진 변경</span>
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-dg-green-500 to-dg-green-500/0" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 pt-8">
              <div className="relative mx-auto w-fit text-white">
                <div className="text-center">
                  <p className="text-[24px] font-semibold leading-none">
                    {dogDisplayName}
                  </p>
                  <p className="mt-1 text-base font-medium leading-none">
                    {formatDogAgeLabel(dog.ageInMonths)} · {dog.breed}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPetModalOpen(true)}
                  aria-label="반려동물 수정"
                  className="pointer-events-auto absolute left-full top-1/2 ml-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-white"
                >
                  <AppIcon icon={appIconPenToSquare} className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <input
          ref={petPhotoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePetPhotoChange}
        />

        {petPhotoError ? (
          <p className="mt-3 text-xs text-red-600">{petPhotoError}</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-white pointer-events-auto">
      <section className="mx-auto max-w-[430px] px-4 pt-5 pb-24">
        {dog ? renderPetRegisteredState() : renderPetEmptyState()}

        <div className="-mx-4 h-2 bg-dg-gray-400" />

        <div className="space-y-6 pt-4">
          <section>
            <h3 className="mb-1 font-semibold text-dg-black">설정</h3>
            <div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 font-medium text-dg-black">
                  <RowIcon
                    icon={appIconBell}
                    iconClassName="text-dg-yellow-sub"
                  />
                  <span>알림 설정</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={[
                    "relative h-7 w-12 rounded-full transition-colors",
                    notificationsEnabled ? "bg-dg-green-500" : "bg-gray-300",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                      notificationsEnabled
                        ? "translate-x-[20px]"
                        : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenCacheClearModal}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <div className="flex items-center gap-2 font-medium text-dg-black">
                  <RowIcon
                    icon={appIconTrashbin}
                    iconClassName="text-dg-green-sub"
                  />
                  <span>캐시 데이터 삭제</span>
                </div>
                <AppIcon
                  icon={appIconChevronRight}
                  className="h-3.5 w-3.5 text-dg-gray-500"
                />
              </button>

              <button
                type="button"
                onClick={handleOpenPetDeleteModal}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <div className="flex items-center gap-2 font-medium text-dg-black">
                  <RowIcon
                    icon={appIconPuppy}
                    iconClassName="text-dg-orange-500"
                  />
                  <span>반려동물 정보 삭제</span>
                </div>
                <AppIcon
                  icon={appIconChevronRight}
                  className="h-3.5 w-3.5 text-dg-gray-500"
                />
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-dg-black">고객 지원</h3>
            <div>
              <Link
                href="/my/support/notices"
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2 font-medium text-dg-black">
                  <RowIcon
                    icon={appIconNotice}
                    iconClassName="text-dg-blue-500"
                  />
                  <span>공지사항</span>
                </div>
                <AppIcon
                  icon={appIconChevronRight}
                  className="h-3.5 w-3.5 text-dg-gray-500"
                />
              </Link>

              <Link
                href="/my/support/report"
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2 font-medium text-dg-black">
                  <RowIcon
                    icon={appIconMarkerCrossed}
                    iconClassName="text-dg-red-sub"
                  />
                  <span>잘못된 정보 신고</span>
                </div>
                <AppIcon
                  icon={appIconChevronRight}
                  className="h-3.5 w-3.5 text-dg-gray-500"
                />
              </Link>

              <Link
                href="/my/support/feedback"
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2 font-medium text-dg-black">
                  <RowIcon
                    icon={appIconMessage}
                    iconClassName="text-dg-violet-sub"
                  />
                  <span>의견 남기기</span>
                </div>
                <AppIcon
                  icon={appIconChevronRight}
                  className="h-3.5 w-3.5 text-dg-gray-500"
                />
              </Link>
            </div>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-dg-black">개발자 옵션</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <div className="font-medium text-dg-black">
                  산책 디버그 패널 표시
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showWalkDebugPanel}
                  onClick={() => setWalkDebugPanelVisible(!showWalkDebugPanel)}
                  className={[
                    "relative h-7 w-12 rounded-full transition-colors",
                    showWalkDebugPanel ? "bg-dg-green-500" : "bg-gray-300",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                      showWalkDebugPanel
                        ? "translate-x-[20px]"
                        : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="font-medium text-dg-black">
                  온보딩/코치마크 쿠키 삭제
                </div>
                <button
                  type="button"
                  onClick={handleResetOnboardingAndCoachmark}
                  className="h-9 rounded-lg border border-gray-300 px-3 font-semibold text-gray-700 active:bg-gray-100"
                >
                  삭제
                </button>
              </div>

              {isCookieResetDone ? (
                <p className="text-xs text-dg-green-700">
                  쿠키를 삭제했어요. 홈으로 이동하면 온보딩이 다시 시작됩니다.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      {isPetModalOpen ? (
        <PetProfileModal
          dog={dog}
          onClose={() => setIsPetModalOpen(false)}
          onSave={handlePetSave}
        />
      ) : null}
    </div>
  );
}
