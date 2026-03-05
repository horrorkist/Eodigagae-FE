"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { DogBreed, DogInfo } from "@/types/dog";
import { useDogStore } from "@/stores/dogStore";
import type { DogInfoFormDraft } from "@/stores/dogStore";
import { AnimatePresence, motion } from "framer-motion";
import { getWalkRecommendation } from "@/lib/walkRecommendation";
import { getJosa } from "@/lib/utils";
import {
  AGE_UNIT_LABEL,
  BREED_OPTIONS,
  type AgeUnit,
  WALK_DISTANCE_MAX_KM,
  WALK_DISTANCE_MIN_KM,
  WALK_DURATION_MAX_MINUTES,
  WALK_DURATION_MIN_MINUTES,
} from "@/components/dog-form/constants";
import {
  clampWalkDistanceKm,
  getDefaultAgeUnit,
  getDefaultAgeValue,
  getRecommendTargetLabel,
  toAgeInMonths,
} from "@/components/dog-form/helpers";
import {
  FieldError,
  WalkDistanceSelector,
  WalkDurationSelector,
} from "@/components/dog-form/WalkFormFields";
import {
  resolveDogInfoFormSubmitLabel,
  shouldRequestRouteRecommendation,
  type DogInfoFormMode,
} from "@/components/dog-form/mode";

type FormValues = {
  name?: string;
  age: number | string;
  breed: DogBreed | "";
  walkDistanceKm: number;
  walkDurationHours: number;
};

type Props = {
  mode?: DogInfoFormMode;
  submitLabel?: string;
  onSubmitSuccess?: (data: DogInfo) => void;
  onRouteRecommendRequested?: (draft: DogInfoFormDraft) => void;
};

export default function DogInfoForm({
  mode = "route",
  submitLabel,
  onSubmitSuccess,
  onRouteRecommendRequested,
}: Props) {
  const setDog = useDogStore((s) => s.setDog);
  const currentDog = useDogStore((s) => s.dog);
  const currentFormDraft = useDogStore((s) => s.formDraft);
  const setFormDraft = useDogStore((s) => s.setFormDraft);
  const formRootRef = useRef<HTMLDivElement | null>(null);
  const wasWalkRecVisibleRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const dogDefaultUnit = getDefaultAgeUnit(currentDog);
  const restoreUnit = currentFormDraft?.ageUnit ?? dogDefaultUnit;
  const defaultAge =
    currentFormDraft?.age ?? getDefaultAgeValue(currentDog, restoreUnit);
  const restoreFormValues: FormValues = {
    name: currentFormDraft?.name ?? currentDog?.name ?? "",
    age: defaultAge,
    breed: currentFormDraft?.breed ?? currentDog?.breed ?? "",
    walkDistanceKm: currentFormDraft?.walkDistanceKm ?? WALK_DISTANCE_MIN_KM,
    walkDurationHours:
      currentFormDraft?.walkDurationMinutes ?? WALK_DURATION_MIN_MINUTES,
  };
  const resetFormValues: FormValues = {
    name: "",
    age: "",
    breed: "",
    walkDistanceKm: WALK_DISTANCE_MIN_KM,
    walkDurationHours: WALK_DURATION_MIN_MINUTES,
  };

  const [ageUnit, setAgeUnit] = useState<AgeUnit>(restoreUnit);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
    setValue,
    reset,
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: restoreFormValues,
  });

  const watchedName = useWatch({ control, name: "name" });
  const watchedAge = useWatch({ control, name: "age" });
  const watchedBreed = useWatch({ control, name: "breed" });
  const watchedWalkDurationMinutes = useWatch({
    control,
    name: "walkDurationHours",
  });

  const selectedBreed = watchedBreed || undefined;
  const isRouteMode = shouldRequestRouteRecommendation(mode);
  const resolvedSubmitLabel = resolveDogInfoFormSubmitLabel(mode, submitLabel);
  const normalizedAge =
    watchedAge === "" || watchedAge == null ? null : Number(watchedAge);
  const hasAgeValue = normalizedAge !== null && !Number.isNaN(normalizedAge);
  const ageInMonthsForRecommendation = hasAgeValue
    ? toAgeInMonths(normalizedAge, ageUnit)
    : null;
  const walkRec =
    selectedBreed && ageInMonthsForRecommendation !== null
      ? getWalkRecommendation({
          ageInMonths: ageInMonthsForRecommendation,
          breed: selectedBreed,
        })
      : null;
  const recommendedWalkDistanceKm = walkRec
    ? clampWalkDistanceKm(walkRec.minKm)
    : null;
  const isDurationPriority =
    Number(watchedWalkDurationMinutes ?? WALK_DURATION_MIN_MINUTES) >
    WALK_DURATION_MIN_MINUTES;
  const hasSavedDraft = currentFormDraft != null;

  useEffect(() => {
    if (hasSavedDraft) return;
    if (recommendedWalkDistanceKm == null || isDurationPriority) return;
    setValue("walkDistanceKm", recommendedWalkDistanceKm, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [recommendedWalkDistanceKm, setValue, isDurationPriority, hasSavedDraft]);

  useEffect(() => {
    const isWalkRecVisible = Boolean(walkRec);
    const wasWalkRecVisible = wasWalkRecVisibleRef.current;
    const formRoot = formRootRef.current;
    const bottomSheetContent = formRoot?.closest(
      "[data-bottom-sheet-content]",
    ) as HTMLDivElement | null;

    if (!bottomSheetContent) {
      wasWalkRecVisibleRef.current = isWalkRecVisible;
      return;
    }

    if (isWalkRecVisible && !wasWalkRecVisible) {
      requestAnimationFrame(() => {
        bottomSheetContent.scrollTo({
          top: bottomSheetContent.scrollHeight,
          behavior: "smooth",
        });
      });
    }

    if (!isWalkRecVisible && wasWalkRecVisible) {
      requestAnimationFrame(() => {
        bottomSheetContent.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }

    wasWalkRecVisibleRef.current = isWalkRecVisible;
  }, [walkRec]);

  const trimmedName = watchedName?.trim();
  const ageLabel = hasAgeValue
    ? `${normalizedAge}${AGE_UNIT_LABEL[ageUnit]}`
    : "";
  const recommendTargetLabel = getRecommendTargetLabel(
    trimmedName,
    ageLabel,
    selectedBreed,
  );

  const onSubmit = (data: FormValues) => {
    if (!data.breed) return;
    const normalizedName = data.name?.trim();
    const normalizedAge = Number(data.age);
    const ageInMonths = toAgeInMonths(normalizedAge, ageUnit);
    const dogInfo: DogInfo = {
      name: normalizedName ? normalizedName : undefined,
      ageInMonths,
      breed: data.breed,
    };
    const nextFormDraft: DogInfoFormDraft = {
      name: normalizedName ? normalizedName : undefined,
      age: normalizedAge,
      ageUnit,
      breed: data.breed,
      walkDistanceKm: Number(data.walkDistanceKm),
      walkDurationMinutes: Number(data.walkDurationHours),
    };

    setDog(dogInfo);
    setFormDraft(nextFormDraft);
    onSubmitSuccess?.(dogInfo);
    if (isRouteMode) {
      onRouteRecommendRequested?.(nextFormDraft);
    }
  };

  const ageMax = ageUnit === "months" ? 11 : 30;
  const agePlaceholder = ageUnit === "months" ? "개월 수 (0~11)" : "나이";

  const handleReset = () => {
    reset(resetFormValues);
    setAgeUnit("years");
    setFormDraft(null);
  };

  const handleWalkDurationChange = (
    nextDuration: number,
    onChange: (nextValue: number) => void,
  ) => {
    const normalizedDuration = Math.min(
      WALK_DURATION_MAX_MINUTES,
      Math.max(WALK_DURATION_MIN_MINUTES, nextDuration),
    );

    onChange(normalizedDuration);

    if (normalizedDuration > WALK_DURATION_MIN_MINUTES) {
      setValue("walkDistanceKm", 0, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      return;
    }

    setValue("walkDistanceKm", walkRec?.minKm ?? WALK_DISTANCE_MIN_KM, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div
      ref={formRootRef}
      className="flex h-full flex-col space-y-6 text-dg-black"
    >
      <header className="flex items-center text-lg font-semibold">
        {isRouteMode ? (
          <>
            몇 가지만 알려주시면
            <br />
            맞춤 산책 경로를 추천해드릴게요.
          </>
        ) : (
          <>
            함께하는 반려견 정보를
            <br />
            등록하거나 수정해 주세요.
          </>
        )}
      </header>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col justify-between"
        ref={formRef}
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
              className="w-full border border-dg-white rounded-md px-3 py-2 text-sm
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
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  autoComplete="off"
                  type="number"
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
                  className="w-full border border-dg-white rounded-md px-3 py-2 text-sm
                       focus:outline-none focus:border-dg-green-500"
                />
              </div>
              <div className="flex rounded-md border border-dg-white overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setAgeUnit("years")}
                  className={`w-[50px] py-2 transition-colors flex-1 ${
                    ageUnit === "years"
                      ? "bg-dg-green-500 text-white"
                      : "bg-white text-gray-700"
                  }`}
                >
                  년
                </button>
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
            <Controller
              control={control}
              name="breed"
              rules={{ required: "견종을 선택해주세요" }}
              render={({ field }) => {
                const selectedValue = field.value ?? "";
                return (
                  <div className="flex gap-x-2">
                    {BREED_OPTIONS.map((opt) => (
                      <label
                        htmlFor={opt.value}
                        key={opt.value}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 cursor-pointer ${
                          selectedValue === opt.value
                            ? "border-dg-green-500 bg-dg-green-50"
                            : "border-dg-white"
                        }`}
                      >
                        <input
                          id={opt.value}
                          type="radio"
                          value={opt.value}
                          checked={selectedValue === opt.value}
                          onChange={() => field.onChange(opt.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          className="hidden"
                        />
                        <div className="flex space-x-2">
                          <div className="text-sm font-medium">{opt.value}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                );
              }}
            />
            <FieldError message={errors.breed?.message?.toString()} />
          </fieldset>

          <AnimatePresence>
            {isRouteMode && walkRec && (
              <motion.div
                key="recommendation"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="space-y-6 will-change-transform"
              >
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
                  {/* 시간 */}
                  <Controller
                    control={control}
                    name="walkDurationHours"
                    rules={{
                      min: WALK_DURATION_MIN_MINUTES,
                      max: WALK_DURATION_MAX_MINUTES,
                    }}
                    render={({ field }) => (
                      <WalkDurationSelector
                        value={field.value ?? WALK_DURATION_MIN_MINUTES}
                        onChange={(nextDuration) =>
                          handleWalkDurationChange(nextDuration, field.onChange)
                        }
                      />
                    )}
                  />
                  {/* 거리 */}
                  <Controller
                    key={`${walkRec.minKm}-${walkRec.maxKm}`}
                    control={control}
                    name="walkDistanceKm"
                    rules={{
                      min: 0,
                      max: WALK_DISTANCE_MAX_KM,
                    }}
                    render={({ field }) => (
                      <WalkDistanceSelector
                        minKm={walkRec.minKm}
                        maxKm={walkRec.maxKm}
                        value={field.value ?? WALK_DISTANCE_MIN_KM}
                        onChange={field.onChange}
                        disabledByDuration={isDurationPriority}
                      />
                    )}
                  />
                </div>
                <div className="grid grid-cols-[0.7fr_1.3fr] items-center gap-3 pt-6 text-lg">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl bg-dg-white py-4 font-semibold text-dg-black transition-colors hover:bg-gray-50"
                  >
                    초기화
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid}
                    className={`rounded-xl py-4 font-semibold transition-colors ${
                      walkRec
                        ? "bg-dg-green-500 text-white hover:bg-dg-green-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {resolvedSubmitLabel}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isRouteMode && (
            <div className="grid grid-cols-[0.7fr_1.3fr] items-center gap-3 pt-6 text-lg">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl bg-dg-white py-4 font-semibold text-dg-black transition-colors hover:bg-gray-50"
              >
                초기화
              </button>
              <button
                type="submit"
                disabled={!isValid}
                className={`rounded-xl py-4 font-semibold transition-colors ${
                  isValid
                    ? "bg-dg-green-500 text-white hover:bg-dg-green-600"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {resolvedSubmitLabel}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
