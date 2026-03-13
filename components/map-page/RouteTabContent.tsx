import DogInfoForm from "@/components/DogInfoForm";
import type { DogInfoFormDraft } from "@/stores/dogStore";

type RouteTabContentProps = {
  onRouteRecommendRequested: (draft: DogInfoFormDraft) => void;
};

export default function RouteTabContent({
  onRouteRecommendRequested,
}: RouteTabContentProps) {
  return (
    <DogInfoForm
      useBottomNavCta
      submitLabel="시작위치 설정"
      onRouteRecommendRequested={onRouteRecommendRequested}
    />
  );
}
