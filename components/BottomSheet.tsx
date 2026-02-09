"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBottomSheetStore } from "@/stores/bottomSheet";

type Props = {
  children: React.ReactNode;
  title?: string;
  peekHeight?: number;
  bottomNavHeight?: number;
  closeThreshold?: number;
  openThreshold?: number;
};

export default function BottomSheet({
  children,
  title,
  peekHeight = 72,
  bottomNavHeight = 56,
  closeThreshold = 140,
  openThreshold = 40,
}: Props) {
  const snapPoints = useBottomSheetStore((s) => s.snapPoints);
  const index = useBottomSheetStore((s) => s.index);
  const isOpen = useBottomSheetStore((s) => s.isOpen);
  const open = useBottomSheetStore((s) => s.open);
  const close = useBottomSheetStore((s) => s.close);
  const snapTo = useBottomSheetStore((s) => s.snapTo);

  const minSnap = useMemo(() => Math.min(...snapPoints), [snapPoints]);
  const maxSnap = useMemo(() => Math.max(...snapPoints), [snapPoints]);

  const getSafeBottomPx = () => {
    if (typeof window === "undefined") return 0;
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--safe-bottom")
      .trim();
    const n = parseFloat(v.replace("px", ""));
    return Number.isFinite(n) ? n : 0;
  };

  const [vh, setVh] = useState<number>(() =>
    typeof window === "undefined" ? 0 : window.innerHeight,
  );
  const [safeBottom, setSafeBottom] = useState<number>(() =>
    typeof window === "undefined" ? 0 : getSafeBottomPx(),
  );

  useEffect(() => {
    const onResize = () => {
      setVh(window.innerHeight);
      setSafeBottom(getSafeBottomPx());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const bottomInset = bottomNavHeight + safeBottom;

  // closedTop = translateY 값 (닫힌 상태에서 시트 상단 위치)
  const closedTop = useMemo(
    () => Math.max(0, vh - bottomInset - peekHeight),
    [vh, bottomInset, peekHeight],
  );

  // ── DOM refs ──
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 드래그 중 source-of-truth (리렌더 0회)
  const topRef = useRef<number>(closedTop);
  const overDragRef = useRef(0);
  const rafRef = useRef(0);

  /** DOM에 직접 transform + opacity 반영 — Layout/Paint 스킵 */
  const applyTop = useCallback(
    (px: number) => {
      topRef.current = px;
      if (sheetRef.current)
        sheetRef.current.style.transform = `translateY(${px}px)`;
      if (contentRef.current)
        contentRef.current.style.opacity = px <= closedTop - 8 ? "1" : "0";
    },
    [closedTop],
  );

  // ── Store 상태 → DOM 동기화 (CSS transition 포함) ──
  useLayoutEffect(() => {
    const target = isOpen ? (snapPoints[index] ?? minSnap) : closedTop;
    if (sheetRef.current)
      sheetRef.current.style.transition = "transform 280ms ease-in-out";
    applyTop(target);
  }, [isOpen, index, snapPoints, minSnap, closedTop, applyTop]);

  // ── Drag / fling (전부 ref) ──
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTopRef = useRef(0);

  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const FLING_V = 1.0;
  const FLING_MIN_DT = 12;

  const nearestSnapIndex = useCallback(
    (topPx: number) => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < snapPoints.length; i++) {
        const d = Math.abs(snapPoints[i] - topPx);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
    [snapPoints],
  );

  const clampTop = useCallback(
    (t: number) => Math.min(Math.max(t, minSnap), closedTop),
    [minSnap, closedTop],
  );

  const settleAfterDrag = useCallback(
    (topPx: number, extraDown: number) => {
      if (sheetRef.current)
        sheetRef.current.style.transition = "transform 280ms ease-in-out";

      if (extraDown >= closeThreshold) {
        const lowest = nearestSnapIndex(maxSnap);
        snapTo(lowest);
        close();
        applyTop(closedTop);
        return;
      }

      if (topPx > closedTop - openThreshold) {
        close();
        applyTop(closedTop);
        return;
      }

      const near = nearestSnapIndex(topPx);
      snapTo(near);
      open(near);
      applyTop(snapPoints[near]);
    },
    [
      closeThreshold,
      openThreshold,
      closedTop,
      maxSnap,
      snapPoints,
      nearestSnapIndex,
      snapTo,
      close,
      open,
      applyTop,
    ],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startTopRef.current = topRef.current;
    overDragRef.current = 0;

    lastYRef.current = e.clientY;
    lastTRef.current = performance.now();
    velocityRef.current = 0;

    if (sheetRef.current) sheetRef.current.style.transition = "none";

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;

      const now = performance.now();
      const clientY = e.clientY;

      const dt = now - lastTRef.current;
      if (dt >= FLING_MIN_DT) {
        velocityRef.current = (clientY - lastYRef.current) / dt;
        lastYRef.current = clientY;
        lastTRef.current = now;
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const dy = clientY - startYRef.current;
        const proposed = startTopRef.current + dy;
        overDragRef.current = Math.max(0, proposed - closedTop);
        applyTop(clampTop(proposed));
      });
    },
    [closedTop, clampTop, applyTop],
  );

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    const v = velocityRef.current;

    if (sheetRef.current)
      sheetRef.current.style.transition = "transform 280ms ease-in-out";

    if (Math.abs(v) >= FLING_V) {
      if (v < 0) {
        snapTo(0);
        open(0);
        applyTop(minSnap);
      } else {
        const lowest = nearestSnapIndex(maxSnap);
        snapTo(lowest);
        close();
        applyTop(closedTop);
      }
      return;
    }

    settleAfterDrag(topRef.current, overDragRef.current);
  }, [
    minSnap,
    closedTop,
    maxSnap,
    nearestSnapIndex,
    snapTo,
    open,
    close,
    applyTop,
    settleAfterDrag,
  ]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed left-0 right-0 top-0 z-100 transition-opacity duration-300",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        style={{
          bottom: bottomInset,
          backgroundColor: "rgba(0,0,0,0.35)",
          touchAction: "none",
        }}
        onPointerDownCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerMoveCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerUpCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.target !== e.currentTarget) return;
          close();
        }}
        aria-hidden="true"
      />

      {/* Clip boundary — 바텀내브 위로만 시트가 보이도록 클리핑 */}
      <div
        className="fixed inset-0 z-101 overflow-hidden pointer-events-none"
        style={{ bottom: bottomInset, contain: "strict" }}
      >
        {/* Sheet — transform으로만 이동 (Layout/Paint 0회) */}
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal={isOpen ? "true" : "false"}
          aria-label={title ?? "bottom sheet"}
          className="absolute inset-x-0 top-0 h-full bg-white rounded-t-2xl shadow-[0_-12px_24px_rgba(0,0,0,0.1)] pointer-events-auto"
          style={{
            transform: `translateY(${topRef.current}px)`,
            willChange: "transform",
            contain: "layout style",
          }}
        >
          {/* Handle */}
          <div
            className="px-4 pt-3 pb-2 select-none touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
            {title ? (
              <div className="mt-3 text-base font-semibold">{title}</div>
            ) : null}
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="px-4 pb-6 overflow-auto h-[calc(100%-48px)]"
            style={{
              opacity: 0,
              pointerEvents: isOpen ? "auto" : "none",
              transition: "opacity 150ms",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
