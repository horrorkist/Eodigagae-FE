export type RouteSummary = {
  distance?: number; // meters
  duration?: number; // ms or sec (upstream dependent)
};

export type RouteGuidanceStep = {
  order: number;
  coordinate: [number, number]; // [lng, lat]
  index?: number;
  pointIndex?: number;
  name?: string;
  guidePointName?: string;
  description?: string;
  direction?: string;
  intersectionName?: string;
  nearPoiName?: string;
  nearPoi?: [number, number]; // [lng, lat]
  crossName?: string;
  turnType?: number;
  pointType?: string;
};

export type RouteSegment = {
  order: number;
  index?: number;
  lineIndex?: number;
  name?: string;
  roadName?: string;
  description?: string;
  distance?: number; // meters
  duration?: number; // sec or ms (upstream dependent)
  roadType?: number;
  categoryRoadType?: number;
  facilityType?: number;
  facilityName?: string;
  coordinateCount: number;
  start: [number, number]; // [lng, lat]
  end: [number, number]; // [lng, lat]
};

export type RouteEndpoints = {
  start?: RouteGuidanceStep;
  end?: RouteGuidanceStep;
};

export type RouteFeatureStats = {
  totalFeatures: number;
  pointFeatures: number;
  lineFeatures: number;
};

export type RouteResult = {
  summary?: RouteSummary;
  path: [number, number][]; // [[lng,lat], ...]
  guidance?: RouteGuidanceStep[];
  segments?: RouteSegment[];
  endpoints?: RouteEndpoints;
  featureStats?: RouteFeatureStats;
};
