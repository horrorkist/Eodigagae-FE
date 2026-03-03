import type { MutableRefObject } from "react";
import { escapeHtml } from "./markerShell.ts";

export type MarkerClusterSource = "kto" | "fountain" | "trash-bin" | "tmap";

export const CLUSTER_MIN_SIZE = 2;
export const CLUSTER_MAX_ZOOM = 16;
export const CLUSTER_GRID_SIZE = 80;

const CLUSTER_SOURCE_COLORS: Record<MarkerClusterSource, string> = {
  kto: "#ff8a3d",
  fountain: "#3b82f6",
  "trash-bin": "#0ad000",
  tmap: "#4b5563",
};

type MarkerClustererRef = MutableRefObject<MarkerClustering | null>;

function toClusterColor(source: MarkerClusterSource) {
  return CLUSTER_SOURCE_COLORS[source];
}

export function buildClusterBadgeHTML(
  source: MarkerClusterSource,
  count: number,
) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const bg = toClusterColor(source);

  return `<div data-cluster-badge="true" data-source="${source}" style="
    width:44px;
    height:44px;
    border-radius:999px;
    background:${bg};
    border:2px solid rgba(255,255,255,.92);
    box-shadow:0 4px 12px rgba(0,0,0,.22);
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:14px;
    font-weight:800;
    letter-spacing:-0.01em;
    transform:translate(-22px,-22px);
    pointer-events:auto;
    cursor:pointer;
    user-select:none;
  ">${escapeHtml(String(safeCount))}</div>`;
}

function getCtor() {
  if (typeof window === "undefined") return null;
  const ctor = window.MarkerClustering;
  if (typeof ctor !== "function") return null;
  return ctor;
}

export function disposeClusterer(clustererRef: MarkerClustererRef) {
  const current = clustererRef.current;
  if (!current) return;

  try {
    if (typeof current.setMap === "function") current.setMap(null);
    if (typeof current.clear === "function") current.clear();
    if (typeof current.setMarkers === "function") current.setMarkers([]);

    const internal = current as unknown as {
      _clusterMarkers?: naver.maps.Marker[];
      _markers?: naver.maps.Marker[];
    };

    if (Array.isArray(internal._clusterMarkers)) {
      for (const marker of internal._clusterMarkers) {
        marker?.setMap?.(null);
      }
      internal._clusterMarkers.length = 0;
    }

    if (Array.isArray(internal._markers)) {
      for (const marker of internal._markers) {
        marker?.setMap?.(null);
      }
      internal._markers.length = 0;
    }
  } finally {
    clustererRef.current = null;
  }
}

type CreateOrUpdateClustererArgs = {
  clustererRef: MarkerClustererRef;
  map: naver.maps.Map;
  markers: naver.maps.Marker[];
  source: MarkerClusterSource;
  zIndex?: number;
};

export function createOrUpdateClusterer({
  clustererRef,
  map,
  markers,
  source,
  zIndex = 1200,
}: CreateOrUpdateClustererArgs) {
  const safeMarkers = markers.filter(Boolean);

  if (safeMarkers.length === 0) {
    disposeClusterer(clustererRef);
    return null;
  }

  const ctor = getCtor();
  if (!ctor) {
    disposeClusterer(clustererRef);
    return null;
  }

  if (!clustererRef.current) {
    clustererRef.current = new ctor({
      map,
      markers: safeMarkers,
      minClusterSize: CLUSTER_MIN_SIZE,
      maxZoom: CLUSTER_MAX_ZOOM,
      gridSize: CLUSTER_GRID_SIZE,
      disableClickZoom: false,
      icons: [{ content: buildClusterBadgeHTML(source, 0) }],
      iconFactory: (count) => buildClusterBadgeHTML(source, count),
      source,
      zIndex,
    });

    return clustererRef.current;
  }

  const clusterer = clustererRef.current;
  if (typeof clusterer.setMap === "function") {
    clusterer.setMap(map);
  }

  if (typeof clusterer.setMarkers === "function") {
    clusterer.setMarkers(safeMarkers);
  } else if (
    typeof clusterer.clear === "function" &&
    typeof clusterer.addMarkers === "function"
  ) {
    clusterer.clear();
    clusterer.addMarkers(safeMarkers);
  }

  if (typeof clusterer.redraw === "function") {
    clusterer.redraw();
  }

  return clusterer;
}
