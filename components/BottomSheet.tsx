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
import { useUiChromeStore } from "@/stores/uiChrome";
import { BOTTOM_CHROME_HEIGHT_PX } from "@/lib/bottomChromeMetrics";

export type BottomSheetHeightMotion = {
  durationMs: number;
  easing: "linear" | "ease-in-out" | "ease-out";
};

const DRAG_MOTION: BottomSheetHeightMotion = {
  durationMs: 0,
  easing: "linear",
};
const SNAP_MOTION: BottomSheetHeightMotion = {
  durationMs: 280,
  easing: "ease-in-out",
};
const FLING_OPEN_MOTION: BottomSheetHeightMotion = {
  durationMs: 80,
  easing: "ease-out",
};
const TOP_OVERLAY_SELECTOR = '[data-top-overlay-root="true"]';
const TOP_OVERLAY_CLEARANCE_PX = 12;
const DEFAULT_FULLY_OPEN_TOP_RATIO = 0.08;

type Props = {
  children: React.ReactNode;
  title?: string;
  peekHeight?: number;
  bottomNavHeight?: number;
  showBackdrop?: boolean;
  onVisibleHeightChange?: (heightPx: number, motion?: BottomSheetHeightMotion) => void;
  closeThreshold?: number;
  openThreshold?: number;
};

export default function BottomSheet({
  children,
  title,
  peekHeight = 72,
  bottomNavHeight = BOTTOM_CHROME_HEIGHT_PX,
  showBackdrop = true,
  onVisibleHeightChange,
  closeThreshold = 140,
  openThreshold = 40,
}: Props) {
  const snapPoints = useBottomSheetStore((s) => s.snapPoints);
  const index = useBottomSheetStore((s) => s.index);
  const isOpen = useBottomSheetStore((s) => s.isOpen);
  const setSnapPoints = useBottomSheetStore((s) => s.setSnapPoints);
  const open = useBottomSheetStore((s) => s.open);
  const close = useBottomSheetStore((s) => s.close);
  const snapTo = useBottomSheetStore((s) => s.snapTo);
  const setContentScrollState = useBottomSheetStore(
    (s) => s.setContentScrollState,
  );
  const resetContentScrollState = useBottomSheetStore(
    (s) => s.resetContentScrollState,
  );
  const isBottomChromeVisible = useUiChromeStore(
    (s) => s.isBottomChromeVisible,
  );

  const minSnap = useMemo(() => Math.min(...snapPoints), [snapPoints]);
  const maxSnap = useMemo(() => Math.max(...snapPoints), [snapPoints]);
  const clipBoundaryRef = useRef<HTMLDivElement>(null);

  const getSafeBottomPx = () => {
    if (typeof window === "undefined") return 0;
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--safe-bottom")
      .trim();
    const n = parseFloat(v.replace("px", ""));
    return Number.isFinite(n) ? n : 0;
  };

  const [safeBottom, setSafeBottom] = useState<number>(() =>
    typeof window === "undefined" ? 0 : getSafeBottomPx(),
  );
  const [topOverlayBottom, setTopOverlayBottom] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId = 0;
    let observedOverlay: HTMLElement | null = null;

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(measureTopOverlay);
          });
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(measureTopOverlay);
          });

    const syncObservedOverlay = () => {
      const nextOverlay = document.querySelector<HTMLElement>(
        TOP_OVERLAY_SELECTOR,
      );
      if (observedOverlay === nextOverlay) return nextOverlay;

      if (observedOverlay && resizeObserver) {
        resizeObserver.unobserve(observedOverlay);
      }

      observedOverlay = nextOverlay;

      if (observedOverlay && resizeObserver) {
        resizeObserver.observe(observedOverlay);
      }

      return observedOverlay;
    };

    function measureTopOverlay() {
      rafId = 0;
      const overlay = syncObservedOverlay();
      const nextBottom = overlay
        ? Math.round(
            overlay.getBoundingClientRect().bottom + TOP_OVERLAY_CLEARANCE_PX,
          )
        : 0;

      setTopOverlayBottom((current) =>
        current === nextBottom ? current : nextBottom,
      );
    }

    measureTopOverlay();

    window.addEventListener("resize", measureTopOverlay);
    mutationObserver?.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measureTopOverlay);
      mutationObserver?.disconnect();
      if (observedOverlay && resizeObserver) {
        resizeObserver.unobserve(observedOverlay);
      }
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isBottomChromeVisible) return;
    if (!isOpen) return;
    close();
  }, [isBottomChromeVisible, isOpen, close]);

  const closedBottomInset = bottomNavHeight + safeBottom;
  const activeBottomInset = closedBottomInset;
  const backdropZIndexClass = "z-100";
  const clipZIndexClass = "z-101";
  const measureSheetViewportHeight = useCallback(() => {
    if (typeof window === "undefined") return 0;

    const clipBoundary = clipBoundaryRef.current;
    if (!clipBoundary) return window.innerHeight;

    const clipHeight = Math.round(clipBoundary.getBoundingClientRect().height);
    return clipHeight + activeBottomInset;
  }, [activeBottomInset]);
  const [vh, setVh] = useState<number>(() =>
    typeof window === "undefined" ? 0 : window.innerHeight,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewportMetrics = () => {
      setVh(measureSheetViewportHeight());
      setSafeBottom(getSafeBottomPx());
    };

    updateViewportMetrics();

    const clipBoundary = clipBoundaryRef.current;
    const resizeObserver =
      typeof ResizeObserver === "undefined" || !clipBoundary
        ? null
        : new ResizeObserver(() => {
            updateViewportMetrics();
          });

    if (resizeObserver && clipBoundary) {
      resizeObserver.observe(clipBoundary);
    }
    window.addEventListener("resize", updateViewportMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateViewportMetrics);
    };
  }, [measureSheetViewportHeight]);

  const closedTop = useMemo(
    () => Math.max(0, vh - closedBottomInset - peekHeight),
    [vh, closedBottomInset, peekHeight],
  );
  const firstStageMaxOffset = useMemo(
    () => Math.max(0, Math.round(closedTop - maxSnap)),
    [closedTop, maxSnap],
  );

  const dynamicSnapPoints = useMemo(() => {
    if (vh <= 0) return [];

    const maxOpenTop = Math.max(0, closedTop - 1);
    if (maxOpenTop <= 0) return [0];

    const overlayLimitedTop = Math.max(0, Math.round(topOverlayBottom));
    const fullyOpenTop = Math.min(
      Math.max(
        Math.round(vh * DEFAULT_FULLY_OPEN_TOP_RATIO),
        overlayLimitedTop,
      ),
      maxOpenTop,
    );
    const range = Math.max(0, maxOpenTop - fullyOpenTop);

    if (range < 96) return [fullyOpenTop];

    const points = [0, 0.7].map((fraction) =>
      Math.round(fullyOpenTop + range * fraction),
    );

    return Array.from(new Set(points)).sort((a, b) => a - b);
  }, [vh, closedTop, topOverlayBottom]);

  useEffect(() => {
    if (dynamicSnapPoints.length === 0) return;
    setSnapPoints(dynamicSnapPoints);
  }, [dynamicSnapPoints, setSnapPoints]);

  // ── DOM refs ──
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const topRef = useRef<number>(closedTop);
  const overDragRef = useRef(0);
  const rafRef = useRef(0);
  const fastOpenFlingRef = useRef(false);
  const didInitialSyncRef = useRef(false);
  const lastVisibleHeightRef = useRef<number | null>(null);
  const lastScrollMeasureRef = useRef<{
    isScrollable: boolean;
    isAtBottom: boolean;
  } | null>(null);

  const updateContentScrollState = useCallback(() => {
    if (!isOpen || index !== 0) {
      lastScrollMeasureRef.current = null;
      resetContentScrollState();
      return;
    }

    const contentEl = contentRef.current;
    if (!contentEl) {
      lastScrollMeasureRef.current = null;
      resetContentScrollState();
      return;
    }

    const isScrollable = contentEl.scrollHeight - contentEl.clientHeight > 1;
    const isAtBottom =
      !isScrollable ||
      contentEl.scrollTop + contentEl.clientHeight >= contentEl.scrollHeight - 2;
    const prev = lastScrollMeasureRef.current;

    if (
      prev &&
      prev.isScrollable === isScrollable &&
      prev.isAtBottom === isAtBottom
    ) {
      return;
    }

    lastScrollMeasureRef.current = { isScrollable, isAtBottom };
    setContentScrollState({ isScrollable, isAtBottom });
  }, [index, isOpen, resetContentScrollState, setContentScrollState]);

  const emitVisibleHeight = useCallback(
    (topPx: number, motion: BottomSheetHeightMotion) => {
      if (!onVisibleHeightChange) return;
      const rawOffset = Math.max(0, Math.round(closedTop - topPx));
      const nextHeight = Math.min(rawOffset, firstStageMaxOffset);
      if (lastVisibleHeightRef.current === nextHeight) return;
      lastVisibleHeightRef.current = nextHeight;
      onVisibleHeightChange(nextHeight, motion);
    },
    [closedTop, firstStageMaxOffset, onVisibleHeightChange],
  );

  /** transform + opacity 만 변경 (Layout/Paint 0회) */
  const applyTop = useCallback(
    (px: number, motion: BottomSheetHeightMotion) => {
      topRef.current = px;
      if (sheetRef.current)
        sheetRef.current.style.transform = `translateY(${px}px)`;
      if (contentRef.current)
        contentRef.current.style.opacity = px <= closedTop - 8 ? "1" : "0";
      emitVisibleHeight(px, motion);
    },
    [closedTop, emitVisibleHeight],
  );

  /** clip 경계 아래 잘리는 영역만큼 paddingBottom 보상 — settle 시에만 호출 */
  const applyClipPadding = useCallback((snapPx: number) => {
    if (contentRef.current)
      contentRef.current.style.paddingBottom = `${snapPx}px`;
  }, []);

  // ── Store → DOM 동기화 ──
  useLayoutEffect(() => {
    const target = isOpen ? (snapPoints[index] ?? minSnap) : closedTop;
    let motion = SNAP_MOTION;
    if (sheetRef.current) {
      if (!didInitialSyncRef.current) {
        sheetRef.current.style.transition = "none";
        motion = DRAG_MOTION;
      } else if (fastOpenFlingRef.current) {
        sheetRef.current.style.transition = "transform 80ms ease-out";
        fastOpenFlingRef.current = false;
        motion = FLING_OPEN_MOTION;
      } else {
        sheetRef.current.style.transition = "transform 280ms ease-in-out";
        motion = SNAP_MOTION;
      }
    }
    applyTop(target, motion);
    applyClipPadding(target);
    didInitialSyncRef.current = true;
  }, [
    isOpen,
    index,
    snapPoints,
    minSnap,
    closedTop,
    applyTop,
    applyClipPadding,
  ]);

  // ── Drag / fling ──
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTopRef = useRef(0);

  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const FLING_V = 1.0;
  const FLING_MIN_DT = 12;
  const FULLY_OPEN_EPSILON = 1;

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
        close(sheetRef);
        applyTop(closedTop, SNAP_MOTION);
        applyClipPadding(closedTop);
        return;
      }

      if (topPx > closedTop - openThreshold) {
        close(sheetRef);
        applyTop(closedTop, SNAP_MOTION);
        applyClipPadding(closedTop);
        return;
      }

      const near = nearestSnapIndex(topPx);
      snapTo(near);
      open(near);
      applyTop(snapPoints[near], SNAP_MOTION);
      applyClipPadding(snapPoints[near]);
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
      applyClipPadding,
    ],
  );

  const beginDrag = useCallback((clientY: number) => {
    draggingRef.current = true;
    startYRef.current = clientY;
    startTopRef.current = topRef.current;
    overDragRef.current = 0;

    lastYRef.current = clientY;
    lastTRef.current = performance.now();
    velocityRef.current = 0;

    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }, []);

  const updateDrag = useCallback(
    (clientY: number) => {
      if (!draggingRef.current) return;

      const now = performance.now();
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
        applyTop(clampTop(proposed), DRAG_MOTION);
      });
    },
    [closedTop, clampTop, applyTop],
  );

  const endDrag = useCallback(() => {
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
        fastOpenFlingRef.current = true;
        if (sheetRef.current)
          sheetRef.current.style.transition = "transform 80ms ease-out";
        snapTo(0);
        open(0);
        applyTop(minSnap, FLING_OPEN_MOTION);
      } else {
        const lowest = nearestSnapIndex(maxSnap);
        snapTo(lowest);
        close(sheetRef);
        applyTop(closedTop, SNAP_MOTION);
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      beginDrag(e.clientY);

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [beginDrag],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      updateDrag(e.clientY);
    },
    [updateDrag],
  );

  const onPointerUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  type ContentGestureMode = "idle" | "pending" | "scroll" | "sheet";
  type ContentMoveHooks = {
    onEnterSheet?: () => void;
    onSheetMove?: () => void;
  };
  const contentGestureModeRef = useRef<ContentGestureMode>("idle");
  const contentStartYRef = useRef(0);
  const contentForceSheetRef = useRef(false);
  const CONTENT_TOP_EPSILON = 1;

  const startContentGesture = useCallback(
    (clientY: number) => {
      contentStartYRef.current = clientY;
      contentGestureModeRef.current = "pending";

      const isFullyOpen = topRef.current <= minSnap + FULLY_OPEN_EPSILON;
      contentForceSheetRef.current = !isFullyOpen;
    },
    [minSnap],
  );

  const finishContentGesture = useCallback(() => {
    if (contentGestureModeRef.current === "sheet") endDrag();
    contentGestureModeRef.current = "idle";
    contentForceSheetRef.current = false;
  }, [endDrag]);

  const processContentMove = useCallback(
    (clientY: number, hooks?: ContentMoveHooks) => {
      const mode = contentGestureModeRef.current;
      if (mode === "idle") return;

      if (mode === "scroll") {
        const dy = clientY - contentStartYRef.current;
        const contentTop = contentRef.current?.scrollTop ?? 0;
        const shouldSwitchToSheet =
          !contentForceSheetRef.current &&
          dy > 0 &&
          contentTop <= CONTENT_TOP_EPSILON;

        if (!shouldSwitchToSheet) return;

        contentGestureModeRef.current = "sheet";
        beginDrag(clientY);
        hooks?.onEnterSheet?.();
        return;
      }

      if (mode === "pending") {
        const dy = clientY - contentStartYRef.current;
        if (Math.abs(dy) < 4) return;

        const contentTop = contentRef.current?.scrollTop ?? 0;
        const shouldControlSheet =
          contentForceSheetRef.current ||
          (dy > 0 && contentTop <= CONTENT_TOP_EPSILON);

        if (shouldControlSheet) {
          contentGestureModeRef.current = "sheet";
          beginDrag(contentStartYRef.current);
          hooks?.onEnterSheet?.();
          updateDrag(clientY);
          return;
        }

        contentGestureModeRef.current = "scroll";
        return;
      }

      if (contentGestureModeRef.current === "sheet") {
        hooks?.onSheetMove?.();
        updateDrag(clientY);
      }
    },
    [beginDrag, updateDrag],
  );

  const onContentPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      startContentGesture(e.clientY);
    },
    [startContentGesture],
  );

  const onContentPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      processContentMove(e.clientY, {
        onEnterSheet: () => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          e.preventDefault();
        },
        onSheetMove: () => {
          e.preventDefault();
        },
      });
    },
    [processContentMove],
  );

  const onContentPointerUp = useCallback(
    (e?: React.PointerEvent) => {
      if (e?.pointerType === "touch") return;
      finishContentGesture();
    },
    [finishContentGesture],
  );

  const onContentTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      startContentGesture(touch.clientY);
    },
    [startContentGesture],
  );

  const onContentTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      processContentMove(touch.clientY);
    },
    [processContentMove],
  );

  const onContentTouchEnd = useCallback(() => {
    finishContentGesture();
  }, [finishContentGesture]);

  const onContentScroll = useCallback(() => {
    updateContentScrollState();
  }, [updateContentScrollState]);

  useEffect(() => {
    if (!isOpen || index !== 0) {
      lastScrollMeasureRef.current = null;
      resetContentScrollState();
      return;
    }

    const rafId = requestAnimationFrame(() => {
      updateContentScrollState();
    });
    let resizeRafId = 0;
    const target = contentRef.current;
    if (!target || typeof ResizeObserver === "undefined") {
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
      };
    }

    const observer = new ResizeObserver(() => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        updateContentScrollState();
      });
    });
    observer.observe(target);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      observer.disconnect();
    };
  }, [children, index, isOpen, resetContentScrollState, updateContentScrollState]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (onVisibleHeightChange) onVisibleHeightChange(0, DRAG_MOTION);
      lastScrollMeasureRef.current = null;
      resetContentScrollState();
    },
    [onVisibleHeightChange, resetContentScrollState],
  );

  if (!isBottomChromeVisible) return null;

  return (
    <>
      {showBackdrop && (
        <div
          className={[
            "absolute left-0 right-0 top-0 transition-opacity duration-300",
            backdropZIndexClass,
            isOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          ].join(" ")}
          style={{
            bottom: activeBottomInset,
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
            close(sheetRef);
          }}
          aria-hidden="true"
        />
      )}

      {/* Clip boundary */}
      <div
        ref={clipBoundaryRef}
        className={[
          "absolute inset-0 overflow-hidden pointer-events-none",
          clipZIndexClass,
        ].join(" ")}
        style={{ bottom: activeBottomInset }}
      >
        {/* Sheet — h-full 고정, transform으로만 이동 */}
        <div
          ref={sheetRef}
          data-coachmark-id="bottom-sheet-root"
          role="dialog"
          aria-modal={isOpen ? "true" : "false"}
          aria-label={title ?? "bottom sheet"}
          className="absolute inset-x-0 top-0 h-full bg-white rounded-t-2xl shadow-[0_-2px_6px_rgba(0,0,0,0.08)] pointer-events-auto"
          style={{
            willChange: "transform",
            // SSR/hydration 이전 프레임에서도 닫힌 위치로 시작해 초기 오픈 플래시를 막는다.
            transform: `translateY(calc(100% - ${peekHeight}px))`,
          }}
        >
          {/* Handle */}
          <div
            data-coachmark-id="bottom-sheet-handle"
            className="px-4 pt-3 pb-2 select-none touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
            {title ? (
              <div className="mt-3 text-base font-semibold">{title}</div>
            ) : null}
          </div>

          {/* Content — 항상 고정 높이, clip container가 가시 영역 처리 */}
          <div
            ref={contentRef}
            data-bottom-sheet-content="true"
            className={[
              "px-4 pb-6 h-[calc(100%-48px)]",
              isOpen && index === 0 ? "overflow-scroll" : "overflow-hidden",
            ].join(" ")}
            style={{
              opacity: 0,
              pointerEvents: isOpen ? "auto" : "none",
              transition: "opacity 150ms",
              touchAction: isOpen && index === 0 ? "pan-y" : "none",
            }}
            onPointerDown={onContentPointerDown}
            onPointerMove={onContentPointerMove}
            onPointerUp={onContentPointerUp}
            onPointerCancel={onContentPointerUp}
            onTouchStart={onContentTouchStart}
            onTouchMove={onContentTouchMove}
            onTouchEnd={onContentTouchEnd}
            onTouchCancel={onContentTouchEnd}
            onScroll={onContentScroll}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
