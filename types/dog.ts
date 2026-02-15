export type DogBreed = "소형견" | "중형견" | "대형견";

export type DogInfo = {
  name?: string;
  ageInMonths: number; // 항상 개월 수로 저장
  breed: DogBreed;
};
