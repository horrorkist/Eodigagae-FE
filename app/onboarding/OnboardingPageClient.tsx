"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppIcon from "@/components/icons/AppIcon";
import { appIconPaw } from "@/components/icons/definitions.generated";
import {
  ONBOARDING_COOKIE_MAX_AGE_SECONDS,
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_VALUE,
} from "@/lib/onboarding";

type TitleSegment = {
  text: string;
  highlight?: boolean;
};

type OnboardingStep = {
  titleSegments: TitleSegment[];
  description: string;
  illustrationSrc?: string;
  illustrationAlt?: string;
};

const ONBOARDING_ILLUSTRATION_SRCS = [
  "/images/onboarding/step-1.svg",
  "/images/onboarding/step-2.svg",
  "/images/onboarding/step-3.svg",
] as const;

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    titleSegments: [
      { text: "반려동물에게는 " },
      { text: "맞춤형 산책", highlight: true },
      { text: "이 필요하니까" },
    ],
    description:
      "나이와 체형을 고려해 반려동물이 부담없이\n즐길 수 있는 맞춤형 산책 경로를 제안해요.",
    illustrationSrc: ONBOARDING_ILLUSTRATION_SRCS[0],
    illustrationAlt: "맞춤형 산책 온보딩 일러스트",
  },
  {
    titleSegments: [{ text: "산책 중 필요한 정보를 한 눈에!" }],
    description:
      "반려동물 동반 가능 공간부터 쓰레기통, 음수대\n위치까지 지도 위에서 쉽게 확인하세요.",
    illustrationSrc: ONBOARDING_ILLUSTRATION_SRCS[1],
    illustrationAlt: "산책 정보 온보딩 일러스트",
  },
  {
    titleSegments: [
      { text: "오늘은 " },
      { text: "새로운 길", highlight: true },
      { text: "로 걸어볼까요?" },
    ],
    description:
      "매번 같은 길이 아닌, 세 가지 경로를 새롭게\n추천해 더욱 즐거운 산책 경험을 만들어드려요.",
    illustrationSrc: ONBOARDING_ILLUSTRATION_SRCS[2],
    illustrationAlt: "경로 추천 온보딩 일러스트",
  },
];

type OnboardingPageClientProps = {
  destination: string;
};

export default function OnboardingPageClient({
  destination,
}: OnboardingPageClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loadedIllustrations, setLoadedIllustrations] = useState<
    Partial<Record<(typeof ONBOARDING_ILLUSTRATION_SRCS)[number], boolean>>
  >(() =>
    ONBOARDING_ILLUSTRATION_SRCS.reduce<
      Partial<Record<(typeof ONBOARDING_ILLUSTRATION_SRCS)[number], boolean>>
    >((acc, src, index) => {
      acc[src] = index === 0;
      return acc;
    }, {}),
  );
  const totalSteps = ONBOARDING_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const step = ONBOARDING_STEPS[currentStep];
  const shouldShowIllustration = step.illustrationSrc
    ? loadedIllustrations[step.illustrationSrc]
    : false;

  useEffect(() => {
    const preloadedImages = ONBOARDING_ILLUSTRATION_SRCS.map((src) => {
      const image = new window.Image();

      image.decoding = "async";
      image.onload = () => {
        setLoadedIllustrations((prev) =>
          prev[src] ? prev : { ...prev, [src]: true },
        );
      };
      image.onerror = () => {
        setLoadedIllustrations((prev) =>
          prev[src] ? prev : { ...prev, [src]: true },
        );
      };
      image.src = src;

      return image;
    });

    return () => {
      preloadedImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  const completeOnboarding = () => {
    document.cookie = [
      `${ONBOARDING_COOKIE_NAME}=${ONBOARDING_COOKIE_VALUE}`,
      "Path=/",
      `Max-Age=${ONBOARDING_COOKIE_MAX_AGE_SECONDS}`,
      "SameSite=Lax",
    ].join("; ");

    router.replace(destination);
  };

  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <section className="flex h-full flex-col px-5 py-6 text-dg-black pointer-events-auto">
      <div className="flex flex-col flex-1 justify-center">
        <article className="w-full text-center">
          <div className="relative mx-auto mb-6 h-[220px] w-full max-w-[350px] overflow-hidden rounded-3xl bg-dg-gray-400/40">
            {shouldShowIllustration && step.illustrationSrc ? (
              <Image
                key={step.illustrationSrc}
                src={step.illustrationSrc}
                alt={step.illustrationAlt ?? ""}
                width={350}
                height={220}
                unoptimized
                priority
                loading="eager"
                className="h-full w-full object-contain"
              />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-dg-gray-400/60 via-white/70 to-dg-gray-400/30"
              />
            )}
          </div>
          <h2 className="text-xl font-semibold text-nowrap">
            {step.titleSegments.map((segment, index) => (
              <span
                key={`${segment.text}-${index}`}
                className={segment.highlight ? "text-dg-green-500" : undefined}
              >
                {segment.text}
              </span>
            ))}
          </h2>
          <p className="mt-2 text-base font-medium leading-relaxed text-dg-black whitespace-pre-line">
            {step.description}
          </p>
        </article>
      </div>
      <div className="flex justify-center pb-12 items-center gap-8">
        {ONBOARDING_STEPS.map((_, index) => (
          <div
            key={`step-indicator-${index}`}
            className={[
              "rounded-full w-8 h-8 flex justify-center items-center",
              currentStep === index ? "bg-dg-green-500" : "bg-dg-gray-400",
            ].join(" ")}
          >
            <AppIcon
              icon={appIconPaw}
              className={["h-4 w-4 text-white"].join(" ")}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {!isFirstStep ? (
          <button
            type="button"
            onClick={goToPreviousStep}
            className="h-12 flex-1 rounded-xl bg-dg-gray-400 text-base font-semibold text-dg-black"
          >
            이전
          </button>
        ) : null}
        <button
          type="button"
          onClick={isLastStep ? completeOnboarding : goToNextStep}
          className="h-12 flex-[1.5] rounded-xl bg-dg-green-500 text-base font-semibold text-white"
        >
          {isLastStep ? "시작하기" : "다음"}
        </button>
      </div>
    </section>
  );
}
