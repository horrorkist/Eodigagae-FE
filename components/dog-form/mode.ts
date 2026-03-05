export type DogInfoFormMode = "route" | "profile";

export function shouldRequestRouteRecommendation(mode: DogInfoFormMode): boolean {
  return mode === "route";
}

export function resolveDogInfoFormSubmitLabel(
  mode: DogInfoFormMode,
  submitLabel?: string,
): string {
  if (submitLabel) return submitLabel;
  return mode === "route" ? "경로 추천" : "저장";
}
