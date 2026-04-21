import { appIconPinPlace } from "../components/icons/definitions.generated.ts";
import { escapeHtml, stripSvgFilters } from "./markerShell.ts";

const SEARCH_RESULT_MARKER_WIDTH_PX = 50;
const SEARCH_RESULT_MARKER_HEIGHT_PX = 56;
const SEARCH_RESULT_MARKER_TIP_OFFSET_Y_PX = 44.5;
const SEARCH_RESULT_MARKER_COLOR = "#4b5563";

function applyColorToSvgBody(svgBody: string, color: string) {
  return svgBody.replace(/\bcurrentColor\b/g, color);
}

export function buildSearchResultMarkerHTML(title = "") {
  const safeTitle = escapeHtml(title.trim());
  const markerBody = applyColorToSvgBody(
    stripSvgFilters(appIconPinPlace.body),
    SEARCH_RESULT_MARKER_COLOR,
  );

  return `<div data-search-result-marker="true" data-title="${safeTitle}" style="
    position:relative;
    width:${SEARCH_RESULT_MARKER_WIDTH_PX}px;
    height:${SEARCH_RESULT_MARKER_HEIGHT_PX}px;
    transform:translate(-${SEARCH_RESULT_MARKER_WIDTH_PX / 2}px,-${SEARCH_RESULT_MARKER_TIP_OFFSET_Y_PX}px);
    filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));
    pointer-events:auto;
    cursor:pointer;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${appIconPinPlace.viewBox}" width="${SEARCH_RESULT_MARKER_WIDTH_PX}" height="${SEARCH_RESULT_MARKER_HEIGHT_PX}" fill="none" style="display:block;">
      ${markerBody}
    </svg>
  </div>`;
}
