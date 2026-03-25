"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconPuppy,
  appIconXMark,
} from "@/components/icons/definitions.generated";

const PET_PHOTO_CROP_ASPECT = 300 / 340;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

type PetPhotoPreviewOverlayProps = {
  imageUrl: string | null;
  error: string | null;
  canConfirm: boolean;
  isUploading: boolean;
  onClose: () => void;
  onReselect: () => void;
  onConfirmCrop: (croppedAreaPixels: Area) => void;
};

export default function PetPhotoPreviewOverlay({
  imageUrl,
  error,
  canConfirm,
  isUploading,
  onClose,
  onReselect,
  onConfirmCrop,
}: PetPhotoPreviewOverlayProps) {
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    lastActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const rafId = window.requestAnimationFrame(() => {
      firstButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isUploading) return;
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      lastActiveElementRef.current?.focus();
    };
  }, [isUploading, onClose]);

  const isConfirmDisabled =
    !canConfirm || isUploading || !imageUrl || croppedAreaPixels === null;

  const overlayContent = (
    <div
      className="fixed inset-0 z-[220] bg-black/55 p-4"
      onClick={() => {
        if (isUploading) return;
        onClose();
      }}
    >
      <div className="flex h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="반려동물 사진 미리보기"
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-[380px] rounded-3xl bg-white p-5 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-dg-black">
              사진 미리보기
            </h2>
            <button
              type="button"
              onClick={() => {
                if (isUploading) return;
                onClose();
              }}
              aria-label="닫기"
              disabled={isUploading}
              className={[
                "rounded-full p-1 text-gray-400 active:bg-gray-100",
                isUploading ? "cursor-not-allowed opacity-50" : "",
              ].join(" ")}
            >
              <AppIcon icon={appIconXMark} className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mb-3 overflow-hidden rounded-2xl bg-dg-gray-400">
            {imageUrl ? (
              <div className="relative h-[320px] w-full touch-none bg-dg-black">
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={PET_PHOTO_CROP_ASPECT}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  zoomSpeed={ZOOM_STEP}
                  restrictPosition
                  objectFit="cover"
                  style={{
                    mediaStyle: {
                      maxWidth: "none",
                      maxHeight: "none",
                    },
                  }}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, nextCroppedAreaPixels) =>
                    setCroppedAreaPixels(nextCroppedAreaPixels)
                  }
                />
              </div>
            ) : (
              <div className="flex h-[320px] w-full flex-col items-center justify-center gap-2 text-dg-gray-500">
                <AppIcon icon={appIconPuppy} className="h-8 w-8" />
                <span className="text-sm font-medium">
                  선택한 사진이 없어요
                </span>
              </div>
            )}
          </div>

          {imageUrl ? (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-dg-gray-700">
                <span>확대/축소</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                disabled={isUploading}
                aria-label="사진 확대/축소"
                className="h-2 w-full cursor-pointer accent-dg-green-500"
              />
            </div>
          ) : null}

          {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              ref={firstButtonRef}
              type="button"
              onClick={onReselect}
              disabled={isUploading}
              className={[
                "h-11 rounded-xl border border-gray-300 text-sm font-semibold text-dg-black",
                isUploading
                  ? "cursor-not-allowed bg-gray-100 opacity-50"
                  : "active:bg-gray-100",
              ].join(" ")}
            >
              재선택
            </button>
            <button
              type="button"
              onClick={() => {
                if (!croppedAreaPixels) return;
                onConfirmCrop(croppedAreaPixels);
              }}
              disabled={isConfirmDisabled}
              className={[
                "h-11 rounded-xl text-sm font-semibold text-white",
                !isConfirmDisabled
                  ? "bg-dg-green-500 active:bg-dg-green-600"
                  : "cursor-not-allowed bg-gray-300",
              ].join(" ")}
            >
              {isUploading ? "업로드 중..." : "완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlayContent, document.body);
}
