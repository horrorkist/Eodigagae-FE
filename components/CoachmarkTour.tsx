"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  COACHMARK_COOKIE_NAME,
  COACHMARK_COOKIE_VALUE,
  ONBOARDING_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/onboarding";
import { useCoachmarkStore } from "@/stores/coachmark";

type TargetDefinition = {
  key: "petpoi-chip" | "bottom-sheet-handle";
  selector: string;
  textSegments: Array<{
    text: string;
    className?: string;
    breakAfter?: boolean;
  }>;
  preferredPlacement: "top" | "bottom";
};

type ViewportSize = {
  width: number;
  height: number;
};

type TargetLayout = {
  key: TargetDefinition["key"];
  rect: DOMRect;
  textSegments: TargetDefinition["textSegments"];
  textLeft: number;
  textTop: number;
  textWidth: number;
  lineStartX: number;
  lineStartY: number;
  lineEndX: number;
  lineEndY: number;
};

const TARGETS: TargetDefinition[] = [
  {
    key: "petpoi-chip",
    selector: '[data-coachmark-id="petpoi-chip"]',
    textSegments: [
      {
        text: "반려견 동반 가능 장소",
        className: "text-dg-green-500",
      },
      { text: "와", breakAfter: true },
      { text: "편의시설을 확인해보세요." },
    ],
    preferredPlacement: "bottom",
  },
  {
    key: "bottom-sheet-handle",
    selector: '[data-coachmark-id="bottom-sheet-handle"]',
    textSegments: [
      { text: "우리 아이에게 적합한 ", breakAfter: true },
      {
        text: "산책 경로",
        className: "text-dg-green-500",
      },
      { text: "를 " },
      { text: "추천", className: "text-dg-green-500" },
      { text: "받아보세요." },
    ],
    preferredPlacement: "top",
  },
];

const TEXT_LEFT_MARGIN = 70;
const TEXT_WIDTH = 300;
const TEXT_VERTICAL_GAP = 40;
const TEXT_LABEL_OFFSET_X = 8;
const TEXT_FIRST_LINE_CENTER_OFFSET_Y = 12;
const TEXT_LINE_DOT_GAP_X = 12;
const LINE_START_X_RATIO = 0.12;
const CONNECTOR_CORNER_RADIUS = 10;
const DEFAULT_VIEWPORT: ViewportSize = { width: 390, height: 844 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getViewport(): ViewportSize {
  if (typeof window === "undefined") return DEFAULT_VIEWPORT;
  return { width: window.innerWidth, height: window.innerHeight };
}

function toHighlightRect(rect: DOMRect, viewport: ViewportSize) {
  const left = clamp(rect.left, 0, viewport.width);
  const top = clamp(rect.top, 0, viewport.height);
  const right = clamp(rect.right, 0, viewport.width);
  const bottom = clamp(rect.bottom, 0, viewport.height);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getRoundedConnectorPath(layout: TargetLayout): string {
  const sx = layout.lineStartX;
  const sy = layout.lineStartY;
  const ex = layout.lineEndX;
  const ey = layout.lineEndY;
  const dx = ex - sx;
  const dy = ey - sy;

  const radius = Math.min(CONNECTOR_CORNER_RADIUS, Math.abs(dx), Math.abs(dy));
  if (radius <= 0.5) {
    return `M ${sx} ${sy} L ${sx} ${ey} L ${ex} ${ey}`;
  }

  const yBeforeCorner = ey - Math.sign(dy) * radius;
  const xAfterCorner = sx + Math.sign(dx) * radius;

  return [
    `M ${sx} ${sy}`,
    `L ${sx} ${yBeforeCorner}`,
    `Q ${sx} ${ey} ${xAfterCorner} ${ey}`,
    `L ${ex} ${ey}`,
  ].join(" ");
}

function createTargetLayout(
  target: TargetDefinition,
  rect: DOMRect,
  viewport: ViewportSize,
): TargetLayout {
  const textWidth = Math.min(TEXT_WIDTH, viewport.width - TEXT_LEFT_MARGIN);
  const centerX = rect.left + rect.width / 2;
  const startX = rect.left + rect.width * LINE_START_X_RATIO;
  const maxTextLeft = viewport.width - textWidth;
  const textLeft = clamp(
    centerX - textWidth / 2,
    TEXT_LEFT_MARGIN,
    maxTextLeft,
  );

  const placeBottom = target.preferredPlacement === "bottom";
  const estimatedTextHeight = 48;
  const textTopCandidate = placeBottom
    ? rect.bottom + TEXT_VERTICAL_GAP
    : rect.top - estimatedTextHeight - TEXT_VERTICAL_GAP;
  const textTop = clamp(
    textTopCandidate,
    TEXT_LEFT_MARGIN,
    viewport.height - estimatedTextHeight - TEXT_LEFT_MARGIN,
  );

  const lineEndX =
    textLeft + Math.max(0, TEXT_LABEL_OFFSET_X - TEXT_LINE_DOT_GAP_X);
  const lineEndY = textTop + TEXT_FIRST_LINE_CENTER_OFFSET_Y;

  return {
    key: target.key,
    rect,
    textSegments: target.textSegments,
    textLeft,
    textTop,
    textWidth,
    lineStartX: startX,
    lineStartY: placeBottom ? rect.bottom + 4 : rect.top - 4,
    lineEndX,
    lineEndY,
  };
}

export default function CoachmarkTour() {
  const maskId = useId();
  const isCoachmarkResolved = useCoachmarkStore((s) => s.isResolved);
  const isCoachmarkActive = useCoachmarkStore((s) => s.isActive);
  const resolveCoachmarkFromCookie = useCoachmarkStore(
    (s) => s.resolveFromCookie,
  );
  const setCoachmarkActive = useCoachmarkStore((s) => s.setActive);
  const [viewport, setViewport] = useState<ViewportSize>(getViewport);
  const [targetRects, setTargetRects] = useState<
    Partial<Record<TargetDefinition["key"], DOMRect>>
  >({});

  const closeCoachmark = useCallback(() => {
    if (typeof document !== "undefined") {
      document.cookie = [
        `${COACHMARK_COOKIE_NAME}=${COACHMARK_COOKIE_VALUE}`,
        "Path=/",
        `Max-Age=${ONBOARDING_COOKIE_MAX_AGE_SECONDS}`,
        "SameSite=Lax",
      ].join("; ");
    }
    setCoachmarkActive(false);
  }, [setCoachmarkActive]);

  useEffect(() => {
    resolveCoachmarkFromCookie();
  }, [resolveCoachmarkFromCookie]);

  useEffect(() => {
    if (!isCoachmarkActive) return;

    const updateViewport = () => {
      setViewport(getViewport());
    };
    const updateTargetRects = () => {
      const nextRects: Partial<Record<TargetDefinition["key"], DOMRect>> = {};
      for (const target of TARGETS) {
        const element = document.querySelector<HTMLElement>(target.selector);
        if (element) {
          nextRects[target.key] = element.getBoundingClientRect();
        }
      }
      setTargetRects(nextRects);
    };

    updateViewport();
    updateTargetRects();

    const intervalId = window.setInterval(updateTargetRects, 250);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("resize", updateTargetRects);
    window.addEventListener("scroll", updateTargetRects, true);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("resize", updateTargetRects);
      window.removeEventListener("scroll", updateTargetRects, true);
    };
  }, [isCoachmarkActive]);

  const layouts = useMemo(() => {
    return TARGETS.map((target) => {
      const rect = targetRects[target.key];
      if (!rect) return null;
      return createTargetLayout(target, rect, viewport);
    }).filter((item): item is TargetLayout => item !== null);
  }, [targetRects, viewport]);

  const highlightRects = useMemo(() => {
    return layouts.map((layout) => ({
      key: layout.key,
      ...toHighlightRect(layout.rect, viewport),
    }));
  }, [layouts, viewport]);

  if (!isCoachmarkResolved || !isCoachmarkActive) return null;

  return (
    <button
      type="button"
      onClick={closeCoachmark}
      className="fixed inset-0 z-[220] text-left pointer-events-auto"
      aria-label="코치마크 닫기"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect
              x={0}
              y={0}
              width={viewport.width}
              height={viewport.height}
              fill="white"
            />
            {highlightRects.map((highlight) => (
              <rect
                key={`mask-${highlight.key}`}
                x={highlight.left}
                y={highlight.top}
                width={highlight.width}
                height={highlight.height}
                rx={16}
                ry={16}
                fill="black"
              />
            ))}
          </mask>
        </defs>

        <rect
          x={0}
          y={0}
          width={viewport.width}
          height={viewport.height}
          fill="rgba(0,0,0,0.58)"
          mask={`url(#${maskId})`}
        />
      </svg>

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {layouts.map((layout) => (
          <path
            key={`line-${layout.key}`}
            d={getRoundedConnectorPath(layout)}
            stroke="white"
            strokeOpacity={0.9}
            strokeWidth={2}
            strokeDasharray="1 4"
            strokeLinecap="round"
            fill="none"
          />
        ))}
        {layouts.map((layout) => (
          <circle
            key={`dot-${layout.key}`}
            cx={layout.lineEndX}
            cy={layout.lineEndY}
            r={4}
            fill="white"
            fillOpacity={0.95}
          />
        ))}
      </svg>

      {highlightRects.map((highlight) => (
        <div
          key={`highlight-${highlight.key}`}
          className="pointer-events-none absolute rounded-2xl border-2 border-white/95"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      ))}

      {layouts.map((layout) => (
        <div
          key={`text-${layout.key}`}
          className="absolute"
          style={{
            top: layout.textTop,
            left: layout.textLeft,
            width: layout.textWidth,
          }}
        >
          <p
            className="pointer-events-none text-lg leading-snug text-white"
            style={{
              paddingLeft: TEXT_LABEL_OFFSET_X,
            }}
          >
            {layout.textSegments.map((segment, index) => (
              <span
                key={`${layout.key}-segment-${index}`}
                className={segment.className}
              >
                {segment.text}
                {segment.breakAfter ? <br /> : null}
              </span>
            ))}
          </p>
        </div>
      ))}
    </button>
  );
}
