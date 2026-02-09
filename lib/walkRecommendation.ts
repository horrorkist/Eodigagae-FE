import type { DogBreed, DogInfo } from "@/types/dog";

/**
 * 견종 크기 × 나이대별 추천 산책 거리 (km)
 *
 * 출처:
 * - 비마이펫 (mypetlife.co.kr) — 나이별 산책 시간 가이드
 * - 비마이펫 — 견종별 하루 운동량
 * - 리앤폴 (leeandpol.com) — 강아지 산책 노하우 총정리
 * - 피스멍멍 — 월령별 산책 시간 가이드
 * - Four Dog Paws — Dog Walking Calculator Guide
 * - Figo Pet Insurance — How often should different sized dogs be walked
 *
 * 시간 데이터를 평균 보행 속도(소형 ~3km/h, 중형 ~4km/h, 대형 ~4.5km/h)로 환산
 */

export type WalkRecommendation = {
  minKm: number;
  maxKm: number;
  ageGroup: "퍼피" | "성견" | "노견";
};

type AgeGroup = WalkRecommendation["ageGroup"];

const DISTANCE_MAP: Record<DogBreed, Record<AgeGroup, [number, number]>> = {
  소형견: {
    퍼피: [0.5, 1],
    성견: [1.5, 3],
    노견: [0.5, 1],
  },
  중형견: {
    퍼피: [0.7, 1.5],
    성견: [4, 6],
    노견: [1.5, 2],
  },
  대형견: {
    퍼피: [0.7, 1.5],
    성견: [4.5, 9],
    노견: [1.5, 3],
  },
};

function getAgeGroup(ageInMonths: number): AgeGroup {
  if (ageInMonths < 12) return "퍼피";
  if (ageInMonths < 96) return "성견"; // 8살(96개월) 미만
  return "노견";
}

export function getWalkRecommendation(dog: DogInfo): WalkRecommendation {
  const ageGroup = getAgeGroup(dog.ageInMonths);
  const [minKm, maxKm] = DISTANCE_MAP[dog.breed][ageGroup];
  return { minKm, maxKm, ageGroup };
}
