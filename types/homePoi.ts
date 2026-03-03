import type { FountainItem, TrashBinItem } from "@/types/facilities";
import type { PetPoiItem } from "@/types/mapEvents";

export type HomePoiSource = "kto" | "fountain" | "trash-bin";

export type HomePoiListItem =
  | {
      id: string;
      source: "kto";
      title: string;
      category: string;
      address: string;
      lat: number;
      lng: number;
      distanceM: number | null;
      thumbnailUrl: string | null;
      meta: {
        source: "kto";
        item: PetPoiItem;
      };
    }
  | {
      id: string;
      source: "fountain";
      title: string;
      category: string;
      address: string;
      lat: number;
      lng: number;
      distanceM: number | null;
      thumbnailUrl: string | null;
      meta: {
        source: "fountain";
        item: FountainItem;
      };
    }
  | {
      id: string;
      source: "trash-bin";
      title: string;
      category: string;
      address: string;
      lat: number;
      lng: number;
      distanceM: number | null;
      thumbnailUrl: string | null;
      meta: {
        source: "trash-bin";
        item: TrashBinItem;
      };
    };
