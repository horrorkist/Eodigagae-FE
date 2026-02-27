"use client";

import { useRouter } from "next/navigation";
import {
  ONBOARDING_COOKIE_MAX_AGE_SECONDS,
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_VALUE,
} from "@/lib/onboarding";

type OnboardingStep = {
  title: string;
  description: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "반려동물에게는 맞춤형 산책이 필요하니까",
    description:
      "나이와 체형을 고려해 반려동물에게 부담없는 맞춤형 산책 경로를 제안해요.",
  },
  {
    title: "산책 중 필요한 정보를 한눈에!",
    description:
      "반려동물 동반 가능 공간부터 쓰레기통, 음수대 위치까지 지도 위에서 쉽게 확인하세요.",
  },
  {
    title: "오늘은 새로운 길로 걸어볼까요?",
    description: "매번 다른 경로를 추천해 새로운 산책 경험을 만들어드려요.",
  },
];

type OnboardingPageClientProps = {
  destination: string;
};

export default function OnboardingPageClient({
  destination,
}: OnboardingPageClientProps) {
  const router = useRouter();

  const completeOnboarding = () => {
    document.cookie = [
      `${ONBOARDING_COOKIE_NAME}=${ONBOARDING_COOKIE_VALUE}`,
      "Path=/",
      `Max-Age=${ONBOARDING_COOKIE_MAX_AGE_SECONDS}`,
      "SameSite=Lax",
    ].join("; ");

    router.replace(destination);
  };

  return (
    <section className="flex h-full flex-col bg-gradient-to-b from-dg-green-50 to-white px-5 pb-6 pt-8 text-dg-black pointer-events-auto">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-dg-green-700">
          어디가개 시작하기
        </p>
        <h1 className="text-2xl font-bold leading-tight">
          산책 준비를
          <br />
          1분 안에 끝내볼까요?
        </h1>
      </header>

      <ol className="mt-8 flex flex-1 flex-col gap-3">
        {ONBOARDING_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-dg-green-100 bg-white/90 p-4 shadow-[0_6px_20px_rgba(11,220,0,0.08)]"
          >
            <p className="text-xs font-semibold text-dg-green-700">
              STEP {index + 1}
            </p>
            <h2 className="mt-1 text-base font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-dg-gray-600">
              {step.description}
            </p>
          </li>
        ))}
      </ol>

      <div className="space-y-2">
        <button
          type="button"
          onClick={completeOnboarding}
          className="h-12 w-full rounded-xl bg-dg-green-600 text-base font-semibold text-white active:bg-dg-green-700"
        >
          시작하기
        </button>
      </div>
    </section>
  );
}
