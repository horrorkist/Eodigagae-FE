import type { ReactNode } from "react";

export type ModalButtonTone = "default" | "danger";

export type ModalConfig = {
  title?: string;
  body: ReactNode;
  icon?: ReactNode;
  confirmLabel?: string;
  confirmTone?: ModalButtonTone;
  cancelLabel?: string | null;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
};
