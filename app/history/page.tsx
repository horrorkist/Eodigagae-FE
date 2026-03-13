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
import { appIconPuppy } from "@/components/icons/definitions.generated";
import { useDogStore } from "@/stores/dogStore";

type WalkSummaryMetric = {
  label: string;
  value: string;
};

type PreviousWalk = {
  id: string;
  walkedAt: string;
  dateLabel: string;
  distanceLabel: string;
  durationLabel: string;
};

const todaySummary = {
  durationLabel: "42분",
  distanceLabel: "2.8km",
};

const totals: WalkSummaryMetric[] = [
  { label: "총 산책일", value: "128일" },
  { label: "총 시간", value: "93시간 20분" },
  { label: "총 거리", value: "214.6km" },
];

const previousWalks: PreviousWalk[] = [
  {
    id: "2026-03-12-evening",
    walkedAt: "2026-03-12T19:10:00+09:00",
    dateLabel: "03.12",
    distanceLabel: "3.1km",
    durationLabel: "48분",
  },
  {
    id: "2026-03-11-morning",
    walkedAt: "2026-03-11T08:15:00+09:00",
    dateLabel: "03.11",
    distanceLabel: "2.4km",
    durationLabel: "37분",
  },
  {
    id: "2026-03-10-evening",
    walkedAt: "2026-03-10T18:40:00+09:00",
    dateLabel: "03.10",
    distanceLabel: "3.7km",
    durationLabel: "55분",
  },
  {
    id: "2026-03-09-morning",
    walkedAt: "2026-03-09T07:50:00+09:00",
    dateLabel: "03.09",
    distanceLabel: "1.9km",
    durationLabel: "29분",
  },
  {
    id: "2026-03-08-evening",
    walkedAt: "2026-03-08T18:05:00+09:00",
    dateLabel: "03.08",
    distanceLabel: "2.6km",
    durationLabel: "41분",
  },
  {
    id: "2026-03-07-morning",
    walkedAt: "2026-03-07T08:30:00+09:00",
    dateLabel: "03.07",
    distanceLabel: "3.0km",
    durationLabel: "46분",
  },
  {
    id: "2026-03-06-evening",
    walkedAt: "2026-03-06T18:25:00+09:00",
    dateLabel: "03.06",
    distanceLabel: "2.2km",
    durationLabel: "34분",
  },
  {
    id: "2026-03-05-morning",
    walkedAt: "2026-03-05T07:40:00+09:00",
    dateLabel: "03.05",
    distanceLabel: "3.4km",
    durationLabel: "52분",
  },
  {
    id: "2026-03-04-evening",
    walkedAt: "2026-03-04T19:00:00+09:00",
    dateLabel: "03.04",
    distanceLabel: "2.8km",
    durationLabel: "43분",
  },
  {
    id: "2026-03-03-morning",
    walkedAt: "2026-03-03T08:05:00+09:00",
    dateLabel: "03.03",
    distanceLabel: "1.7km",
    durationLabel: "26분",
  },
  {
    id: "2026-03-02-evening",
    walkedAt: "2026-03-02T18:50:00+09:00",
    dateLabel: "03.02",
    distanceLabel: "3.6km",
    durationLabel: "58분",
  },
  {
    id: "2026-03-01-morning",
    walkedAt: "2026-03-01T09:10:00+09:00",
    dateLabel: "03.01",
    distanceLabel: "2.5km",
    durationLabel: "39분",
  },
  {
    id: "2026-02-28-evening",
    walkedAt: "2026-02-28T18:15:00+09:00",
    dateLabel: "02.28",
    distanceLabel: "3.3km",
    durationLabel: "50분",
  },
  {
    id: "2026-02-27-morning",
    walkedAt: "2026-02-27T07:55:00+09:00",
    dateLabel: "02.27",
    distanceLabel: "2.1km",
    durationLabel: "32분",
  },
];

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
  const dogName = dog?.name?.trim() ? dog.name.trim() : null;
  const dogPhotoUrl = dog?.photo?.variantUrl ?? null;
  const highlightedName = dogName ?? "내 반려동물";
  const [walkSortOrder, setWalkSortOrder] = useState<WalkSortOrder>("latest");
  const [isShowingAllWalks, setIsShowingAllWalks] = useState(false);
  const sortedPreviousWalks = useMemo(() => {
    return [...previousWalks].sort((a, b) => {
      const timeA = new Date(a.walkedAt).getTime();
      const timeB = new Date(b.walkedAt).getTime();
      return walkSortOrder === "latest" ? timeB - timeA : timeA - timeB;
    });
  }, [walkSortOrder]);
  const visiblePreviousWalks = useMemo(() => {
    if (isShowingAllWalks) return sortedPreviousWalks;
    return sortedPreviousWalks.slice(0, INITIAL_VISIBLE_WALKS);
  }, [isShowingAllWalks, sortedPreviousWalks]);
  const hasPreviousWalks = sortedPreviousWalks.length > 0;
  const canToggleWalkList = sortedPreviousWalks.length > INITIAL_VISIBLE_WALKS;
  const walkSortLabel = walkSortOrder === "latest" ? "최신순" : "날짜순";

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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-dg-black">
                이전 산책 기록
              </h2>
              <button
                type="button"
                onClick={() =>
                  setWalkSortOrder((prev) =>
                    prev === "latest" ? "oldest" : "latest",
                  )
                }
                className="inline-flex items-center gap-1.5 text-sm font-medium text-dg-gray-700"
                aria-label={`산책 기록 정렬 변경, 현재 ${walkSortLabel}`}
              >
                <span>{walkSortLabel}</span>
                <span className="inline-flex w-4 justify-center" aria-hidden="true">
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
                      <p className="text-sm font-semibold tabular-nums text-dg-black">
                        {walk.dateLabel}
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-dg-gray-700">거리</span>
                          <span className="font-semibold tabular-nums">
                            {walk.distanceLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-dg-gray-700">시간</span>
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
