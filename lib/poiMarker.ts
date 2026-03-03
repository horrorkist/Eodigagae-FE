import { icon as faIcon, library } from "@fortawesome/fontawesome-svg-core";
import {
  faMountainSun,
  faLandmark,
  faTicket,
  faPersonRunning,
  faBed,
  faBagShopping,
  faUtensils,
  faPaw,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { buildMarkerShellHTML } from "./markerShell.ts";

// Register icons so icon() lookup works
library.add(
  faMountainSun,
  faLandmark,
  faTicket,
  faPersonRunning,
  faBed,
  faBagShopping,
  faUtensils,
  faPaw,
);

export type PoiStyle = {
  icon: IconDefinition;
  bg: string; // marker circle background
  label: string; // Korean category label
};

export const POI_STYLES: Record<string, PoiStyle> = {
  "12": { icon: faMountainSun, bg: "#22c55e", label: "관광지" },
  "14": { icon: faLandmark, bg: "#8b5cf6", label: "문화시설" },
  "15": { icon: faTicket, bg: "#ec4899", label: "축제·행사" },
  "28": { icon: faPersonRunning, bg: "#f97316", label: "레포츠" },
  "32": { icon: faBed, bg: "#3b82f6", label: "숙박" },
  "38": { icon: faBagShopping, bg: "#eab308", label: "쇼핑" },
  "39": { icon: faUtensils, bg: "#ef4444", label: "음식점" },
};

const DEFAULT_STYLE: PoiStyle = {
  icon: faPaw,
  bg: "#6b7280",
  label: "기타",
};

export function getPoiStyle(contenttypeid: string): PoiStyle {
  return POI_STYLES[contenttypeid] ?? DEFAULT_STYLE;
}

/** Render an FA icon to an SVG string (no React needed) */
function renderIconSvg(
  def: IconDefinition,
): { viewBox: string; body: string } {
  const result = faIcon(def);
  if (!result) {
    return {
      viewBox: "0 0 16 16",
      body: "",
    };
  }
  // result.html returns ['<svg ...>...</svg>']
  const [w, h] = result.icon;
  const svgPath = result.icon[4]; // the 'd' path string (could be string or string[])
  const pathData =
    typeof svgPath === "string" ? svgPath : (svgPath as string[]).join(" ");

  return {
    viewBox: `0 0 ${w} ${h}`,
    body: `<path d="${pathData}" fill="currentColor"/>`,
  };
}

/**
 * Build the HTML string for a POI pin marker using the marker.svg wrapper.
 */
export function buildPinMarkerHTML(contenttypeid: string): string {
  const style = getPoiStyle(contenttypeid);
  const innerIcon = renderIconSvg(style.icon);

  return buildMarkerShellHTML({
    wrapperColor: style.bg,
    innerIconBody: innerIcon.body,
    innerIconViewBox: innerIcon.viewBox,
    innerIconColor: "#ffffff",
  });
}

/**
 * Build the HTML for the floating label above the pin.
 * Shows a category badge + title.
 */
export function buildLabelMarkerHTML(
  title: string,
  contenttypeid: string,
): string {
  const style = getPoiStyle(contenttypeid);
  const safe = (title ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<div style="
    transform:translate(-50%,-72px);
    display:inline-flex;align-items:center;gap:4px;
    background:rgba(255,255,255,.94);
    border:1px solid rgba(0,0,0,.1);
    border-radius:999px;
    padding:3px 4px 3px 4px;
    box-shadow:0 2px 8px rgba(0,0,0,.12);
    white-space:nowrap;
    max-width:200px;
    pointer-events:none;
  ">
    <span style="
      display:inline-flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:700;
      color:#fff;background:${style.bg};
      border-radius:999px;padding:2px 6px;
      line-height:1.1;
      flex-shrink:0;
    ">${style.label}</span>
    <span style="
      font-size:11px;line-height:1;font-weight:500;
      color:#1f2937;
      overflow:hidden;text-overflow:ellipsis;
    ">${safe}</span>
  </div>`;
}
