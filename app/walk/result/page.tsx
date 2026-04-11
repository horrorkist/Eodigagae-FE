"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEmit } from "@/hooks/useEventBus";
import {
  buildRecentWalkComparisonView,
  formatHistoryDistanceLabel,
  formatHistoryDurationLabel,
  generateMockWalkHistoryEntries,
} from "@/lib/walkHistory";
import { useMySettingsStore } from "@/stores/mySettingsStore";
import { useWalkHistoryStore } from "@/stores/walkHistoryStore";
import { useWalkCompletionStore } from "@/stores/walkCompletionStore";

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white px-4 py-5 text-dg-black shadow-sm">
      <p className="text-sm font-medium text-dg-gray-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-dg-black">{value}</p>
    </div>
  );
}

function ComparisonMetric({
  label,
  currentLabel,
  averageLabel,
  message,
  direction,
  deltaPercentLabel,
}: {
  label: string;
  currentLabel: string;
  averageLabel: string;
  message: string;
  direction: "up" | "down" | "flat";
  deltaPercentLabel: string | null;
}) {
  const messageClassName =
    direction === "up"
      ? "text-dg-green-500"
      : direction === "down"
        ? "text-[#E46F4A]"
        : "text-dg-gray-700";
  const badgeClassName =
    direction === "up"
      ? "bg-dg-green-500/12 text-dg-green-500"
      : direction === "down"
        ? "bg-[#E46F4A]/12 text-[#E46F4A]"
        : "bg-dg-gray-500/12 text-dg-gray-700";

  return (
    <div className="space-y-3 rounded-lg bg-dg-gray-400/55 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-dg-black">{label}</p>
        {deltaPercentLabel ? (
          <span
            className={[
              "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-semibold",
              badgeClassName,
            ].join(" ")}
          >
            {deltaPercentLabel}
          </span>
        ) : null}
      </div>
      <p className={["text-sm font-semibold", messageClassName].join(" ")}>
        {message}
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-dg-gray-600">이번 기록</span>
          <span className="font-semibold text-dg-black">{currentLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-dg-gray-600">7일 평균</span>
          <span className="font-semibold text-dg-black">{averageLabel}</span>
        </div>
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
  const summary = useWalkCompletionStore((s) => s.summary);
  const clearSummary = useWalkCompletionStore((s) => s.clearSummary);
  const historyEntries = useWalkHistoryStore((s) => s.entries);
  const mockHistoryEntries = useMySettingsStore((s) => s.mockHistoryEntries);
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
  const effectiveHistoryEntries = isDebugPreview ? mockHistoryEntries : historyEntries;

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

  const comparisonView = buildRecentWalkComparisonView({
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
      durationLabel={formatHistoryDurationLabel(effectiveSummary.durationSec)}
      distanceLabel={formatHistoryDistanceLabel(effectiveSummary.distanceM)}
      comparisonView={comparisonView}
      onReturnHome={handleReturnHome}
    />
  );
}

function WalkResultContent({
  durationLabel,
  distanceLabel,
  comparisonView,
  onReturnHome,
}: {
  durationLabel: string;
  distanceLabel: string;
  comparisonView: ReturnType<typeof buildRecentWalkComparisonView>;
  onReturnHome: () => void;
}) {
  const [isSummaryRevealed, setIsSummaryRevealed] = useState(false);

  const handlePrimaryAction = useCallback(() => {
    if (!isSummaryRevealed) {
      setIsSummaryRevealed(true);
      return;
    }

    onReturnHome();
  }, [isSummaryRevealed, onReturnHome]);

  return (
    <div className="pointer-events-auto flex min-h-full flex-col bg-dg-gray-400">
      <div className="flex-1 px-5 pb-8 pt-8">
        <div className="mx-auto flex w-full max-w-[430px] flex-col">
            <div className="pt-6">
              <p className="text-sm font-semibold text-dg-green-500">산책 완료</p>
              <h1 className="mt-3 text-[30px] font-semibold leading-tight text-dg-black">
                오늘 산책도
                <br />
                기분 좋게 마쳤어요
              </h1>
              <p className="mt-4 text-base font-medium leading-6 text-dg-gray-700">
                오늘 기록을 한눈에 확인해보세요.
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
                        staggerChildren: 0.26,
                      },
                    },
                  }}
                  className="mt-10 space-y-4"
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.24, ease: "easeOut" },
                      },
                    }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <SummaryMetric label="산책 시간" value={durationLabel} />
                    <SummaryMetric label="이동 거리" value={distanceLabel} />
                  </motion.div>
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.24, ease: "easeOut" },
                      },
                    }}
                    className="rounded-lg bg-white px-4 py-5 text-dg-black shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-dg-black">
                          {comparisonView.title}
                        </p>
                        <p className="mt-1 text-sm font-medium text-dg-gray-600">
                          {comparisonView.hasComparison
                            ? comparisonView.description
                            : "비교할 수 있는 최근 기록을 기다리고 있어요."}
                        </p>
                      </div>
                    </div>

                    {comparisonView.hasComparison &&
                    comparisonView.duration &&
                    comparisonView.distance ? (
                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <ComparisonMetric
                          label="산책 시간"
                          currentLabel={comparisonView.duration.currentLabel}
                          averageLabel={comparisonView.duration.averageLabel}
                          message={comparisonView.duration.message}
                          direction={comparisonView.duration.direction}
                          deltaPercentLabel={
                            comparisonView.duration.deltaPercentLabel
                          }
                        />
                        <ComparisonMetric
                          label="이동 거리"
                          currentLabel={comparisonView.distance.currentLabel}
                          averageLabel={comparisonView.distance.averageLabel}
                          message={comparisonView.distance.message}
                          direction={comparisonView.distance.direction}
                          deltaPercentLabel={
                            comparisonView.distance.deltaPercentLabel
                          }
                        />
                      </div>
                    ) : (
                      <p className="mt-5 text-sm font-medium leading-6 text-dg-gray-700">
                        {comparisonView.emptyMessage}
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
        </div>
      </div>

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
            {isSummaryRevealed ? "돌아가기" : "확인하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
