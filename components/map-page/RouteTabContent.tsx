import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaw, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import DogInfoForm from "@/components/DogInfoForm";
import type { DogInfoFormDraft } from "@/stores/dogStore";
import type { DogInfo } from "@/types/dog";

function formatDogAgeLabel(ageInMonths: number) {
  if (ageInMonths < 12) {
    return `${ageInMonths}개월`;
  }

  return `${Math.floor(ageInMonths / 12)}살`;
}

type RouteTabContentProps = {
  dog: DogInfo | null;
  preferRouteRecommendSheet: boolean;
  onRouteRecommendRequested: (draft: DogInfoFormDraft) => void;
  onEditDog: () => void;
};

export default function RouteTabContent({
  dog,
  preferRouteRecommendSheet,
  onRouteRecommendRequested,
  onEditDog,
}: RouteTabContentProps) {
  if (!dog || preferRouteRecommendSheet) {
    return (
      <DogInfoForm onRouteRecommendRequested={onRouteRecommendRequested} />
    );
  }

  return (
    <div className="border rounded-md p-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <FontAwesomeIcon icon={faPaw} className="w-3.5 h-3.5 text-blue-500" />
        <span className="font-semibold">{dog.name}</span>
        <span className="text-gray-500">
          {formatDogAgeLabel(dog.ageInMonths)} · {dog.breed}
        </span>
      </div>
      <button
        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
        onClick={onEditDog}
      >
        <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3" />
        수정
      </button>
    </div>
  );
}

