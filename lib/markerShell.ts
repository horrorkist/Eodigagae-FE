import { appIconMarker } from "../components/icons/definitions.generated.ts";

const MARKER_WIDTH_PX = 47;
const MARKER_HEIGHT_PX = 51;
const MARKER_TIP_OFFSET_Y_PX = 38.5;
const MARKER_ICON_CENTER_TOP_PERCENT = 38;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripSvgFilters(svgBody: string) {
  return svgBody
    .replace(/<defs[\s\S]*?<\/defs>/gi, "")
    .replace(/\sfilter=(["']).*?\1/gi, "")
    .trim();
}

const MARKER_WRAPPER_BODY = stripSvgFilters(appIconMarker.body);

function applyColorToSvgBody(svgBody: string, color: string) {
  return svgBody.replace(/\bcurrentColor\b/g, color);
}

type BuildMarkerShellParams = {
  wrapperColor: string;
  innerIconBody: string;
  innerIconViewBox: string;
  innerIconColor: string;
  title?: string;
};

export function buildMarkerShellHTML({
  wrapperColor,
  innerIconBody,
  innerIconViewBox,
  innerIconColor,
  title = "",
}: BuildMarkerShellParams) {
  const safeTitle = escapeHtml(title.trim());
  const wrapperBody = applyColorToSvgBody(MARKER_WRAPPER_BODY, wrapperColor);
  const innerBody = applyColorToSvgBody(innerIconBody, innerIconColor);

  return `<div data-marker-shell="true" data-title="${safeTitle}" style="
    position:relative;
    width:${MARKER_WIDTH_PX}px;
    height:${MARKER_HEIGHT_PX}px;
    transform:translate(-${MARKER_WIDTH_PX / 2}px,-${MARKER_TIP_OFFSET_Y_PX}px);
    filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));
    pointer-events:auto;
    cursor:pointer;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${appIconMarker.viewBox}" width="${MARKER_WIDTH_PX}" height="${MARKER_HEIGHT_PX}" fill="none" style="display:block;">
      ${wrapperBody}
    </svg>
    <span style="
      position:absolute;
      left:50%;
      top:${MARKER_ICON_CENTER_TOP_PERCENT}%;
      transform:translate(-50%,-50%);
      display:flex;
      align-items:center;
      justify-content:center;
      width:16px;
      height:16px;
      color:${innerIconColor};
      pointer-events:none;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${innerIconViewBox}" width="16" height="16" style="display:block;overflow:visible;">
        ${innerBody}
      </svg>
    </span>
  </div>`;
}
