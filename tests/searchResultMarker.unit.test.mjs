import assert from "node:assert/strict";
import test from "node:test";

import { buildSearchResultMarkerHTML } from "../lib/searchResultMarker.ts";

test("buildSearchResultMarkerHTML renders pin-place marker with escaped title", () => {
  const html = buildSearchResultMarkerHTML(`강남역 <검색결과>`);

  assert.match(html, /data-search-result-marker="true"/);
  assert.match(html, /0 0 55 61/);
  assert.match(html, /#4b5563/);
  assert.match(html, /&lt;검색결과&gt;/);
  assert.doesNotMatch(html, /<검색결과>/);
});
