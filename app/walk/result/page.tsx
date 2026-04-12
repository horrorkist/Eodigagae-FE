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
  title: string;
  valueKey: "distanceM" | "durationSec";
  formatter: (value: number) => string;
  subtitle: string;
};

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
  const slides = useMemo<ResultChartSlide[]>(
    () => [
      {
        key: "distanceM",
        title: "산책 거리",
        valueKey: "distanceM",
        formatter: formatHistoryDistanceLabel,
        subtitle: "최근 7일 동안 걸은 거리예요.",
      },
      {
        key: "durationSec",
        title: "산책 시간",
        valueKey: "durationSec",
        formatter: formatHistoryDurationLabel,
        subtitle: "최근 7일 동안 산책한 시간이예요.",
      },
    ],
    [],
  );

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const nextIndex = Math.round(node.scrollLeft / node.clientWidth);
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
  }, [slides.length]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg">
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
              <div>
                <p className="text-base font-semibold text-dg-black">
                  {slide.title}
                </p>
                <p className="mt-1 text-sm font-medium text-dg-gray-600">
                  {slide.subtitle}
                </p>
              </div>

              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    accessibilityLayer={false}
                    margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                  >
                    <XAxis
                      dataKey="dateLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={<ResultChartXAxisTick />}
                    />
                    <YAxis hide domain={[0, "dataMax"]} />
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

              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-dg-gray-400/55 px-3 py-3 text-sm">
                <span className="font-medium text-dg-gray-600">오늘 기록</span>
                <span className="font-semibold text-dg-black">
                  {slide.formatter(
                    data.find((item) => item.isCurrentDay)?.[slide.valueKey] ??
                      0,
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
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
            aria-label={`${slide.title} 차트 보기`}
            aria-pressed={activeIndex === index}
          />
        ))}
      </div>
    </div>
  );
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

    setIsContentEndVisible(
      target.getBoundingClientRect().bottom <= window.innerHeight,
    );

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsContentEndVisible(entry.isIntersecting);
      },
      { threshold: 1 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
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
