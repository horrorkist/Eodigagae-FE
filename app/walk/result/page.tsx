"use client";

import Image from "next/image";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconCloud,
  appIconPuppy,
} from "@/components/icons/definitions.generated";
import { useEmit } from "@/hooks/useEventBus";
import {
  buildRecentWalkChartData,
  formatHistoryDistanceLabel,
  formatHistoryDurationLabel,
  generateMockWalkHistoryEntries,
} from "@/lib/walkHistory";
import { useDogStore } from "@/stores/dogStore";
import { useMySettingsStore } from "@/stores/mySettingsStore";
import { useWalkHistoryStore } from "@/stores/walkHistoryStore";
import { useWalkCompletionStore } from "@/stores/walkCompletionStore";

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-4 py-5 text-dg-black shadow-sm">
      <p className="text-sm font-medium text-dg-gray-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-dg-black">{value}</p>
    </div>
  );
}

function ResultPetAvatar({
  photoUrl,
  name,
}: {
  photoUrl: string | null;
  name: string;
}) {
  return (
    <div className="relative mx-auto w-fit">
      <div className="relative h-24 w-24 overflow-hidden rounded-full bg-dg-gray-400 ring-4 ring-white shadow-sm">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${name} 프로필 사진`}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dg-gray-500">
            <AppIcon icon={appIconPuppy} className="h-10 w-10" />
          </div>
        )}
      </div>
    </div>
  );
}

type ResultChartSlide = {
  key: "distanceM" | "durationSec";
  valueKey: "distanceM" | "durationSec";
  chartTitle: string;
  formatter: (value: number) => string;
  averageFormatter: (value: number) => string;
  averageSuffix: string;
};

function getNiceChartScale(
  valueKey: ResultChartSlide["valueKey"],
  maxValue: number,
) {
  if (maxValue <= 0) {
    return { ticks: [0], domainMax: 1 };
  }

  const labelCandidates =
    valueKey === "distanceM"
      ? [
          100, 200, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000,
          5000, 7000, 8000, 9000, 10000, 12000, 15000, 20000,
        ]
      : [
          60, 120, 180, 300, 600, 900, 1200, 1800, 2400, 3600, 5400, 7200,
          10800,
        ];
  const topTick =
    [...labelCandidates]
      .reverse()
      .find((candidate) => candidate <= maxValue) ?? labelCandidates[0];
  const middleTarget = topTick / 2;
  const middleTick =
    [...labelCandidates]
      .reverse()
      .find(
      (candidate) =>
        candidate <= middleTarget && candidate > 0 && candidate < topTick,
    ) ?? Math.round(middleTarget);

  return {
    ticks: [0, middleTick, topTick],
    domainMax: maxValue,
  };
}

function formatDurationAxisLabel(durationSec: number) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0분";

  const totalMinutes = Math.round(durationSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}분`;
  }

  if (minutes <= 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

function formatDurationAverageLabel(durationSec: number) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0분";

  const totalMinutes = Math.floor(durationSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${totalMinutes}분`;
  }

  if (minutes <= 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

function ResultChartXAxisTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const value = payload?.value ?? "";
  const isToday = value === "오늘";

  return (
    <text
      x={x}
      y={y + 18}
      textAnchor="middle"
      className={isToday ? "fill-dg-green-500" : "fill-dg-gray-600"}
      style={{ fontSize: 11, fontWeight: isToday ? 600 : 500 }}
    >
      {value}
    </text>
  );
}

function ResultChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  formatter: (value: number) => string;
}) {
  const value = payload?.[0]?.value;
  if (!active || typeof value !== "number") return null;

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-dg-black shadow-lg shadow-black/10">
      <p className="text-xs font-medium text-dg-gray-600">{label}</p>
      <p className="mt-1 text-sm font-semibold text-dg-black">
        {formatter(value)}
      </p>
    </div>
  );
}

function ResultChartCarousel({
  data,
}: {
  data: ReturnType<typeof buildRecentWalkChartData>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const chartLeftMarginPx = 8;
  const chartRightMarginPx = 0;
  const chartTopMarginPx = 36;
  const chartXAxisHeightPx = 30;
  const bestBadgeGapPx = 12;
  const slides = useMemo<ResultChartSlide[]>(
    () => [
      {
        key: "distanceM",
        valueKey: "distanceM",
        chartTitle: "산책 거리",
        formatter: formatHistoryDistanceLabel,
        averageFormatter: formatHistoryDistanceLabel,
        averageSuffix: "걸었어요",
      },
      {
        key: "durationSec",
        valueKey: "durationSec",
        chartTitle: "산책 시간",
        formatter: formatHistoryDurationLabel,
        averageFormatter: formatDurationAverageLabel,
        averageSuffix: "산책했어요",
      },
    ],
    [],
  );
  const maxValueByKey = useMemo(
    () => ({
      distanceM: Math.max(0, ...data.map((item) => item.distanceM)),
      durationSec: Math.max(0, ...data.map((item) => item.durationSec)),
    }),
    [data],
  );
  const highlightedBarIndexByKey = useMemo(
    () => ({
      distanceM:
        maxValueByKey.distanceM > 0
          ? data.findIndex((item) => item.distanceM === maxValueByKey.distanceM)
          : -1,
      durationSec:
        maxValueByKey.durationSec > 0
          ? data.findIndex(
              (item) => item.durationSec === maxValueByKey.durationSec,
            )
          : -1,
    }),
    [data, maxValueByKey],
  );
  const chartScaleByKey = useMemo(
    () => ({
      distanceM: getNiceChartScale("distanceM", maxValueByKey.distanceM),
      durationSec: getNiceChartScale("durationSec", maxValueByKey.durationSec),
    }),
    [maxValueByKey],
  );
  const chartYAxisWidthByKey = useMemo(
    () => ({
      distanceM: 42,
      durationSec: 46,
    }),
    [],
  );
  const averageValueByKey = useMemo(
    () => ({
      distanceM: data.reduce((sum, item) => sum + item.distanceM, 0) / data.length,
      durationSec:
        data.reduce((sum, item) => sum + item.durationSec, 0) / data.length,
    }),
    [data],
  );

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const nextIndex = Math.round(node.scrollLeft / node.clientWidth);
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
  }, [slides.length]);

  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-white">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="pointer-events-auto flex snap-x snap-mandatory overflow-x-auto scroll-smooth touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide) => (
            <div
              key={slide.key}
              className="w-full shrink-0 snap-center bg-white px-4 py-5 text-dg-black shadow-sm"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-dg-gray-700">
                  {slide.chartTitle}
                </p>
                <p className="text-xl font-semibold leading-tight text-dg-black">
                  평균{" "}
                  <span className="text-dg-green-500">
                    {slide.averageFormatter(averageValueByKey[slide.valueKey])}
                  </span>{" "}
                  {slide.averageSuffix}
                </p>
              </div>

              <div
                className="relative mt-5 h-56 [&_.recharts-cartesian-axis-tick]:outline-none [&_.recharts-cartesian-axis-tick_text]:outline-none [&_.recharts-cartesian-grid-horizontal]:outline-none [&_.recharts-cartesian-grid-horizontal_line]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_svg]:outline-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {(() => {
                  const bestIndex = highlightedBarIndexByKey[slide.valueKey];
                  const bestValue =
                    bestIndex >= 0 ? data[bestIndex]?.[slide.valueKey] : 0;
                  const plotHeight = 224 - chartTopMarginPx - chartXAxisHeightPx;
                  const topRatio =
                    chartScaleByKey[slide.valueKey].domainMax > 0 &&
                    typeof bestValue === "number"
                      ? bestValue / chartScaleByKey[slide.valueKey].domainMax
                      : 0;
                  const badgeTop = Math.max(
                    0,
                    chartTopMarginPx +
                      (1 - topRatio) * plotHeight -
                      bestBadgeGapPx,
                  );

                  if (
                    bestIndex < 0 ||
                    typeof bestValue !== "number" ||
                    bestValue <= 0
                  ) {
                    return null;
                  }

                  return (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-10"
                      aria-hidden="true"
                      style={{ top: badgeTop }}
                    >
                      <div
                        className="absolute -translate-x-1/2 -translate-y-full"
                        style={{
                          left: `calc(${chartLeftMarginPx}px + ${
                            (bestIndex + 0.5) / data.length
                          } * (100% - ${chartLeftMarginPx + chartRightMarginPx + chartYAxisWidthByKey[slide.valueKey]}px))`,
                        }}
                      >
                        <div className="relative will-change-transform rounded-md bg-dg-green-500 px-2 py-1 text-[11px] font-medium text-white shadow">
                          BEST!
                          <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-dg-green-500" />
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    accessibilityLayer={false}
                    tabIndex={-1}
                    margin={{
                      top: chartTopMarginPx,
                      right: chartRightMarginPx,
                      bottom: 0,
                      left: chartLeftMarginPx,
                    }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(151, 151, 151, 0.28)"
                      syncWithTicks
                      horizontalValues={chartScaleByKey[slide.valueKey].ticks}
                      pointerEvents="none"
                    />
                    <XAxis
                      dataKey="dateLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={<ResultChartXAxisTick />}
                    />
                    <YAxis
                      orientation="right"
                      width={chartYAxisWidthByKey[slide.valueKey]}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={2}
                      tick={{
                        fill: "var(--color-dg-gray-600)",
                        fontSize: 11,
                        pointerEvents: "none",
                      }}
                      ticks={chartScaleByKey[slide.valueKey].ticks}
                      tickFormatter={(value: number) =>
                        slide.valueKey === "durationSec"
                          ? formatDurationAxisLabel(value)
                          : slide.formatter(value)
                      }
                      domain={[0, chartScaleByKey[slide.valueKey].domainMax]}
                      pointerEvents="none"
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(17, 24, 39, 0.04)" }}
                      content={
                        <ResultChartTooltip formatter={slide.formatter} />
                      }
                    />
                    <Bar
                      dataKey={slide.valueKey}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={26}
                      minPointSize={4}
                      tabIndex={-1}
                      className="focus:outline-none"
                    >
                      {data.map((item) => (
                        <Cell
                          key={`${slide.key}:${item.dateKey}`}
                          fill={
                            item.isCurrentDay
                              ? "var(--color-dg-green-500)"
                              : "var(--color-dg-gray-500)"
                          }
                          tabIndex={-1}
                          className="focus:outline-none"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 px-4 py-5">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => {
                const node = scrollRef.current;
                if (!node) return;
                node.scrollTo({
                  left: node.clientWidth * index,
                  behavior: "smooth",
                });
                setActiveIndex(index);
              }}
              className={[
                "h-2 rounded-full transition-all focus:outline-none focus-visible:ring-0",
                activeIndex === index
                  ? "w-5 bg-dg-green-500"
                  : "w-2 bg-dg-gray-500/50",
              ].join(" ")}
              aria-label={`${slide.chartTitle} 보기`}
              aria-pressed={activeIndex === index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function findScrollContainer(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight + 1;

    if (isScrollable) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

export default function WalkResultPage() {
  return (
    <Suspense fallback={null}>
      <WalkResultPageContent />
    </Suspense>
  );
}

function WalkResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emit = useEmit();
  const dog = useDogStore((s) => s.dog);
  const summary = useWalkCompletionStore((s) => s.summary);
  const clearSummary = useWalkCompletionStore((s) => s.clearSummary);
  const historyEntries = useWalkHistoryStore((s) => s.entries);
  const mockHistoryEntries = useMySettingsStore((s) => s.mockHistoryEntries);
  const dogName = dog?.name?.trim() ? dog.name.trim() : null;
  const dogPhotoUrl = dog?.photo?.variantUrl ?? null;
  const isDebugPreview = searchParams.get("debug") === "1";
  const debugSummary = useMemo(() => {
    if (!isDebugPreview) return null;

    const previewEntries =
      mockHistoryEntries.length > 0
        ? mockHistoryEntries
        : generateMockWalkHistoryEntries(new Date());
    const latestEntry = previewEntries[0];
    if (!latestEntry) return null;

    return {
      startedAt: latestEntry.startedAt,
      endedAt: latestEntry.endedAt,
      durationSec: latestEntry.durationSec,
      distanceM: latestEntry.distanceM,
      source: latestEntry.source,
    };
  }, [isDebugPreview, mockHistoryEntries]);
  const effectiveSummary = summary ?? debugSummary;
  const effectiveHistoryEntries = isDebugPreview
    ? mockHistoryEntries
    : historyEntries;

  useEffect(() => {
    if (!effectiveSummary) {
      router.replace("/");
      return;
    }

    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_HIDE" });

    return () => {
      emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    };
  }, [effectiveSummary, emit, router]);

  const handleReturnHome = useCallback(() => {
    if (summary) {
      clearSummary();
    }
    emit({ channel: "ui", type: "UI_BOTTOM_CHROME_SHOW" });
    router.replace("/");
  }, [clearSummary, emit, router, summary]);

  if (!effectiveSummary) {
    return null;
  }

  const chartData = buildRecentWalkChartData({
    entries: effectiveHistoryEntries,
    currentWalk: {
      startedAt: effectiveSummary.startedAt,
      endedAt: effectiveSummary.endedAt,
      durationSec: effectiveSummary.durationSec,
      distanceM: effectiveSummary.distanceM,
    },
  });

  return (
    <WalkResultContent
      key={`${effectiveSummary.endedAt}:${isDebugPreview ? "debug" : "live"}`}
      dogName={dogName}
      dogPhotoUrl={dogPhotoUrl}
      durationLabel={formatHistoryDurationLabel(effectiveSummary.durationSec)}
      distanceLabel={formatHistoryDistanceLabel(effectiveSummary.distanceM)}
      chartData={chartData}
      onReturnHome={handleReturnHome}
    />
  );
}

function WalkResultContent({
  dogName,
  dogPhotoUrl,
  durationLabel,
  distanceLabel,
  chartData,
  onReturnHome,
}: {
  dogName: string | null;
  dogPhotoUrl: string | null;
  durationLabel: string;
  distanceLabel: string;
  chartData: ReturnType<typeof buildRecentWalkChartData>;
  onReturnHome: () => void;
}) {
  const [isSummaryRevealed, setIsSummaryRevealed] = useState(false);
  const [isContentEndVisible, setIsContentEndVisible] = useState(true);
  const contentEndRef = useRef<HTMLDivElement | null>(null);
  const resultHeadline = dogName ? `${dogName} 산책 완료!` : "산책 완료!";

  useLayoutEffect(() => {
    if (!isSummaryRevealed) return;

    const target = contentEndRef.current;
    if (!target) return;

    const scrollContainer = findScrollContainer(target);
    const viewport = window.visualViewport;
    const updateVisibility = () => {
      const targetBottom = target.getBoundingClientRect().bottom;
      const containerBottom = scrollContainer
        ? scrollContainer.getBoundingClientRect().bottom
        : viewport?.height ?? window.innerHeight;

      setIsContentEndVisible(targetBottom <= containerBottom + 4);
    };

    updateVisibility();

    window.addEventListener("resize", updateVisibility);
    scrollContainer?.addEventListener("scroll", updateVisibility, {
      passive: true,
    });
    viewport?.addEventListener("resize", updateVisibility);
    viewport?.addEventListener("scroll", updateVisibility);

    const resizeObserver = new ResizeObserver(updateVisibility);
    resizeObserver.observe(target);
    if (scrollContainer) {
      resizeObserver.observe(scrollContainer);
    }

    return () => {
      window.removeEventListener("resize", updateVisibility);
      scrollContainer?.removeEventListener("scroll", updateVisibility);
      viewport?.removeEventListener("resize", updateVisibility);
      viewport?.removeEventListener("scroll", updateVisibility);
      resizeObserver.disconnect();
    };
  }, [isSummaryRevealed]);

  const handlePrimaryAction = useCallback(() => {
    if (!isSummaryRevealed) {
      setIsSummaryRevealed(true);
      return;
    }

    onReturnHome();
  }, [isSummaryRevealed, onReturnHome]);
  const isPrimaryActionVisible = !isSummaryRevealed || isContentEndVisible;

  return (
    <div className="pointer-events-auto flex min-h-full flex-col bg-dg-blue-500">
      <div className="flex-1 px-5 pt-8">
        <div className="mx-auto flex w-full max-w-[430px] flex-col">
          <div className="relative pt-6 text-center">
            <AppIcon
              icon={appIconCloud}
              className="pointer-events-none absolute left-1 top-14 h-10 w-20 opacity-90"
            />
            <AppIcon
              icon={appIconCloud}
              className="pointer-events-none absolute right-0 -top-1 h-12 w-24 opacity-80"
            />
            <ResultPetAvatar
              photoUrl={dogPhotoUrl}
              name={dogName ?? "반려견"}
            />
            <h1 className="mt-5 text-xl font-semibold leading-tight text-white">
              {resultHeadline}
            </h1>
            <p className="mt-3 text-base font-medium leading-6 text-white">
              오늘의 산책 기록을 확인해보세요.
            </p>
          </div>

          <AnimatePresence initial={false}>
            {isSummaryRevealed ? (
              <motion.div
                key="walk-summary-cards"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      delayChildren: 0.1,
                      staggerChildren: 0.42,
                    },
                  },
                }}
                className="mt-10 space-y-4"
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1] },
                    },
                  }}
                  className="grid grid-cols-2 gap-3"
                >
                  <SummaryMetric label="산책 시간" value={durationLabel} />
                  <SummaryMetric label="이동 거리" value={distanceLabel} />
                </motion.div>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.74, ease: [0.16, 1, 0.3, 1] },
                    },
                  }}
                  className="space-y-3"
                >
                  <div>
                    <p className="text-base font-semibold text-white">
                      지난 7일 차트예요
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      같은 날 여러 번 산책한 기록은 하루 단위로 합산했어요.
                    </p>
                  </div>
                  <ResultChartCarousel data={chartData} />
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div
            aria-hidden="true"
            style={{
              height: isSummaryRevealed
                ? "calc(var(--safe-bottom) + 112px)"
                : "32px",
            }}
          />
          <div ref={contentEndRef} className="h-px" aria-hidden="true" />
        </div>
      </div>

      {isSummaryRevealed ? (
        isPrimaryActionVisible ? (
          <div
            className="fixed inset-x-0 bottom-0 z-20 px-5 pb-5 pt-5 bg-white"
            style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
          >
            <div className="mx-auto w-full max-w-[430px]">
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="flex h-14 w-full items-center justify-center rounded-lg bg-dg-green-500 px-4 text-base font-semibold text-white active:bg-dg-green-600"
              >
                돌아가기
              </button>
            </div>
          </div>
        ) : null
      ) : (
        <div
          className="px-5 pb-5 pt-3"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
        >
          <div className="mx-auto w-full max-w-[430px]">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="flex h-14 w-full items-center justify-center rounded-lg bg-dg-green-500 px-4 text-base font-semibold text-white active:bg-dg-green-600"
            >
              확인하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
