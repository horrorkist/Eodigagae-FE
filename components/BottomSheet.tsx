"use client";

import React, {
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

  // ✅ 닫힌 상태의 top (핸들만 보이게 + 바텀내브 만큼 위로)
  const closedTop = useMemo(
    () => Math.max(0, vh - bottomInset - peekHeight),
    [vh, bottomInset, peekHeight],
  );

  // ✅ 시각 top (항상 존재)
  const [visualTop, setVisualTop] = useState<number>(() =>
    isOpen ? (snapPoints[index] ?? minSnap) : closedTop,
  );

  // ✅ “더 아래로 당긴 정도” (화면에선 내려가지 않게 하고, 닫기 판정에만 씀)
  const [overDrag, setOverDrag] = useState(0);

  useLayoutEffect(() => {
    if (isOpen) setVisualTop(snapPoints[index] ?? minSnap);
    else setVisualTop(closedTop);
    setOverDrag(0);
  }, [isOpen, index, snapPoints, minSnap, closedTop]);

  // ---------- Drag / fling ----------
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTopRef = useRef(0);

  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const FLING_V = 1.0;
  const FLING_MIN_DT = 12;

  const nearestSnapIndex = (topPx: number) => {
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
  };

  // ✅ top은 절대 closedTop 아래로 내려가지 않게(최소 높이 보장)
  const clampTop = (t: number) => Math.min(Math.max(t, minSnap), closedTop);

  const settleAfterDrag = (topPx: number, extraDown: number) => {
    // 1) 아래로 “더” 당긴 값이 충분하면 닫기 유지
    if (extraDown >= closeThreshold) {
      const lowest = nearestSnapIndex(maxSnap);
      snapTo(lowest);
      close();
      setVisualTop(closedTop);
      setOverDrag(0);
      return;
    }

    // 2) 아직 닫힘 근처면 닫힘으로 복귀
    if (topPx > closedTop - openThreshold) {
      close();
      setVisualTop(closedTop);
      setOverDrag(0);
      return;
    }

    // 3) 아니면 가장 가까운 스냅으로 열기 확정
    const near = nearestSnapIndex(topPx);
    snapTo(near);
    open(near);
    setVisualTop(snapPoints[near]);
    setOverDrag(0);
  };

  const onHandlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startTopRef.current = visualTop;

    const now = performance.now();
    lastYRef.current = e.clientY;
    lastTRef.current = now;
    velocityRef.current = 0;
    setOverDrag(0);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;

    const now = performance.now();
    const dy = e.clientY - startYRef.current;
    const proposedTop = startTopRef.current + dy;

    // ✅ closedTop 아래로 내려가려는 움직임은 “overDrag”로만 기록
    const nextTop = clampTop(proposedTop);
    const extraDown = Math.max(0, proposedTop - closedTop);

    const dt = now - lastTRef.current;
    if (dt >= FLING_MIN_DT) {
      const dyStep = e.clientY - lastYRef.current;
      velocityRef.current = dyStep / dt;
      lastYRef.current = e.clientY;
      lastTRef.current = now;
    }

    setVisualTop(nextTop);
    setOverDrag(extraDown);
  };

  const onHandlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const v = velocityRef.current;

    // ✅ 플링
    if (Math.abs(v) >= FLING_V) {
      if (v < 0) {
        // 위로 플링 => 1단(최대)
        snapTo(0);
        open(0);
        setVisualTop(minSnap);
        setOverDrag(0);
        return;
      } else {
        // 아래로 플링 => 닫기(핸들만 남김)
        const lowest = nearestSnapIndex(maxSnap);
        snapTo(lowest);
        close();
        setVisualTop(closedTop);
        setOverDrag(0);
        return;
      }
    }

    // 플링 아니면 위치 + overDrag 기반 정착
    settleAfterDrag(visualTop, overDrag);
  };

  // 컨텐츠는 “완전 open”일 때만 터치 허용(깜빡임/충돌 방지)
  const contentVisible = visualTop <= closedTop - 8;
  const contentInteractive = isOpen;

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
        style={{ bottom: bottomInset, backgroundColor: "rgba(0,0,0,0.35)" }}
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget) return;
          close();
          setVisualTop(closedTop);
          setOverDrag(0);
        }}
        aria-hidden="true"
      />

      {/* Sheet: bottomInset만큼 띄워서 바텀내브 안 가림 */}
      <div
        role="dialog"
        aria-modal={isOpen ? "true" : "false"}
        aria-label={title ?? "bottom sheet"}
        className={[
          "fixed left-0 right-0 z-101 bg-white rounded-t-2xl will-change-[top]",
          // ✅ 아래로 퍼지는 shadow가 내비를 “침범”해 보이는 걸 막기 위해 위로만 shadow
          "shadow-[0_-12px_24px_rgba(0,0,0,0.18)]",
        ].join(" ")}
        style={{
          top: visualTop,
          bottom: bottomInset,
          transition: draggingRef.current ? "none" : "top 280ms ease-in-out",
        }}
      >
        {/* Handle */}
        <div
          className="px-4 pt-3 pb-2 select-none touch-none"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
          {title ? (
            <div className="mt-3 text-base font-semibold">{title}</div>
          ) : null}
        </div>

        {/* Content */}
        <div
          className="px-4 pb-6 overflow-auto h-[calc(100%-48px)] transition-opacity duration-150"
          style={{
            opacity: contentVisible ? 1 : 0,
            pointerEvents: contentInteractive ? "auto" : "none",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
