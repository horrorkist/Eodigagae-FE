export type TmapPedestrianPointType =
  | "SP"
  | "EP"
  | "PP"
  | "PP1"
  | "PP2"
  | "PP3"
  | "PP4"
  | "PP5"
  | "GP";

export type TmapPedestrianPointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

export type TmapPedestrianLineGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type TmapPedestrianPointProperties = {
  index?: number;
  pointIndex?: number;
  name?: string;
  guidePointName?: string;
  description?: string;
  direction?: string;
  intersectionName?: string;
  nearPoiX?: number | string;
  nearPoiY?: number | string;
  nearPoiName?: string;
  crossName?: string;
  turnType?: number;
  pointType?: TmapPedestrianPointType;
  totalDistance?: number;
  totalTime?: number;
};

export type TmapPedestrianLineProperties = {
  index?: number;
  lineIndex?: number;
  name?: string;
  roadName?: string;
  description?: string;
  distance?: number;
  time?: number;
  roadType?: number;
  categoryRoadType?: number;
  facilityType?: number;
  facilityName?: string;
};

export type TmapPedestrianPointFeature = {
  type: "Feature";
  geometry: TmapPedestrianPointGeometry;
  properties?: TmapPedestrianPointProperties;
};

export type TmapPedestrianLineFeature = {
  type: "Feature";
  geometry: TmapPedestrianLineGeometry;
  properties?: TmapPedestrianLineProperties;
};

export type TmapPedestrianFeature =
  | TmapPedestrianPointFeature
  | TmapPedestrianLineFeature;

export type TmapPedestrianRouteResponse = {
  type: "FeatureCollection";
  features: TmapPedestrianFeature[];
};
