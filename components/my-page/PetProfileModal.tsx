"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppIcon from "@/components/icons/AppIcon";
import {
  appIconAsterisk,
  appIconXMark,
} from "@/components/icons/definitions.generated";
import type { DogBreed, DogInfo } from "@/types/dog";
import { BREED_OPTIONS } from "@/components/dog-form/constants";
import { toAgeInMonths } from "@/components/dog-form/helpers";

type AgeUnit = "years" | "months";

type PetProfileModalProps = {
  dog: DogInfo | null;
  onClose: () => void;
  onSave: (dog: DogInfo) => void;
};

type FormState = {
  name: string;
  age: string;
  ageUnit: AgeUnit;
  breed: DogBreed | "";
};

function toInitialFormState(dog: DogInfo | null): FormState {
  if (!dog) {
    return {
      name: "",
      age: "",
      ageUnit: "years",
      breed: "",
    };
  }

  const ageUnit: AgeUnit = dog.ageInMonths < 12 ? "months" : "years";
  const ageValue =
    ageUnit === "months"
      ? String(dog.ageInMonths)
      : String(dog.ageInMonths / 12);

  return {
    name: dog.name ?? "",
    age: ageValue,
    ageUnit,
    breed: dog.breed,
  };
}

function getAgeLimit(ageUnit: AgeUnit): number {
  return ageUnit === "months" ? 11 : 30;
}

export default function PetProfileModal({
  dog,
  onClose,
  onSave,
}: PetProfileModalProps) {
  const [form, setForm] = useState<FormState>(() => toInitialFormState(dog));
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const ageLimit = useMemo(() => getAgeLimit(form.ageUnit), [form.ageUnit]);
  const modalTitle = dog ? "정보 수정" : "정보 등록";
  const modalAriaLabel = dog ? "반려동물 정보 수정" : "반려동물 정보 등록";

  useEffect(() => {
    lastActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const rafId = window.requestAnimationFrame(() => {
      firstInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      lastActiveElementRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = form.name.trim();
    if (!normalizedName) {
      setError("이름을 입력해 주세요.");
      return;
    }

    if (!form.age.trim()) {
      setError("나이를 입력해 주세요.");
      return;
    }

    const parsedAge = Number(form.age);

    if (Number.isNaN(parsedAge)) {
      setError("나이를 입력해 주세요.");
      return;
    }

    if (parsedAge < 0 || parsedAge > ageLimit) {
      setError(`${ageLimit} 이하의 나이를 입력해 주세요.`);
      return;
    }

    if (!form.breed) {
      setError("반려견 크기를 선택해 주세요.");
      return;
    }

    setError(null);
    onSave({
      name: normalizedName,
      ageInMonths: toAgeInMonths(parsedAge, form.ageUnit),
      breed: form.breed,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[210] bg-black/45 p-4"
      onClick={onClose}
      aria-hidden="true"
    >
      <div className="flex h-full items-center justify-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={modalAriaLabel}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-[480px] rounded-[28px] bg-white px-7 pb-7 pt-6 shadow-xl"
        >
          <div className="mb-7 flex items-start justify-between">
            <h2 className="text-2xl font-semibold leading-none text-dg-black">
              {modalTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-full p-1 text-gray-400 active:bg-gray-100"
            >
              <AppIcon icon={appIconXMark} className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="flex flex-col space-y-4">
              <label
                htmlFor="pet-name"
                className="inline-flex items-center gap-1 font-semibold leading-none text-dg-black"
              >
                <span>반려견 이름</span>
                <AppIcon
                  icon={appIconAsterisk}
                  className="h-2 w-2 text-dg-green-500"
                />
              </label>
              <input
                id="pet-name"
                ref={firstInputRef}
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="이름을 입력해 주세요"
                className="h-16 w-full rounded-2xl border border-gray-300 px-5  text-dg-black outline-none placeholder:text-gray-300 focus:border-dg-green-500"
              />
            </div>

            <div className="flex flex-col space-y-4">
              <label
                htmlFor="pet-age"
                className="inline-flex items-center gap-1 font-semibold leading-none text-dg-black"
              >
                <span>반려견 나이</span>
                <AppIcon
                  icon={appIconAsterisk}
                  className="h-2 w-2 text-dg-green-500"
                />
              </label>
              <div className="flex gap-3">
                <input
                  id="pet-age"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={ageLimit}
                  value={form.age}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, age: event.target.value }))
                  }
                  placeholder="나이를 입력해 주세요"
                  className="h-16 min-w-0 flex-1 rounded-2xl border border-gray-300 px-5  text-dg-black outline-none placeholder:text-gray-300 focus:border-dg-green-500"
                />
                <div className="grid h-16 w-[136px] grid-cols-2 overflow-hidden rounded-2xl border border-gray-300  font-semibold leading-none">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, ageUnit: "years" }))
                    }
                    className={[
                      "px-3",
                      form.ageUnit === "years"
                        ? "bg-dg-green-500 text-white"
                        : "bg-white text-dg-black",
                    ].join(" ")}
                  >
                    년
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, ageUnit: "months" }))
                    }
                    className={[
                      "border-l border-gray-300 px-3",
                      form.ageUnit === "months"
                        ? "bg-dg-green-500 text-white"
                        : "bg-white text-dg-black",
                    ].join(" ")}
                  >
                    개월
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="inline-flex items-center gap-1">
                <span className="font-semibold leading-none text-dg-black">
                  반려견 크기
                </span>
                <AppIcon
                  icon={appIconAsterisk}
                  className="h-2 w-2 text-dg-green-500"
                />
              </div>
              <div className="flex gap-3">
                {BREED_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        breed: option.value,
                      }))
                    }
                    className={[
                      "h-14 rounded-full border px-7  font-semibold leading-none",
                      form.breed === option.value
                        ? "border-dg-green-500 bg-dg-green-50 text-dg-green-700"
                        : "border-gray-300 text-dg-black",
                    ].join(" ")}
                  >
                    {option.value}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <p className="text-base font-medium text-red-600">{error}</p>
            ) : null}

            <div className="pt-1">
              <button
                type="submit"
                className="h-16 w-full rounded-2xl bg-dg-green-500 text-xl font-semibold leading-none text-white active:bg-dg-green-600"
              >
                입력완료
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
