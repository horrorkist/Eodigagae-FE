"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppIcon from "@/components/icons/AppIcon";
import { appIconAsterisk } from "@/components/icons/definitions.generated";

const SATISFACTION_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
] as const;

const ERROR_OPTIONS = [
  { value: false, label: "아니요, 없어요" },
  { value: true, label: "네, 있어요" },
] as const;

function getSatisfactionButtonClassName(isSelected: boolean) {
  return [
    "flex items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
    isSelected
      ? "border-dg-green-500 bg-dg-green-500 text-white"
      : "border-dg-gray-500 bg-white text-dg-gray-700 active:bg-dg-gray-400/50",
  ].join(" ");
}

export default function SupportFeedbackPage() {
  const router = useRouter();
  const [satisfaction, setSatisfaction] = useState<1 | 2 | 3 | 4 | 5 | null>(
    null,
  );
  const [hasExperiencedError, setHasExperiencedError] = useState<
    boolean | null
  >(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isSubmitDisabled =
    satisfaction === null || hasExperiencedError === null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-between pt-8 text-center text-dg-black">
        <div className="flex flex-1 flex-col items-center justify-center">
          <Image
            src="/images/feedback/submit.svg"
            alt="의견이 제출되었습니다"
            width={210}
            height={210}
            priority
            className="h-auto w-[210px] max-w-full"
          />
          <div className="mt-6 space-y-1">
            <p className="text-lg font-semibold">의견을 남겨주셔서 감사해요!</p>
            <p className="text-sm text-dg-gray-700">
              하나하나 꼼꼼히 읽어볼게요
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.replace("/my")}
          className="w-full rounded-2xl bg-dg-green-500 px-4 py-4 text-base font-semibold text-white active:bg-dg-green-600"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col text-dg-black">
      <form
        id="support-feedback-form"
        onSubmit={handleSubmit}
        className="flex min-h-full flex-1 flex-col"
      >
        <div className="space-y-4">
          <section className="space-y-1 py-2">
            <h2 className="leading-7">
              <span className="text-dg-green-500">어디가개</span>에 대한 의견을
              들려주세요!
            </h2>
            <p className="text-sm leading-6 text-dg-gray-700">
              보내주신 의견은 더 나은 서비스 제공에 큰 도움이 됩니다.
            </p>
          </section>

          <fieldset className="space-y-3 py-2">
            <div className="flex items-center space-x-1">
              <legend className="text-base font-medium leading-6">
                1. 어디가개에 대한 전반적인 만족도는 어떠신가요?
              </legend>
              <AppIcon
                icon={appIconAsterisk}
                className="h-2 w-2 text-dg-green-500"
              />
            </div>
            <div className="grid grid-cols-5 gap-2 pt-1">
              {SATISFACTION_OPTIONS.map((option) => {
                const isSelected = satisfaction === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSatisfaction(option.value)}
                    className={[
                      "aspect-square",
                      getSatisfactionButtonClassName(isSelected),
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-start justify-between text-sm text-dg-gray-600">
              <span>매우 아쉬움</span>
              <span>매우 만족</span>
            </div>
          </fieldset>

          <fieldset className="space-y-3 py-2">
            <legend className="text-base font-medium leading-6">
              2. 서비스 이용 중 오류를 경험한 적이 있나요?
            </legend>
            <div className="flex flex-col space-y-3">
              {ERROR_OPTIONS.map((option) => {
                const isSelected = hasExperiencedError === option.value;
                const inputId = `feedback-error-${option.value ? "yes" : "no"}`;

                return (
                  <div key={option.label} className="inline-flex items-center">
                    <label
                      className="relative flex cursor-pointer items-center"
                      htmlFor={inputId}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name="errorExperience"
                        checked={isSelected}
                        onChange={() => {
                          setHasExperiencedError(option.value);
                          if (!option.value) {
                            setErrorMessage("");
                          }
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-dg-gray-500 transition-all"
                      />
                      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dg-green-500 opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
                    </label>
                    <label
                      className="ml-2 cursor-pointer font-medium text-dg-gray-700"
                      htmlFor={inputId}
                    >
                      {option.label}
                    </label>
                  </div>
                );
              })}
            </div>

            {hasExperiencedError ? (
              <textarea
                value={errorMessage}
                onChange={(event) => setErrorMessage(event.target.value)}
                placeholder="어떤 오류가 있었나요? (선택)"
                className="min-h-28 w-full resize-none rounded-xl border border-dg-gray-500 px-4 py-3 text-sm leading-6 text-dg-black outline-none transition-colors placeholder:text-dg-gray-500 focus:border-dg-green-500"
              />
            ) : null}
          </fieldset>

          <fieldset className="space-y-3 py-2">
            <legend className="text-base font-medium leading-6">
              3. 어디가개에 대한 의견을 자유롭게 남겨주세요.
            </legend>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="불편했던 점이나 개선되면 좋을 점을 편하게 적어주세요."
              className="min-h-32 w-full resize-none rounded-xl border border-dg-gray-500 px-4 py-3 text-sm leading-6 text-dg-black outline-none transition-colors placeholder:text-dg-gray-500 focus:border-dg-green-500"
            />
          </fieldset>
        </div>

        <div className="mt-auto pt-8">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={[
              "w-full rounded-2xl px-4 py-4 text-base font-semibold text-white transition-colors",
              isSubmitDisabled
                ? "cursor-not-allowed bg-dg-gray-500"
                : "bg-dg-green-500 active:bg-dg-green-600",
            ].join(" ")}
          >
            제출하기
          </button>
        </div>
      </form>
    </div>
  );
}
