import {
  appIconLocation,
  appIconMarker,
  appIconPaw,
  type AppIconDefinition,
} from "../components/icons/definitions.generated.ts";
import type {
  RouteResult,
  RouteWaypointFacilityKind,
  RouteWaypointMeta,
} from "../domain/route/types.ts";
import {
  buildFacilityPinMarkerHTML,
  type FacilityMarkerSource,
} from "./facilityMarker.ts";
import { escapeHtml, stripSvgFilters } from "./markerShell.ts";
import type { LatLng } from "../types/mapEvents.ts";
import type { RoutePlanningSource } from "../types/routePlanning.ts";

const MARKER_WIDTH_PX = 47;
const MARKER_HEIGHT_PX = 51;
const MARKER_TIP_OFFSET_Y_PX = 38.5;
const MARKER_CENTER_TOP_PERCENT = 38;

const ROUTE_MARKER_WRAPPER_BODY = stripSvgFilters(appIconMarker.body);
const PIVOT_MARKER_BG = "#08a400";
const DESTINATION_MARKER_BG = "#111827";

export type RouteMarkerVariant =
  | "start"
  | "pivot"
  | "facility"
  | "destination";

export type RouteMarkerDescriptor = {
  key: string;
  coordinate: [number, number];
  title: string;
  variant: RouteMarkerVariant;
  label?: string;
  facilitySource?: FacilityMarkerSource;
};

function applyColorToSvgBody(svgBody: string, color: string) {
  return svgBody.replace(/\bcurrentColor\b/g, color);
}

function renderInlineIcon(params: {
  icon: AppIconDefinition;
  color: string;
  sizePx: number;
}) {
  const { icon, color, sizePx } = params;
  const body = applyColorToSvgBody(icon.body, color);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="${sizePx}" height="${sizePx}" style="display:block;">
    ${body}
  </svg>`;
}

function buildMarkerShell(params: {
  wrapperColor: string;
  centerHtml: string;
  title?: string;
}) {
  const { wrapperColor, centerHtml, title = "" } = params;
  const safeTitle = escapeHtml(title.trim());
  const wrapperBody = applyColorToSvgBody(
    ROUTE_MARKER_WRAPPER_BODY,
    wrapperColor,
  );

  return `<div data-route-marker="true" data-title="${safeTitle}" style="
    position:relative;
    width:${MARKER_WIDTH_PX}px;
    height:${MARKER_HEIGHT_PX}px;
    transform:translate(-${MARKER_WIDTH_PX / 2}px,-${MARKER_TIP_OFFSET_Y_PX}px);
    filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));
    pointer-events:none;
    user-select:none;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${appIconMarker.viewBox}" width="${MARKER_WIDTH_PX}" height="${MARKER_HEIGHT_PX}" fill="none" style="display:block;">
      ${wrapperBody}
    </svg>
    ${centerHtml}
  </div>`;
}

function buildPivotCenter(label: string) {
  const safeLabel = escapeHtml(label.trim());

  return `<span style="
    position:absolute;
    left:50%;
    top:${MARKER_CENTER_TOP_PERCENT}%;
    transform:translate(-50%,-50%);
    display:flex;
    align-items:center;
    justify-content:center;
    width:24px;
    height:24px;
    border-radius:999px;
    background:#ffffff;
    color:${PIVOT_MARKER_BG};
    font-size:12px;
    font-weight:800;
    line-height:1;
    letter-spacing:0;
    pointer-events:none;
    box-shadow:0 1px 2px rgba(0,0,0,.16);
  ">${safeLabel}</span>`;
}

function buildStartCenter() {
  return `
    <span style="
      position:absolute;
      left:50%;
      top:${MARKER_CENTER_TOP_PERCENT}%;
      transform:translate(-50%,-50%);
      display:flex;
      align-items:center;
      justify-content:center;
      width:16px;
      height:16px;
      color:#ffffff;
      pointer-events:none;
    ">
      ${renderInlineIcon({ icon: appIconPaw, color: "#ffffff", sizePx: 14 })}
    </span>
  `;
}

function buildDestinationCenter() {
  return `<span style="
    position:absolute;
    left:50%;
    top:${MARKER_CENTER_TOP_PERCENT}%;
    transform:translate(-50%,-50%);
    display:flex;
    align-items:center;
    justify-content:center;
    width:16px;
    height:16px;
    color:#ffffff;
    pointer-events:none;
  ">
    ${renderInlineIcon({ icon: appIconLocation, color: "#ffffff", sizePx: 16 })}
  </span>`;
}

export function buildRouteMarkerHTML(params: {
  variant: RouteMarkerVariant;
  label?: string;
  title?: string;
  facilitySource?: FacilityMarkerSource;
}) {
  const { variant, label, title = "", facilitySource } = params;

  if (variant === "start") {
    return buildMarkerShell({
      wrapperColor: PIVOT_MARKER_BG,
      centerHtml: buildStartCenter(),
      title,
    });
  }

  if (variant === "pivot") {
    return buildMarkerShell({
      wrapperColor: PIVOT_MARKER_BG,
      centerHtml: buildPivotCenter(label ?? ""),
      title,
    });
  }

  if (variant === "facility" && facilitySource) {
    return buildFacilityPinMarkerHTML(facilitySource, title);
  }

  return buildMarkerShell({
    wrapperColor: DESTINATION_MARKER_BG,
    centerHtml: buildDestinationCenter(),
    title,
  });
}

function toCoordinate(pos: LatLng): [number, number] {
  return [pos.lng, pos.lat];
}

function getRouteEndCoordinate(route: RouteResult | null) {
  if (!route?.path?.length) return null;
  return route.path[route.path.length - 1] ?? null;
}

function getPivotWaypoints(routeWaypoints: RouteWaypointMeta[]) {
  return routeWaypoints.filter((waypoint) => waypoint.kind === "pivot");
}

function buildDestinationDescriptor(
  coordinate: [number, number],
  title = "도착지",
): RouteMarkerDescriptor {
  return {
    key: "destination",
    coordinate,
    title,
    variant: "destination",
  };
}

function buildStartDescriptor(
  coordinate: [number, number],
  title = "출발지",
): RouteMarkerDescriptor {
  return {
    key: "start",
    coordinate,
    title,
    variant: "start",
  };
}

function buildPivotMarker(
  waypoint: RouteWaypointMeta,
  pivotLabelMap: Map<number, string>,
): RouteMarkerDescriptor {
  return {
    key: `pivot-${waypoint.order}`,
    coordinate: waypoint.markerCoordinate,
    title: waypoint.title,
    variant: "pivot",
    label: pivotLabelMap.get(waypoint.order) ?? "",
  };
}

function toFacilitySource(
  facilityKind: RouteWaypointFacilityKind | null | undefined,
): FacilityMarkerSource | null {
  if (facilityKind === "trash-bin" || facilityKind === "fountain") {
    return facilityKind;
  }
  return null;
}

function buildRawFacilityMarker(
  waypoint: RouteWaypointMeta,
): RouteMarkerDescriptor | null {
  const facilitySource = toFacilitySource(waypoint.facilityKind);
  if (!facilitySource) return null;

  return {
    key: `facility-${waypoint.order}`,
    coordinate: waypoint.coordinate,
    title: waypoint.title,
    variant: "facility",
    facilitySource,
  };
}

export function resolveRouteMarkers(params: {
  route: RouteResult | null;
  drawRoute: boolean;
  pickedPos: LatLng | null;
  routeExperienceSource: RoutePlanningSource | null;
  walking: boolean;
  activeRouteLegIndex: number;
}): RouteMarkerDescriptor[] {
  const {
    route,
    drawRoute,
    pickedPos,
    routeExperienceSource,
    walking,
    activeRouteLegIndex,
  } = params;

  if (routeExperienceSource === "dog-recommend") {
    if (!drawRoute || !route) return [];

    const routeWaypoints = route.waypoints ?? [];
    const pivotWaypoints = getPivotWaypoints(routeWaypoints);
    const startWaypoint = routeWaypoints.find(
      (waypoint) => waypoint.kind === "start",
    );
    const pivotLabelMap = new Map(
      pivotWaypoints.map((waypoint, index) => [
        waypoint.order,
        String(index + 1),
      ]),
    );

    if (!walking) {
      const rawFacilityMarkers = pivotWaypoints
        .map((waypoint) => buildRawFacilityMarker(waypoint))
        .filter((marker): marker is RouteMarkerDescriptor => marker != null);

      return [
        ...(startWaypoint
          ? [
              buildStartDescriptor(
                startWaypoint.markerCoordinate,
                startWaypoint.title,
              ),
            ]
          : route.path[0]
            ? [buildStartDescriptor(route.path[0])]
            : []),
        ...pivotWaypoints.map((waypoint) =>
          buildPivotMarker(waypoint, pivotLabelMap),
        ),
        ...rawFacilityMarkers,
      ];
    }

    if (activeRouteLegIndex < pivotWaypoints.length) {
      const currentPivot = pivotWaypoints[activeRouteLegIndex];
      return [
        buildPivotMarker(currentPivot, pivotLabelMap),
        ...(() => {
          const marker = buildRawFacilityMarker(currentPivot);
          return marker ? [marker] : [];
        })(),
      ];
    }

    const destinationCoordinate =
      routeWaypoints.find((waypoint) => waypoint.kind === "end")
        ?.markerCoordinate ?? getRouteEndCoordinate(route);
    if (!destinationCoordinate) return [];

    return [buildDestinationDescriptor(destinationCoordinate)];
  }

  const destinationCoordinate =
    pickedPos != null
      ? toCoordinate(pickedPos)
      : route?.waypoints?.find((waypoint) => waypoint.kind === "end")
          ?.markerCoordinate ?? getRouteEndCoordinate(route);
  if (!destinationCoordinate) return [];
  if (!drawRoute && pickedPos == null) return [];

  return [buildDestinationDescriptor(destinationCoordinate)];
}
