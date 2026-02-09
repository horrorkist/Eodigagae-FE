"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { DogInfo } from "@/types/dog";
import { useDogStore } from "@/stores/dogStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTag,
  faCakeCandles,
  faDog,
  faCheck,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";

const BREED_OPTIONS = [
  { value: "소형견", examples: "치와와, 포메라니안, 말티즈" },
  { value: "중형견", examples: "비글, 코카스파니엘, 웰시코기" },
  { value: "대형견", examples: "골든리트리버, 래브라도, 사모예드" },
] as const;

type AgeUnit = "months" | "years";

type FormValues = {
  name: string;
  age: number;
  breed: string;
};

type Props = {
  onSubmitSuccess?: (data: DogInfo) => void;
};

export default function DogInfoForm({ onSubmitSuccess }: Props) {
  const setDog = useDogStore((s) => s.setDog);
  const currentDog = useDogStore((s) => s.dog);

  const defaultUnit: AgeUnit =
    currentDog && currentDog.ageInMonths < 12 ? "months" : "years";
  const defaultAge = currentDog
    ? defaultUnit === "months"
      ? currentDog.ageInMonths
      : Math.floor(currentDog.ageInMonths / 12)
    : 0;

  const [ageUnit, setAgeUnit] = useState<AgeUnit>(defaultUnit);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: currentDog?.name ?? "",
      age: defaultAge,
      breed: currentDog?.breed ?? "",
    },
  });

  const onSubmit = (data: FormValues) => {
    const ageInMonths =
      ageUnit === "months" ? data.age : data.age * 12;
    const dogInfo: DogInfo = {
      name: data.name,
      ageInMonths,
      breed: data.breed as DogInfo["breed"],
    };
    setDog(dogInfo);
    onSubmitSuccess?.(dogInfo);
  };

  const ageMax = ageUnit === "months" ? 11 : 30;
  const agePlaceholder = ageUnit === "months" ? "개월 수 (0~11)" : "나이 (년)";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <FontAwesomeIcon icon={faTag} className="w-3 h-3 text-gray-500" />
          이름
        </label>
        <input
          {...register("name", { required: "이름을 입력해주세요" })}
          placeholder="강아지 이름"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-2.5 h-2.5" />
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <FontAwesomeIcon icon={faCakeCandles} className="w-3 h-3 text-gray-500" />
          나이
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            {...register("age", {
              required: "나이를 입력해주세요",
              valueAsNumber: true,
              min: { value: 0, message: "0 이상 입력해주세요" },
              max: { value: ageMax, message: `${ageMax} 이하로 입력해주세요` },
            })}
            placeholder={agePlaceholder}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setAgeUnit("months")}
              className={`px-3 py-2 transition-colors ${
                ageUnit === "months"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              개월
            </button>
            <button
              type="button"
              onClick={() => setAgeUnit("years")}
              className={`px-3 py-2 transition-colors ${
                ageUnit === "years"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              살
            </button>
          </div>
        </div>
        {errors.age && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-2.5 h-2.5" />
            {errors.age.message}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1.5 text-sm font-semibold">
          <FontAwesomeIcon icon={faDog} className="w-3.5 h-3.5 text-gray-500" />
          견종
        </legend>
        {BREED_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex items-start gap-2 border border-gray-300 rounded-md px-3 py-2
                       has-checked:border-blue-500 has-checked:bg-blue-50 cursor-pointer"
          >
            <input
              type="radio"
              value={opt.value}
              {...register("breed", { required: "견종을 선택해주세요" })}
              className="mt-0.5 accent-blue-500"
            />
            <div>
              <div className="text-sm font-medium">{opt.value}</div>
              <div className="text-xs text-gray-500">{opt.examples}</div>
            </div>
          </label>
        ))}
        {errors.breed && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <FontAwesomeIcon icon={faCircleExclamation} className="w-2.5 h-2.5" />
            {errors.breed.message}
          </p>
        )}
      </fieldset>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white rounded-md py-2.5 text-sm font-semibold
                   active:bg-blue-600 transition-colors"
      >
        <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
        저장
      </button>
    </form>
  );
}
