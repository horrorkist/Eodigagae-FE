/// <reference types="navermaps" />

declare global {
  type MarkerClusterSource = "kto" | "fountain" | "trash-bin" | "tmap";

  type MarkerClusteringIcon = {
    content: string;
  };

  type MarkerClusteringOptions = {
    map: naver.maps.Map | null;
    markers?: naver.maps.Marker[];
    minClusterSize?: number;
    maxZoom?: number;
    gridSize?: number;
    disableClickZoom?: boolean;
    icons?: MarkerClusteringIcon[];
    iconFactory?: (count: number) => string;
    zIndex?: number;
    source?: MarkerClusterSource;
  };

  class MarkerClustering {
    constructor(options: MarkerClusteringOptions);
    setMap(map: naver.maps.Map | null): void;
    getMap(): naver.maps.Map | null;
    setMarkers(markers: naver.maps.Marker[]): void;
    addMarkers(markers: naver.maps.Marker[]): void;
    clear(): void;
    redraw(): void;
  }

  interface Window {
    MarkerClustering?: typeof MarkerClustering;
    __naverClusterPluginWarned?: boolean;
    __naverClusterPluginLoaded?: boolean;
    __naverClusterPluginLoadAttempted?: boolean;
    __naverClusterPluginVersion?: string;
    __naverMapSdkLoaded?: boolean;
  }
}

export {};
