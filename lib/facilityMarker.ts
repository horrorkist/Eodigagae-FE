import {
  appIconTrashbin,
  appIconWaterdrop,
  type AppIconDefinition,
} from "../components/icons/definitions.generated.ts";
import { buildMarkerShellHTML } from "./markerShell.ts";

export type FacilityMarkerSource = "fountain" | "trash-bin";

type FacilityMarkerStyle = {
  icon: AppIconDefinition;
  bg: string;
  iconColor: string;
};

const FACILITY_MARKER_STYLES: Record<FacilityMarkerSource, FacilityMarkerStyle> =
  {
    fountain: {
      icon: appIconWaterdrop,
      bg: "#3b82f6",
      iconColor: "#ffffff",
    },
    "trash-bin": {
      icon: appIconTrashbin,
      bg: "var(--color-green-sub)",
      iconColor: "#ffffff",
    },
  };

export function getFacilityMarkerStyle(
  source: FacilityMarkerSource,
): FacilityMarkerStyle {
  const style = FACILITY_MARKER_STYLES[source];
  if (!style) {
    throw new Error(`Unsupported facility marker source: ${source}`);
  }
  return style;
}

export function buildFacilityPinMarkerHTML(
  source: FacilityMarkerSource,
  title = "",
): string {
  const style = getFacilityMarkerStyle(source);
  const shell = buildMarkerShellHTML({
    wrapperColor: style.bg,
    innerIconBody: style.icon.body,
    innerIconViewBox: style.icon.viewBox,
    innerIconColor: style.iconColor,
    title,
  });

  return shell.replace("<div ", `<div data-source="${source}" `);
}
