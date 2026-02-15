"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { DogBreed, DogInfo } from "@/types/dog";
import { useDogStore } from "@/stores/dogStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import { getWalkRecommendation } from "@/lib/walkRecommendation";
import { getJosa } from "@/lib/utils";

const BREED_OPTIONS = [
  { value: "소형견", examples: "치와와, 포메라니안, 말티즈", size: ["_"] },
  {
    value: "중형견",
    examples: "비글, 코카스파니엘, 웰시코기",
    size: ["_", "_"],
  },
  {
    value: "대형견",
    examples: "골든리트리버, 래브라도, 사모예드",
    size: ["_", "_", "_"],
  },
] as const;

type AgeUnit = "months" | "years";

const AGE_UNIT_LABEL = {
  months: "개월",
  years: "살",
} as const;

const WALK_DISTANCE_MIN_KM = 0.5;
const WALK_DISTANCE_MAX_KM = 10;
const WALK_DISTANCE_STEP_KM = 0.5;
const WALK_DURATION_MIN_HOURS = 0;
const WALK_DURATION_MAX_HOURS = 5;
const WALK_DURATION_STEP_HOURS = 0.5;
const WALK_STEP_BUTTON_CLASS =
  "h-9 w-9 rounded-md border border-gray-300 bg-white text-lg font-semibold text-gray-700 disabled:opacity-40";
const ERROR_TEXT_CLASS = "flex items-center gap-1 text-xs text-red-600";

function getDefaultAgeUnit(dog: DogInfo | null): AgeUnit {
  return dog && dog.ageInMonths < 12 ? "months" : "years";
}

function getDefaultAgeValue(
  dog: DogInfo | null,
  ageUnit: AgeUnit,
): number | "" {
  if (!dog) return "";
  if (ageUnit === "months") return dog.ageInMonths;
  return Math.floor(dog.ageInMonths / 12);
}

function toAgeInMonths(age: number, ageUnit: AgeUnit): number {
  return ageUnit === "months" ? age : age * 12;
}

function clampWalkDistanceKm(distanceKm: number) {
  const rounded = Math.round(distanceKm * 10) / 10;
  return Math.min(
    WALK_DISTANCE_MAX_KM,
    Math.max(WALK_DISTANCE_MIN_KM, rounded),
  );
}

function formatWalkDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
  if (Number.isInteger(distanceKm)) return `${distanceKm}km`;
  return `${distanceKm.toFixed(1)}km`;
}

function clampWalkDurationHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Math.min(
    WALK_DURATION_MAX_HOURS,
    Math.max(WALK_DURATION_MIN_HOURS, rounded),
  );
}

function formatWalkDuration(hours: number) {
  if (hours === 0) return "정하지 않음";
  if (Number.isInteger(hours)) return `${hours}시간`;
  if (hours < 1) return "30분";
  return `${Math.floor(hours)}시간 30분`;
}

function getRecommendTargetLabel(
  name: string | undefined,
  ageLabel: string,
  breed: DogBreed | undefined,
) {
  if (name) return name;
  if (breed) return `${ageLabel} ${breed}`;
  return "";
}

type FieldErrorProps = {
  message?: string;
  className?: string;
};

function FieldError({ message, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p className={[ERROR_TEXT_CLASS, className].filter(Boolean).join(" ")}>
      <FontAwesomeIcon icon={faCircleExclamation} className="w-2.5 h-2.5" />
      {message}
    </p>
  );
}

type WalkDistanceSelectorProps = {
  value: number;
  onChange: (nextDistanceKm: number) => void;
  minKm: number;
  maxKm: number;
};

function WalkDistanceSelector({
  value,
  onChange,
  minKm,
  maxKm,
}: WalkDistanceSelectorProps) {
  const walkDistanceKm = clampWalkDistanceKm(value);
  const isSelectedInRecommendedRange =
    walkDistanceKm >= minKm && walkDistanceKm <= maxKm;

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold">산책 거리</div>
      <div className="relative">
        <AnimatePresence initial={false}>
          {isSelectedInRecommendedRange && (
            <div className="pointer-events-none absolute left-1/2 -top-8 z-10 -translate-x-1/2">
              <motion.div
                key="walk-distance-tooltip"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                className="relative will-change-transform rounded-md bg-dg-green-600 px-2 py-1 text-[11px] font-medium text-white shadow"
              >
                추천 거리예요
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-dg-green-600" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onChange(
                clampWalkDistanceKm(walkDistanceKm - WALK_DISTANCE_STEP_KM),
              )
            }
            disabled={walkDistanceKm <= WALK_DISTANCE_MIN_KM}
            aria-label="산책 거리 줄이기"
            className={WALK_STEP_BUTTON_CLASS}
          >
            -
          </button>
          <div className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800">
            {formatWalkDistance(walkDistanceKm)}
          </div>
          <button
            type="button"
            onClick={() =>
              onChange(
                clampWalkDistanceKm(walkDistanceKm + WALK_DISTANCE_STEP_KM),
              )
            }
            disabled={walkDistanceKm >= WALK_DISTANCE_MAX_KM}
            aria-label="산책 거리 늘리기"
            className={WALK_STEP_BUTTON_CLASS}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>최소 500m</span>
        <span>최대 10km</span>
      </div>
    </div>
  );
}

type WalkDurationSelectorProps = {
  value: number;
  onChange: (nextHours: number) => void;
};

function WalkDurationSelector({ value, onChange }: WalkDurationSelectorProps) {
  const walkDurationHours = clampWalkDurationHours(value);

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold">산책 시간</div>
      <div className="text-xs text-gray-500">
        산책 시간을 정하면, 거리보다 시간에 맞춰 추천해드릴게요.
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            onChange(
              clampWalkDurationHours(
                walkDurationHours - WALK_DURATION_STEP_HOURS,
              ),
            )
          }
          disabled={walkDurationHours <= WALK_DURATION_MIN_HOURS}
          aria-label="산책 시간 줄이기"
          className={WALK_STEP_BUTTON_CLASS}
        >
          -
        </button>
        <div className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800">
          {formatWalkDuration(walkDurationHours)}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange(
              clampWalkDurationHours(
                walkDurationHours + WALK_DURATION_STEP_HOURS,
              ),
            )
          }
          disabled={walkDurationHours >= WALK_DURATION_MAX_HOURS}
          aria-label="산책 시간 늘리기"
          className={WALK_STEP_BUTTON_CLASS}
        >
          +
        </button>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>최소 30분</span>
        <span>최대 5시간</span>
      </div>
    </div>
  );
}

type FormValues = {
  name?: string;
  age: number | string;
  breed: DogBreed;
  walkDistanceKm: number;
  walkDurationHours: number;
};

type Props = {
  onSubmitSuccess?: (data: DogInfo) => void;
};

export default function DogInfoForm({ onSubmitSuccess }: Props) {
  const setDog = useDogStore((s) => s.setDog);
  const currentDog = useDogStore((s) => s.dog);

  const defaultUnit = getDefaultAgeUnit(currentDog);

  const [ageUnit, setAgeUnit] = useState<AgeUnit>(defaultUnit);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
    setValue,
    reset,
  } = useForm<FormValues>({
    mode: "onChange",
  });

  const watchedName = useWatch({ control, name: "name" });
  const watchedAge = useWatch({ control, name: "age" });
  const watchedBreed = useWatch({ control, name: "breed" });

  const normalizedAge =
    watchedAge === "" || watchedAge == null ? null : Number(watchedAge);
  const hasAgeValue = normalizedAge !== null && !Number.isNaN(normalizedAge);
  const ageInMonthsForRecommendation = hasAgeValue
    ? toAgeInMonths(normalizedAge, ageUnit)
    : null;
  const showRecommendDist =
    Boolean(watchedBreed) && ageInMonthsForRecommendation !== null;

  const walkRec =
    showRecommendDist && watchedAge && watchedBreed
      ? getWalkRecommendation({
          ageInMonths: ageInMonthsForRecommendation,
          breed: watchedBreed,
        })
      : null;
  const recommendedWalkDistanceKm = walkRec
    ? clampWalkDistanceKm(walkRec.maxKm)
    : null;

  useEffect(() => {
    if (recommendedWalkDistanceKm == null) return;
    setValue("walkDistanceKm", recommendedWalkDistanceKm, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [recommendedWalkDistanceKm, setValue]);

  const trimmedName = watchedName?.trim();
  const ageLabel = hasAgeValue
    ? `${normalizedAge}${AGE_UNIT_LABEL[ageUnit]}`
    : "";
  const recommendTargetLabel = getRecommendTargetLabel(
    trimmedName,
    ageLabel,
    watchedBreed,
  );

  const onSubmit = (data: FormValues) => {
    const normalizedName = data.name?.trim();
    const ageInMonths = toAgeInMonths(Number(data.age), ageUnit);
    const dogInfo: DogInfo = {
      name: normalizedName ? normalizedName : undefined,
      ageInMonths,
      breed: data.breed,
    };
    setDog(dogInfo);
    onSubmitSuccess?.(dogInfo);
    console.log(data);
  };

  const ageMax = ageUnit === "months" ? 11 : 30;
  const agePlaceholder = ageUnit === "months" ? "개월 수 (0~11)" : "나이";

  const handleReset = () => {
    reset();
    setAgeUnit(defaultUnit);
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      <header className="flex items-center text-lg font-semibold">
        몇 가지만 알려주시면
        <br />
        맞춤 추천 경로를 추천해드릴게요.
      </header>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col justify-between"
      >
        <div className="space-y-6">
          {/* 이름 */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold">
              반려견 이름
            </label>
            <input
              {...register("name")}
              placeholder="이름"
              autoComplete="off"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                     focus:outline-none focus:border-dg-green-500"
            />
            <FieldError message={errors.name?.message?.toString()} />
          </div>

          {/* 나이 */}
          <div className="relative space-y-2">
            <div className="flex space-x-4">
              <label
                htmlFor="age"
                className="flex items-center gap-1.5 text-sm font-semibold"
              >
                반려견 나이
              </label>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  {...register("age", {
                    required: "나이를 입력해주세요",
                    valueAsNumber: true,
                    min: { value: 0, message: "0 이상 입력해주세요" },
                    max: {
                      value: ageMax,
                      message: `${ageMax} 이하로 입력해주세요`,
                    },
                  })}
                  placeholder={agePlaceholder}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                       focus:outline-none focus:border-dg-green-500"
                />
              </div>
              <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setAgeUnit("months")}
                  className={`w-[50px] py-2 transition-colors flex-1 ${
                    ageUnit === "months"
                      ? "bg-dg-green-500 text-white"
                      : "bg-white text-gray-700"
                  }`}
                >
                  <p className="text-nowrap">개월</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAgeUnit("years")}
                  className={`w-[50px] py-2 transition-colors flex-1 ${
                    ageUnit === "years"
                      ? "bg-dg-green-500 text-white"
                      : "bg-white text-gray-700"
                  }`}
                >
                  살
                </button>
              </div>
            </div>
            <FieldError
              message={errors.age?.message?.toString()}
              className="absolute left-0 top-full mt-1"
            />
          </div>

          {/* 견종 */}
          <fieldset className="space-y-2">
            <legend className="flex items-center gap-1.5 text-sm font-semibold">
              반려견 크기
            </legend>
            <div className="flex gap-x-2">
              {BREED_OPTIONS.map((opt) => (
                <label
                  htmlFor={opt.value}
                  key={opt.value}
                  className="flex items-center gap-2 border border-gray-300 rounded-full px-3 py-2
                       has-checked:border-dg-green-500 has-checked:bg-dg-green-50 cursor-pointer"
                >
                  <input
                    id={opt.value}
                    type="radio"
                    value={opt.value}
                    {...register("breed", {
                      required: "견종을 선택해주세요",
                    })}
                    className="hidden"
                  />
                  <div className="flex space-x-2">
                    <div className="text-sm font-medium">{opt.value}</div>
                  </div>
                </label>
              ))}
            </div>
            <FieldError message={errors.breed?.message?.toString()} />
          </fieldset>

          <AnimatePresence>
            {showRecommendDist && (
              <motion.div
                key="recommendation"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="space-y-6 will-change-transform"
              >
                {walkRec && (
                  <>
                    <div className="space-y-3 rounded-md border border-dg-green-500/25 bg-dg-green-50 px-3 py-2">
                      <p className="text-xs leading-relaxed">
                        <span className="font-semibold text-dg-green-700 text-nowrap">
                          {recommendTargetLabel}
                        </span>
                        <span className="text-gray-700">
                          {watchedName ? getJosa(watchedName) : "에게는"}
                        </span>
                        &nbsp;
                        <span className="font-bold text-dg-green-700 text-nowrap">
                          {walkRec.minKm}~{walkRec.maxKm}km
                        </span>
                        &nbsp;
                        <span className="text-gray-700 text-nowrap">
                          정도의 산책을 추천해요.
                        </span>
                      </p>
                    </div>
                    <div className="space-y-6">
                      <Controller
                        key={`${walkRec.minKm}-${walkRec.maxKm}`}
                        control={control}
                        name="walkDistanceKm"
                        rules={{
                          min: WALK_DISTANCE_MIN_KM,
                          max: WALK_DISTANCE_MAX_KM,
                        }}
                        render={({ field }) => (
                          <WalkDistanceSelector
                            minKm={walkRec.minKm}
                            maxKm={walkRec.maxKm}
                            value={field.value ?? WALK_DISTANCE_MIN_KM}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name="walkDurationHours"
                        rules={{
                          min: WALK_DURATION_MIN_HOURS,
                          max: WALK_DURATION_MAX_HOURS,
                        }}
                        render={({ field }) => (
                          <WalkDurationSelector
                            value={field.value ?? WALK_DURATION_MIN_HOURS}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-[0.6fr_1.4fr] items-center gap-2 pt-6">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-md border border-gray-300 bg-dg-gray py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        초기화
                      </button>
                      <button
                        type="submit"
                        disabled={!isValid}
                        className={`rounded-md py-2.5 text-sm font-semibold transition-colors ${
                          showRecommendDist
                            ? "bg-dg-green-500 text-white hover:bg-dg-green-600"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        경로 추천
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
