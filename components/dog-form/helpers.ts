import type { DogBreed, DogInfo } from "@/types/dog";
import type { AgeUnit } from "@/components/dog-form/constants";
import {
  WALK_DISTANCE_MAX_KM,
  WALK_DISTANCE_MIN_KM,
} from "@/components/dog-form/constants";

export function getDefaultAgeUnit(dog: DogInfo | null): AgeUnit {
  return dog && dog.ageInMonths < 12 ? "months" : "years";
}

export function getDefaultAgeValue(
  dog: DogInfo | null,
  ageUnit: AgeUnit,
): number | "" {
  if (!dog) return "";
  if (ageUnit === "months") return dog.ageInMonths;
  return Math.floor(dog.ageInMonths / 12);
}

export function toAgeInMonths(age: number, ageUnit: AgeUnit): number {
  return ageUnit === "months" ? age : age * 12;
}

export function clampWalkDistanceKm(distanceKm: number) {
  const rounded = Math.round(distanceKm * 10) / 10;
  return Math.min(
    WALK_DISTANCE_MAX_KM,
    Math.max(WALK_DISTANCE_MIN_KM, rounded),
  );
}

export function formatWalkDistance(distanceKm: number) {
  if (distanceKm === 0) return "-";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
  if (Number.isInteger(distanceKm)) return `${distanceKm}km`;
  return `${distanceKm.toFixed(1)}km`;
}

export function formatWalkDuration(minutes: number) {
  if (minutes === 0) return "정하지 않음";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours > 0 ? hours + "시간" : ""} ${mins > 0 ? mins + "분" : ""}`;
}

export function getRecommendTargetLabel(
  name: string | undefined,
  ageLabel: string,
  breed: DogBreed | undefined,
) {
  if (name) return name;
  if (breed) return `${ageLabel} ${breed}`;
  return "";
}

