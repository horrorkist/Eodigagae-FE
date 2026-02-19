import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUserMarkerHTML,
  USER_MARKER_SIZE_PX,
} from "../adapters/map/naver/userMarker.ts";

test("buildUserMarkerHTML renders fixed marker frame", () => {
  const html = buildUserMarkerHTML(null, false);

  assert.match(html, new RegExp(`width:${USER_MARKER_SIZE_PX}px`));
  assert.match(html, new RegExp(`height:${USER_MARKER_SIZE_PX}px`));
});

test("buildUserMarkerHTML renders direction layer only when walking with heading", () => {
  const idle = buildUserMarkerHTML(45, false);
  const walkingWithHeading = buildUserMarkerHTML(45, true);
  const walkingWithoutHeading = buildUserMarkerHTML(null, true);

  assert.ok(!idle.includes("transform:rotate("));
  assert.ok(walkingWithHeading.includes("transform:rotate(45.0deg)"));
  assert.ok(!walkingWithoutHeading.includes("transform:rotate("));
});
