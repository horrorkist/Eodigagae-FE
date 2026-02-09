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

type PoiStyle = {
  icon: IconDefinition;
  bg: string;       // marker circle background
  label: string;    // Korean category label
};

const POI_STYLES: Record<string, PoiStyle> = {
  "12": { icon: faMountainSun,   bg: "#22c55e", label: "관광지" },
  "14": { icon: faLandmark,      bg: "#8b5cf6", label: "문화시설" },
  "15": { icon: faTicket,        bg: "#ec4899", label: "축제·행사" },
  "28": { icon: faPersonRunning, bg: "#f97316", label: "레포츠" },
  "32": { icon: faBed,           bg: "#3b82f6", label: "숙박" },
  "38": { icon: faBagShopping,   bg: "#eab308", label: "쇼핑" },
  "39": { icon: faUtensils,      bg: "#ef4444", label: "음식점" },
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
function renderIconSvg(def: IconDefinition, fill: string, size: number): string {
  const result = faIcon(def);
  if (!result) return "";
  // result.html returns ['<svg ...>...</svg>']
  // We need to inject fill color and size
  const [w, h] = result.icon;
  const svgPath = result.icon[4]; // the 'd' path string (could be string or string[])
  const pathData = typeof svgPath === "string" ? svgPath : (svgPath as string[]).join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${size}" height="${size}" fill="${fill}"><path d="${pathData}"/></svg>`;
}

/**
 * Build the HTML string for a POI pin marker.
 * Renders as a colored circle with an icon + a pointer triangle beneath.
 */
export function buildPinMarkerHTML(contenttypeid: string): string {
  const style = getPoiStyle(contenttypeid);
  const iconSvg = renderIconSvg(style.icon, "#ffffff", 16);

  // Pin size
  const size = 36;
  const half = size / 2;
  const triH = 6;

  return `<div style="
    display:flex;flex-direction:column;align-items:center;
    transform:translate(-${half}px,-${size + triH}px);
    filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));
    pointer-events:auto;cursor:pointer;
  ">
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${style.bg};
      display:flex;align-items:center;justify-content:center;
      border:2.5px solid #fff;
    ">${iconSvg}</div>
    <div style="
      width:0;height:0;
      border-left:${triH}px solid transparent;
      border-right:${triH}px solid transparent;
      border-top:${triH}px solid ${style.bg};
      margin-top:-1px;
    "></div>
  </div>`;
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
