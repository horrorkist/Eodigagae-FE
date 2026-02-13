"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type FABMenuItem = {
  key: string;
  label: string;
  icon?: IconDefinition;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function FloatingFABMenu({ items }: { items: FABMenuItem[] }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((p) => !p), []);
  const onItemClick = useCallback((item: FABMenuItem) => {
    if (item.disabled) return;
    item.onClick();
  }, []);

  return (
    <div className="pointer-events-auto relative flex flex-col items-end">
      {/* ── Menu Items ── */}
      <div className="relative z-50 flex flex-col-reverse items-end gap-2 mb-3">
        <AnimatePresence>
          {open &&
            items.map((item, i) => (
              <motion.button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => onItemClick(item)}
                className={[
                  "flex items-center gap-2.5 rounded-2xl px-4 py-2.5",
                  "text-sm font-medium whitespace-nowrap",
                  "shadow-lg shadow-black/10",
                  "backdrop-blur-xl",
                  "transition-[background-color,transform]",
                  item.disabled
                    ? "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
                    : item.active
                    ? "bg-blue-500 text-white shadow-blue-500/25"
                    : "bg-white/90 text-gray-800 hover:bg-white",
                ].join(" ")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  delay: i * 0.04,
                }}
              >
                {item.icon && (
                  <FontAwesomeIcon
                    icon={item.icon}
                    className="w-4 h-4 shrink-0"
                  />
                )}
                <span>{item.label}</span>
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

      {/* ── FAB Trigger ── */}
      <motion.button
        type="button"
        onClick={toggle}
        className={[
          "relative z-50 flex items-center justify-center",
          "w-10 h-10 rounded-full",
          "shadow-lg shadow-black/15",
          "transition-[box-shadow,transform]",
          open
            ? "bg-gray-800 shadow-gray-800/30"
            : "bg-blue-500 shadow-blue-500/30",
        ].join(" ")}
        aria-expanded={open}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        whileTap={{ scale: 0.95 }}
      >
        {/* Burger / Close icon (two bars that rotate) */}
        <motion.span
          className="absolute w-3 h-0.5 rounded-full bg-white"
          animate={{ y: open ? 0 : 5, rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        />
        <motion.span
          className="absolute w-3 h-0.5 rounded-full bg-white"
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        />
        <motion.span
          className="absolute w-3 h-0.5 rounded-full bg-white"
          animate={{ y: open ? 0 : -5, rotate: open ? -45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        />
      </motion.button>
    </div>
  );
}
