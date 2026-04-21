"use client";

import { useModalStore } from "@/stores/modal";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export default function Modal() {
  const isOpen = useModalStore((s) => s.isOpen);
  const title = useModalStore((s) => s.title);
  const body = useModalStore((s) => s.body);
  const icon = useModalStore((s) => s.icon);
  const confirmLabel = useModalStore((s) => s.confirmLabel);
  const confirmTone = useModalStore((s) => s.confirmTone);
  const cancelLabel = useModalStore((s) => s.cancelLabel);
  const onConfirm = useModalStore((s) => s.onConfirm);
  const onCancel = useModalStore((s) => s.onCancel);
  const onDismiss = useModalStore((s) => s.onDismiss);
  const close = useModalStore((s) => s.close);

  const confirmButtonClassName =
    confirmTone === "danger"
      ? "flex-1 py-2.5 rounded-xl bg-dg-red-sub text-sm font-medium text-white active:brightness-95 transition-[filter,colors]"
      : "flex-1 py-2.5 rounded-xl bg-dg-green-500 text-sm font-medium text-white active:bg-dg-green-600 transition-colors";

  const handleDismiss = () => {
    onDismiss?.();
    close();
  };

  const handleConfirm = () => {
    onConfirm?.();
    close();
  };

  const handleCancel = () => {
    onCancel?.();
    close();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title ?? "알림"}
              className="pointer-events-auto relative w-full max-w-[340px] bg-white rounded-2xl shadow-xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {/* X 닫기 */}
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>

              {/* Content */}
              <div className="px-5 pt-6 pb-4">
                {icon && <div className="flex justify-center mb-3">{icon}</div>}
                {title && (
                  <h2 className="text-base font-semibold text-center mb-2">
                    {title}
                  </h2>
                )}
                <div className="text-sm text-gray-600 text-center">{body}</div>
              </div>

              {/* Buttons */}
              <div className="px-5 pb-5 flex gap-2">
                {cancelLabel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-xl bg-dg-gray-400 py-2.5 text-sm font-medium text-dg-gray-600 active:brightness-95 transition-[filter,colors]"
                  >
                    {cancelLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={confirmButtonClassName}
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
