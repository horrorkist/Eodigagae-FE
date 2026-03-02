"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  COACHMARK_COOKIE_NAME,
  COACHMARK_COOKIE_VALUE,
  ONBOARDING_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/onboarding";
import { useCoachmarkStore } from "@/stores/coachmark";

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type CornerRadii = {
  tl: number;
  tr: number;
  br: number;
  bl: number;
};

type HighlightPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type TargetDefinition = {
  key: "search-bar" | "petpoi-chip" | "bottom-sheet-handle";
  selector: string;
  textSegments: Array<{
    text: string;
    className?: string;
    breakAfter?: boolean;
  }>;
  preferredPlacement: "top" | "bottom";
  textSide?: "left" | "right" | "auto";
  textMargins?: {
    left?: number;
    right?: number;
  };
  textVerticalGap?: number;
  highlightPadding?: Partial<HighlightPadding>;
  highlightMode?: "element" | "bottom-sheet-peek-strip";
};

type ViewportSize = {
  width: number;
  height: number;
};

type TargetMetrics = {
  rect: Rect;
  cornerRadii: CornerRadii;
  highlightRect?: Rect;
  highlightCornerRadii?: CornerRadii;
};

type TargetLayout = {
  key: TargetDefinition["key"];
  rect: Rect;
  textSegments: TargetDefinition["textSegments"];
  textSide: "left" | "right";
  textLeft: number;
  textTop: number;
  textWidth: number;
  lineStartX: number;
  lineStartY: number;
  lineEndX: number;
  lineEndY: number;
  highlightRect: Rect;
  highlightCornerRadii: CornerRadii;
};

type HighlightShape = {
  key: TargetDefinition["key"];
  path: string;
};

const TARGETS: TargetDefinition[] = [
  {
    key: "search-bar",
    selector: '[data-coachmark-id="search-bar"]',
    textSegments: [
      {
        text: "산책 중 필요한 장소를",
        breakAfter: true,
      },
      {
        text: "검색",
        className: "text-dg-green-500",
      },
      { text: "해보세요." },
    ],
    preferredPlacement: "bottom",
    textSide: "right",
    textVerticalGap: 200,
    textMargins: {
      left: 24,
      right: 80,
    },
  },
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
    textSide: "left",
    textVerticalGap: 40,
    textMargins: {
      left: 60,
      right: 24,
    },
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
    textSide: "left",
    highlightMode: "bottom-sheet-peek-strip",
    textMargins: {
      left: 80,
    },
  },
];

const DEFAULT_TEXT_LEFT_MARGIN = 24;
const DEFAULT_TEXT_RIGHT_MARGIN = 24;
const TEXT_VERTICAL_MARGIN = 24;
const TEXT_WIDTH = 240;
const DEFAULT_TEXT_VERTICAL_GAP = 40;
const TEXT_LABEL_OFFSET_X = 8;
const TEXT_FIRST_LINE_CENTER_OFFSET_Y = 12;
const TEXT_LINE_DOT_GAP_X = 12;
const LINE_START_LEFT_X_RATIO = 0.12;
const LINE_START_RIGHT_X_RATIO = 0.96;
const CONNECTOR_CORNER_RADIUS = 10;
const DEFAULT_VIEWPORT: ViewportSize = { width: 390, height: 844 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getViewport(): ViewportSize {
  if (typeof window === "undefined") return DEFAULT_VIEWPORT;
  return { width: window.innerWidth, height: window.innerHeight };
}

function toRect(raw: DOMRect | DOMRectReadOnly): Rect {
  return {
    left: raw.left,
    top: raw.top,
    right: raw.right,
    bottom: raw.bottom,
    width: raw.width,
    height: raw.height,
  };
}

function normalizeHighlightPadding(
  padding?: Partial<HighlightPadding>,
): HighlightPadding {
  return {
    top: padding?.top ?? 0,
    right: padding?.right ?? 0,
    bottom: padding?.bottom ?? 0,
    left: padding?.left ?? 0,
  };
}

function parseRadiusValue(raw: string, width: number, height: number): number {
  const token = raw.split("/")[0]?.trim().split(/\s+/)[0] ?? "0";
  if (!token) return 0;

  if (token.endsWith("%")) {
    const percentage = parseFloat(token.slice(0, -1));
    if (!Number.isFinite(percentage)) return 0;
    return (Math.min(width, height) * percentage) / 100;
  }

  const px = parseFloat(token);
  return Number.isFinite(px) ? px : 0;
}

function getElementCornerRadii(element: HTMLElement, rect: Rect): CornerRadii {
  const styles = getComputedStyle(element);
  const maxRadius = Math.min(rect.width, rect.height) / 2;

  return {
    tl: clamp(
      parseRadiusValue(styles.borderTopLeftRadius, rect.width, rect.height),
      0,
      maxRadius,
    ),
    tr: clamp(
      parseRadiusValue(styles.borderTopRightRadius, rect.width, rect.height),
      0,
      maxRadius,
    ),
    br: clamp(
      parseRadiusValue(styles.borderBottomRightRadius, rect.width, rect.height),
      0,
      maxRadius,
    ),
    bl: clamp(
      parseRadiusValue(styles.borderBottomLeftRadius, rect.width, rect.height),
      0,
      maxRadius,
    ),
  };
}

function toHighlightRect(
  rect: Rect,
  padding: HighlightPadding,
  viewport: ViewportSize,
): Rect {
  const left = clamp(rect.left - padding.left, 0, viewport.width);
  const top = clamp(rect.top - padding.top, 0, viewport.height);
  const right = clamp(rect.right + padding.right, 0, viewport.width);
  const bottom = clamp(rect.bottom + padding.bottom, 0, viewport.height);

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function fitCornerRadiiToRect(rect: Rect, radii: CornerRadii): CornerRadii {
  let tl = clamp(radii.tl, 0, Math.min(rect.width, rect.height) / 2);
  let tr = clamp(radii.tr, 0, Math.min(rect.width, rect.height) / 2);
  let br = clamp(radii.br, 0, Math.min(rect.width, rect.height) / 2);
  let bl = clamp(radii.bl, 0, Math.min(rect.width, rect.height) / 2);

  const topSum = tl + tr;
  if (topSum > rect.width && topSum > 0) {
    const ratio = rect.width / topSum;
    tl *= ratio;
    tr *= ratio;
  }

  const bottomSum = bl + br;
  if (bottomSum > rect.width && bottomSum > 0) {
    const ratio = rect.width / bottomSum;
    bl *= ratio;
    br *= ratio;
  }

  const leftSum = tl + bl;
  if (leftSum > rect.height && leftSum > 0) {
    const ratio = rect.height / leftSum;
    tl *= ratio;
    bl *= ratio;
  }

  const rightSum = tr + br;
  if (rightSum > rect.height && rightSum > 0) {
    const ratio = rect.height / rightSum;
    tr *= ratio;
    br *= ratio;
  }

  return { tl, tr, br, bl };
}

function getRoundedRectPath(rect: Rect, radii: CornerRadii): string {
  const r = fitCornerRadiiToRect(rect, radii);
  const x = rect.left;
  const y = rect.top;
  const w = rect.width;
  const h = rect.height;

  return [
    `M ${x + r.tl} ${y}`,
    `H ${x + w - r.tr}`,
    `Q ${x + w} ${y} ${x + w} ${y + r.tr}`,
    `V ${y + h - r.br}`,
    `Q ${x + w} ${y + h} ${x + w - r.br} ${y + h}`,
    `H ${x + r.bl}`,
    `Q ${x} ${y + h} ${x} ${y + h - r.bl}`,
    `V ${y + r.tl}`,
    `Q ${x} ${y} ${x + r.tl} ${y}`,
    "Z",
  ].join(" ");
}

function toCssBorderRadius(radii: CornerRadii): string {
  return `${radii.tl}px ${radii.tr}px ${radii.br}px ${radii.bl}px`;
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

function estimateTextHeight(
  textSegments: TargetDefinition["textSegments"],
): number {
  const lineCount =
    1 +
    textSegments.reduce(
      (count, segment) => count + (segment.breakAfter ? 1 : 0),
      0,
    );
  return lineCount * 26;
}

function resolveTextSide(
  target: TargetDefinition,
  targetCenterX: number,
  viewportWidth: number,
): "left" | "right" {
  if (target.textSide === "left" || target.textSide === "right") {
    return target.textSide;
  }
  return targetCenterX < viewportWidth / 2 ? "left" : "right";
}

function createTargetLayout(
  target: TargetDefinition,
  metrics: TargetMetrics,
  viewport: ViewportSize,
): TargetLayout {
  const rect = metrics.rect;
  const leftMargin = target.textMargins?.left ?? DEFAULT_TEXT_LEFT_MARGIN;
  const rightMargin = target.textMargins?.right ?? DEFAULT_TEXT_RIGHT_MARGIN;
  const textWidth = Math.min(
    TEXT_WIDTH,
    Math.max(160, viewport.width - leftMargin - rightMargin),
  );
  const centerX = rect.left + rect.width / 2;
  const textSide = resolveTextSide(target, centerX, viewport.width);
  const maxTextLeft = Math.max(
    leftMargin,
    viewport.width - textWidth - rightMargin,
  );
  const preferredTextLeft =
    textSide === "left"
      ? rect.left - TEXT_LABEL_OFFSET_X
      : rect.right - textWidth + TEXT_LABEL_OFFSET_X;
  const textLeft = clamp(preferredTextLeft, leftMargin, maxTextLeft);

  const placeBottom = target.preferredPlacement === "bottom";
  const verticalGap = target.textVerticalGap ?? DEFAULT_TEXT_VERTICAL_GAP;
  const estimatedTextHeight = estimateTextHeight(target.textSegments);
  const textTopCandidate = placeBottom
    ? rect.bottom + verticalGap
    : rect.top - estimatedTextHeight - verticalGap;
  const maxTextTop = Math.max(
    TEXT_VERTICAL_MARGIN,
    viewport.height - estimatedTextHeight - TEXT_VERTICAL_MARGIN,
  );
  const textTop = clamp(textTopCandidate, TEXT_VERTICAL_MARGIN, maxTextTop);

  const lineEndInset = Math.max(0, TEXT_LABEL_OFFSET_X - TEXT_LINE_DOT_GAP_X);
  const lineEndX =
    textSide === "left"
      ? textLeft + lineEndInset
      : textLeft + textWidth - lineEndInset;
  const lineEndY = textTop + TEXT_FIRST_LINE_CENTER_OFFSET_Y;
  const lineStartX =
    rect.left +
    rect.width *
      (textSide === "left"
        ? LINE_START_LEFT_X_RATIO
        : LINE_START_RIGHT_X_RATIO);

  const highlightRect = toHighlightRect(
    metrics.highlightRect ?? metrics.rect,
    normalizeHighlightPadding(target.highlightPadding),
    viewport,
  );
  const highlightCornerRadii = fitCornerRadiiToRect(
    highlightRect,
    metrics.highlightCornerRadii ?? metrics.cornerRadii,
  );

  return {
    key: target.key,
    rect,
    textSegments: target.textSegments,
    textSide,
    textLeft,
    textTop,
    textWidth,
    lineStartX,
    lineStartY: placeBottom ? rect.bottom + 4 : rect.top - 4,
    lineEndX,
    lineEndY,
    highlightRect,
    highlightCornerRadii,
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
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [viewport, setViewport] = useState<ViewportSize>(getViewport);
  const [targetMetrics, setTargetMetrics] = useState<
    Partial<Record<TargetDefinition["key"], TargetMetrics>>
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

    const updateTargetMetrics = () => {
      const nextMetrics: Partial<
        Record<TargetDefinition["key"], TargetMetrics>
      > = {};

      for (const target of TARGETS) {
        const element = document.querySelector<HTMLElement>(target.selector);
        if (!element) continue;

        const elementRect = toRect(element.getBoundingClientRect());
        const elementRadii = getElementCornerRadii(element, elementRect);

        const metrics: TargetMetrics = {
          rect: elementRect,
          cornerRadii: elementRadii,
        };

        if (target.highlightMode === "bottom-sheet-peek-strip") {
          const sheetRoot = document.querySelector<HTMLElement>(
            '[data-coachmark-id="bottom-sheet-root"]',
          );
          if (sheetRoot) {
            const sheetRect = toRect(sheetRoot.getBoundingClientRect());
            const sheetRadii = getElementCornerRadii(sheetRoot, sheetRect);
            const bottomNav = document.querySelector<HTMLElement>(
              '[data-coachmark-id="bottom-nav-host"]',
            );
            const navTop = bottomNav
              ? bottomNav.getBoundingClientRect().top
              : window.innerHeight;
            const stripBottom = clamp(navTop, sheetRect.top, sheetRect.bottom);

            if (stripBottom > sheetRect.top) {
              metrics.highlightRect = {
                left: sheetRect.left,
                top: sheetRect.top,
                right: sheetRect.right,
                bottom: stripBottom,
                width: sheetRect.width,
                height: stripBottom - sheetRect.top,
              };
              metrics.highlightCornerRadii = {
                tl: sheetRadii.tl,
                tr: sheetRadii.tr,
                br: 0,
                bl: 0,
              };
            }
          }
        }

        nextMetrics[target.key] = metrics;
      }

      setTargetMetrics(nextMetrics);
    };

    updateViewport();
    updateTargetMetrics();

    const intervalId = window.setInterval(updateTargetMetrics, 250);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("resize", updateTargetMetrics);
    window.addEventListener("scroll", updateTargetMetrics, true);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("resize", updateTargetMetrics);
      window.removeEventListener("scroll", updateTargetMetrics, true);
    };
  }, [isCoachmarkActive]);

  const layouts = useMemo(() => {
    return TARGETS.map((target) => {
      const metrics = targetMetrics[target.key];
      if (!metrics) return null;
      return createTargetLayout(target, metrics, viewport);
    }).filter((item): item is TargetLayout => item !== null);
  }, [targetMetrics, viewport]);

  const highlightShapes = useMemo<HighlightShape[]>(() => {
    return layouts.map((layout) => ({
      key: layout.key,
      path: getRoundedRectPath(
        layout.highlightRect,
        layout.highlightCornerRadii,
      ),
    }));
  }, [layouts]);

  if (!isMounted || !isCoachmarkResolved || !isCoachmarkActive) return null;
  if (typeof document === "undefined") return null;

  const content = (
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
            {highlightShapes.map((highlight) => (
              <path
                key={`mask-${highlight.key}`}
                d={highlight.path}
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

      {layouts.map((layout) => (
        <div
          key={`highlight-border-${layout.key}`}
          className="pointer-events-none absolute border-2 border-white/95"
          style={{
            top: layout.highlightRect.top,
            left: layout.highlightRect.left,
            width: layout.highlightRect.width,
            height: layout.highlightRect.height,
            borderRadius: toCssBorderRadius(layout.highlightCornerRadii),
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
            style={
              layout.textSide === "left"
                ? { paddingLeft: TEXT_LABEL_OFFSET_X, textAlign: "left" }
                : { paddingRight: TEXT_LABEL_OFFSET_X, textAlign: "right" }
            }
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

  return createPortal(content, document.body);
}
