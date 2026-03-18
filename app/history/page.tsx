"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  faArrowDownWideShort,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AppIcon from "@/components/icons/AppIcon";
import {
  buildActualHistoryView,
  type HistoryViewRecord,
} from "@/lib/walkHistory";
import {
  appIconPaw,
  appIconPuppy,
} from "@/components/icons/definitions.generated";
import { useDogStore } from "@/stores/dogStore";
import { useMySettingsStore } from "@/stores/mySettingsStore";
import { useWalkHistoryStore } from "@/stores/walkHistoryStore";

type WalkSummaryMetric = {
  label: string;
  value: string;
};

type TodayWalkSummary = {
  walkedAt: string | null;
  durationLabel: string;
  distanceLabel: string;
};

type WalkSortOrder = "latest" | "oldest";
const INITIAL_VISIBLE_WALKS = 4;

function PetAvatar({
  photoUrl,
  name,
  size = 64,
}: {
  photoUrl: string | null;
  name: string;
  size?: number;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-dg-gray-400"
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`${name} 프로필 사진`}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-dg-gray-500">
          <AppIcon icon={appIconPuppy} className="h-7 w-7" />
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const dog = useDogStore((s) => s.dog);
  const historyDataSource = useMySettingsStore((s) => s.historyDataSource);
  const mockHistoryEntries = useMySettingsStore((s) => s.mockHistoryEntries);
  const historyEntries = useWalkHistoryStore((s) => s.entries);
  const dogName = dog?.name?.trim() ? dog.name.trim() : null;
  const dogPhotoUrl = dog?.photo?.variantUrl ?? null;
  const highlightedName = dogName ?? "내 반려동물";
  const [walkSortOrder, setWalkSortOrder] = useState<WalkSortOrder>("latest");
  const [isShowingAllWalks, setIsShowingAllWalks] = useState(false);
  const selectedEntries =
    historyDataSource === "mock" ? mockHistoryEntries : historyEntries;
  const actualHistoryView = useMemo(
    () => buildActualHistoryView(selectedEntries),
    [selectedEntries],
  );
  const todaySummary: TodayWalkSummary = actualHistoryView.todaySummary;
  const totals: WalkSummaryMetric[] = [
    { label: "총 산책일", value: actualHistoryView.totalDays },
    { label: "총 시간", value: actualHistoryView.totalDuration },
    { label: "총 거리", value: actualHistoryView.totalDistance },
  ];
  const previousWalks: HistoryViewRecord[] = actualHistoryView.previousWalks;
  const streakDays = actualHistoryView.streakDays;
  const sortedPreviousWalks = useMemo(() => {
    return [...previousWalks].sort((a, b) => {
      const timeA = new Date(a.walkedAt).getTime();
      const timeB = new Date(b.walkedAt).getTime();
      return walkSortOrder === "latest" ? timeB - timeA : timeA - timeB;
    });
  }, [previousWalks, walkSortOrder]);
  const visiblePreviousWalks = useMemo(() => {
    if (isShowingAllWalks) return sortedPreviousWalks;
    return sortedPreviousWalks.slice(0, INITIAL_VISIBLE_WALKS);
  }, [isShowingAllWalks, sortedPreviousWalks]);
  const hasPreviousWalks = sortedPreviousWalks.length > 0;
  const canToggleWalkList = sortedPreviousWalks.length > INITIAL_VISIBLE_WALKS;
  const walkSortLabel = walkSortOrder === "latest" ? "최신순" : "날짜순";
  const streakLabel = streakDays > 0 ? `${streakDays}일 연속` : null;

  return (
    <div className="min-h-full bg-dg-gray-400 pointer-events-auto">
      <section className="mx-auto w-full max-w-[430px] px-4 pb-24 pt-5">
        <div className="space-y-7">
          <section className="space-y-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-dg-black">산책 기록</h1>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white">
              <div className="space-y-5 px-5 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xl font-semibold text-dg-black">
                      <span className="text-dg-green-500">
                        {highlightedName}
                      </span>
                      의
                      <br />
                      오늘 산책 기록이에요
                    </p>
                    <p className="mt-4 text-sm font-medium tabular-nums text-dg-gray-600">
                      {todaySummary.durationLabel} &middot;{" "}
                      {todaySummary.distanceLabel}
                    </p>
                  </div>
                  <PetAvatar
                    photoUrl={dogPhotoUrl}
                    name={highlightedName}
                    size={92}
                  />
                </div>

                <div>
                  <Link
                    href="/?openRouteRecommend=1"
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-dg-green-500 px-4 text-xl font-semibold text-white active:bg-dg-green-600"
                  >
                    산책 시작
                  </Link>
                </div>
              </div>

              <div className="mx-5 border-t border-dg-gray-400" />

              <div className="grid grid-cols-3 px-2 py-8">
                {totals.map((item) => (
                  <div
                    key={item.label}
                    className="px-2 text-center text-dg-black"
                  >
                    <p className="text-base font-medium text-dg-gray-600">
                      {item.label}
                    </p>
                    <p className="mt-1 text-base text-dg-black font-semibold tabular-nums">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-lg font-semibold text-dg-black">
                  산책 기록
                </h2>
                {streakLabel ? (
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-dg-green-500">
                    <AppIcon
                      icon={appIconPaw}
                      className="h-3.5 w-3.5 text-dg-green-500"
                    />
                    <p>{streakLabel}</p>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  setWalkSortOrder((prev) =>
                    prev === "latest" ? "oldest" : "latest",
                  )
                }
                className="inline-flex shrink-0 items-center gap-1.5 text-base font-medium text-dg-gray-600"
                aria-label={`산책 기록 정렬 변경, 현재 ${walkSortLabel}`}
              >
                <span>{walkSortLabel}</span>
                <span
                  className="inline-flex w-4 justify-center"
                  aria-hidden="true"
                >
                  <FontAwesomeIcon
                    icon={faArrowDownWideShort}
                    className={[
                      "h-3.5 w-3.5",
                      walkSortOrder === "oldest" ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </span>
              </button>
            </div>

            {hasPreviousWalks ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {visiblePreviousWalks.map((walk) => (
                    <article
                      key={walk.id}
                      className="rounded-2xl bg-white px-4 py-4 text-dg-black"
                    >
                      <p className="text-base font-medium tabular-nums text-dg-gray-600">
                        {walk.dateLabel}
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between gap-3 text-base">
                          <span className="text-dg-gray-600 font-medium">
                            거리
                          </span>
                          <span className="font-semibold tabular-nums">
                            {walk.distanceLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-base">
                          <span className="text-dg-gray-600 font-medium">
                            시간
                          </span>
                          <span className="font-semibold tabular-nums">
                            {walk.durationLabel}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {canToggleWalkList ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setIsShowingAllWalks((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-dg-gray-500 px-4 py-2 text-sm font-semibold text-dg-gray-700 active:bg-dg-gray-400/50"
                    >
                      <span>{isShowingAllWalks ? "접기" : "더보기"}</span>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={[
                          "h-3 w-3",
                          isShowingAllWalks ? "rotate-180" : "",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="py-8 text-center text-sm font-medium text-dg-gray-600">
                아직 산책 기록이 없어요
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
