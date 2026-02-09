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
  peekHeight?: number; // 닫혀도 보이는 높이
  bottomNavHeight?: number; // 바텀내브 높이
  closeThreshold?: number; // 아래로 더 당기면 닫기(판정용)
  openThreshold?: number; // closedTop에서 이만큼 이상 올라오면 open 확정
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

  const closedTop = useMemo(
    () => Math.max(0, vh - bottomInset - peekHeight),
    [vh, bottomInset, peekHeight],
  );

  // ── DOM refs (직접 DOM 조작용) ──
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 드래그 중 source-of-truth (setState 대신 ref → 리렌더 0회)
  const topRef = useRef<number>(closedTop);
  const overDragRef = useRef(0);
  const rafRef = useRef(0);

  /** DOM에 직접 position + opacity 반영 (리렌더 없음) */
  const applyTop = useCallback(
    (px: number) => {
      topRef.current = px;
      if (sheetRef.current) sheetRef.current.style.top = `${px}px`;
      if (contentRef.current)
        contentRef.current.style.opacity = px <= closedTop - 8 ? "1" : "0";
    },
    [closedTop],
  );

  // ── Store 상태 변경 → DOM 동기화 (CSS transition 포함) ──
  useLayoutEffect(() => {
    const target = isOpen ? (snapPoints[index] ?? minSnap) : closedTop;
    if (sheetRef.current)
      sheetRef.current.style.transition = "top 280ms ease-in-out";
    applyTop(target);
  }, [isOpen, index, snapPoints, minSnap, closedTop, applyTop]);

  // ── Drag / fling (전부 ref — 리렌더 0회) ──
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTopRef = useRef(0);

  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const FLING_V = 1.0; // px/ms
  const FLING_MIN_DT = 12; // ms

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
        sheetRef.current.style.transition = "top 280ms ease-in-out";

      // 아래로 충분히 당김 → 닫기
      if (extraDown >= closeThreshold) {
        const lowest = nearestSnapIndex(maxSnap);
        snapTo(lowest);
        close();
        applyTop(closedTop);
        return;
      }

      // 닫힘 근처 → 닫힘 복귀
      if (topPx > closedTop - openThreshold) {
        close();
        applyTop(closedTop);
        return;
      }

      // 가장 가까운 스냅으로 열기 확정
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

    // 드래그 중 transition 끄기 → 즉각 반응
    if (sheetRef.current) sheetRef.current.style.transition = "none";

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;

      const now = performance.now();
      const clientY = e.clientY;

      // 속도 추적 (모든 샘플, throttle 아님)
      const dt = now - lastTRef.current;
      if (dt >= FLING_MIN_DT) {
        velocityRef.current = (clientY - lastYRef.current) / dt;
        lastYRef.current = clientY;
        lastTRef.current = now;
      }

      // DOM 업데이트는 rAF로 throttle
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
      sheetRef.current.style.transition = "top 280ms ease-in-out";

    // 플링 처리
    if (Math.abs(v) >= FLING_V) {
      if (v < 0) {
        // 위로 플링 → 최대 확장
        snapTo(0);
        open(0);
        applyTop(minSnap);
      } else {
        // 아래로 플링 → 닫기
        const lowest = nearestSnapIndex(maxSnap);
        snapTo(lowest);
        close();
        applyTop(closedTop);
      }
      return;
    }

    // 플링 아니면 위치 + overDrag 기반 정착
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

  // rAF cleanup on unmount
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <>
      {/* Backdrop: 바텀내브 영역 제외 */}
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

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal={isOpen ? "true" : "false"}
        aria-label={title ?? "bottom sheet"}
        className="fixed left-0 right-0 z-101 bg-white rounded-t-2xl shadow-[0_-12px_24px_rgba(0,0,0,0.1)]"
        style={{
          top: topRef.current,
          bottom: bottomInset,
          willChange: "top",
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
    </>
  );
}
