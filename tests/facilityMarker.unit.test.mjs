import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFacilityPinMarkerHTML,
  getFacilityMarkerStyle,
} from "../lib/facilityMarker.ts";

test("buildFacilityPinMarkerHTML renders fountain marker with escaped title", () => {
  const html = buildFacilityPinMarkerHTML("fountain", "보라매 <음수대>");

  assert.match(html, /data-source="fountain"/);
  assert.match(html, /data-marker-shell="true"/);
  assert.match(html, /#3b82f6/);
  assert.match(html, /&lt;음수대&gt;/);
  assert.doesNotMatch(html, /<음수대>/);
});

test("buildFacilityPinMarkerHTML renders trash-bin marker style", () => {
  const html = buildFacilityPinMarkerHTML("trash-bin", "강남역 쓰레기통");

  assert.match(html, /data-source="trash-bin"/);
  assert.match(html, /var\(--color-dg-green-sub\)/);
});

test("getFacilityMarkerStyle throws for unsupported source", () => {
  assert.throws(
    () => getFacilityMarkerStyle(/** @type {any} */ ("unknown")),
    /Unsupported facility marker source/,
  );
});
