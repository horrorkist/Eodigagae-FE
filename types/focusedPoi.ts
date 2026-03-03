export type FocusedPoiSource = "kto" | "tmap" | "fountain" | "trash-bin";

export type FocusedPoi = {
  id: string;
  source: FocusedPoiSource;
  name: string;
  lat: number;
  lng: number;
  bizCategory: string;
  distanceM: number | null;
  middleAddress: string;
  jibunAddress?: string;
  roadAddress?: string;
  tel: string;
  thumbnail: string;
  managedBy?: string;
  binType?: string;
  locationDesc?: string;
  cityName?: string;
};
