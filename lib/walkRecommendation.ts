import type { DogBreed, DogInfo } from "@/types/dog";

/**
 * 견종 크기 분류 × 나이대별 추천 산책 거리 (km)
 */

export type WalkRecommendation = {
  minKm: number;
  maxKm: number;
  ageGroup: "퍼피" | "성견 초반" | "성견" | "노견";
};

type AgeGroup = WalkRecommendation["ageGroup"];

const DISTANCE_MAP: Record<DogBreed, Record<AgeGroup, [number, number]>> = {
  소형견: {
    퍼피: [1, 2],
    "성견 초반": [1.5, 3],
    성견: [1.5, 3],
    노견: [1, 2],
  },
  중형견: {
    퍼피: [1, 2],
    "성견 초반": [5, 6],
    성견: [4, 5],
    노견: [2, 3],
  },
  대형견: {
    퍼피: [1, 2],
    "성견 초반": [6, 8],
    성견: [6, 8],
    노견: [3, 4],
  },
};

function getAgeGroup(ageInMonths: number): AgeGroup {
  if (ageInMonths < 12) return "퍼피";
  if (ageInMonths < 36) return "성견 초반";
  if (ageInMonths < 84) return "성견"; // 7살(84개월) 미만
  return "노견";
}

export function getWalkRecommendation(dog: DogInfo): WalkRecommendation {
  const ageGroup = getAgeGroup(dog.ageInMonths);
  const [minKm, maxKm] = DISTANCE_MAP[dog.breed][ageGroup];
  return { minKm, maxKm, ageGroup };
}
