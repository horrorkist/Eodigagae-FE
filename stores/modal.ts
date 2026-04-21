import { create } from "zustand";
import type { ReactNode } from "react";
import type { ModalButtonTone, ModalConfig } from "@/types/modal";

export type { ModalButtonTone, ModalConfig } from "@/types/modal";

type ModalState = {
  isOpen: boolean;
  title: string | null;
  body: ReactNode | null;
  icon: ReactNode | null;
  confirmLabel: string;
  confirmTone: ModalButtonTone;
  cancelLabel: string | null;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
  onDismiss: (() => void) | null;

  open: (config: ModalConfig) => void;
  close: () => void;
};

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  title: null,
  body: null,
  icon: null,
  confirmLabel: "확인",
  confirmTone: "default",
  cancelLabel: null,
  onConfirm: null,
  onCancel: null,
  onDismiss: null,

  open: (config) =>
    set({
      isOpen: true,
      title: config.title ?? null,
      body: config.body,
      icon: config.icon ?? null,
      confirmLabel: config.confirmLabel ?? "확인",
      confirmTone: config.confirmTone ?? "default",
      cancelLabel: config.cancelLabel ?? null,
      onConfirm: config.onConfirm ?? null,
      onCancel: config.onCancel ?? null,
      onDismiss: config.onDismiss ?? null,
    }),

  // content 필드는 유지 (exit 애니메이션 중 깜빡임 방지)
  close: () => set({ isOpen: false }),
}));
