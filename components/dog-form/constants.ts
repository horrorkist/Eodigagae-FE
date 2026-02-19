import type { DogBreed } from "@/types/dog";

export const BREED_OPTIONS = [
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
] as const satisfies ReadonlyArray<{
  value: DogBreed;
  examples: string;
  size: string[];
}>;

export type AgeUnit = "months" | "years";

export const AGE_UNIT_LABEL = {
  months: "개월",
  years: "살",
} as const;

export const WALK_DISTANCE_MIN_KM = 0.5;
export const WALK_DISTANCE_MAX_KM = 10;
export const WALK_DISTANCE_STEP_KM = 0.5;
export const WALK_DURATION_MIN_MINUTES = 0;
export const WALK_DURATION_MAX_MINUTES = 180;
export const WALK_DURATION_STEP_MINUTES = 10;

export const WALK_STEP_BUTTON_CLASS =
  "h-9 w-9 rounded-md border border-dg-white bg-white text-lg font-semibold text-gray-700 disabled:opacity-40";
export const ERROR_TEXT_CLASS = "flex items-center gap-1 text-xs text-red-600";

