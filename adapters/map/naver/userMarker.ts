export const USER_MARKER_SIZE_PX = 44;

const USER_DIRECTION_TRIANGLE_WIDTH_PX = 8;
const USER_DIRECTION_TRIANGLE_HEIGHT_PX = 8;
const USER_DIRECTION_TRIANGLE_TOP_OFFSET_PX = -1;

export function buildUserMarkerHTML(
  headingDeg: number | null,
  walking: boolean,
) {
  const directionLayer =
    walking && headingDeg != null
      ? `<div style="position:absolute;inset:0;transform:rotate(${headingDeg.toFixed(1)}deg);transform-origin:50% 50%;">
        <svg width="${USER_DIRECTION_TRIANGLE_WIDTH_PX}" height="${USER_DIRECTION_TRIANGLE_HEIGHT_PX}" viewBox="0 0 6.9282 6" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;left:50%;top:${USER_DIRECTION_TRIANGLE_TOP_OFFSET_PX}px;transform:translateX(-50%);overflow:visible;filter:drop-shadow(0 1px 1px rgba(15, 23, 42, 0.3));">
          <path d="M3.4641 0L6.9282 6H0L3.4641 0Z" fill="#FFFFFF"/>
        </svg>
      </div>`
      : "";

  return `
    <div style="width:${USER_MARKER_SIZE_PX}px;height:${USER_MARKER_SIZE_PX}px;position:relative;pointer-events:none;">
      <svg width="${USER_MARKER_SIZE_PX}" height="${USER_MARKER_SIZE_PX}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;inset:0;">
        <circle cx="22" cy="22" r="22" fill="#0BDC00" fill-opacity="0.3"/>
        <g filter="url(#user-marker-filter)">
          <circle cx="22" cy="22" r="8" fill="#0BDC00"/>
          <circle cx="22" cy="22" r="9.5" stroke="white" stroke-width="3"/>
        </g>
        <defs>
          <filter id="user-marker-filter" x="2.2" y="2.2" width="39.6" height="39.6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset/>
            <feGaussianBlur stdDeviation="4.4"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.0431373 0 0 0 0 0.862745 0 0 0 0 0 0 0 0 1 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_181_3"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_181_3" result="shape"/>
          </filter>
        </defs>
      </svg>
      ${directionLayer}
    </div>
    `;
}

