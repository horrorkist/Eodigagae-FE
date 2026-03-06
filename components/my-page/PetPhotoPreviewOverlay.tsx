"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconPuppy,
  appIconXMark,
} from "@/components/icons/definitions.generated";

type PetPhotoPreviewOverlayProps = {
  previewUrl: string | null;
  error: string | null;
  canConfirm: boolean;
  onClose: () => void;
  onReselect: () => void;
  onConfirm: () => void;
};

export default function PetPhotoPreviewOverlay({
  previewUrl,
  error,
  canConfirm,
  onClose,
  onReselect,
  onConfirm,
}: PetPhotoPreviewOverlayProps) {
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

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
  }, [onClose]);

  const overlayContent = (
    <div
      className="fixed inset-0 z-[220] bg-black/55 p-4"
      onClick={onClose}
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
              onClick={onClose}
              aria-label="닫기"
              className="rounded-full p-1 text-gray-400 active:bg-gray-100"
            >
              <AppIcon icon={appIconXMark} className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mb-3 h-[320px] overflow-hidden rounded-2xl bg-dg-gray-400">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="반려동물 사진 미리보기"
                fill
                sizes="380px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-dg-gray-500">
                <AppIcon icon={appIconPuppy} className="h-8 w-8" />
                <span className="text-sm font-medium">
                  선택한 사진이 없어요
                </span>
              </div>
            )}
          </div>

          {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              ref={firstButtonRef}
              type="button"
              onClick={onReselect}
              className="h-11 rounded-xl border border-gray-300 text-sm font-semibold text-dg-black active:bg-gray-100"
            >
              재선택
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className={[
                "h-11 rounded-xl text-sm font-semibold text-white",
                canConfirm
                  ? "bg-dg-green-500 active:bg-dg-green-600"
                  : "cursor-not-allowed bg-gray-300",
              ].join(" ")}
            >
              완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlayContent, document.body);
}
