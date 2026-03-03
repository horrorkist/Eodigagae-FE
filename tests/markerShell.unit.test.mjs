import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarkerShellHTML,
  escapeHtml,
  stripSvgFilters,
} from "../lib/markerShell.ts";

test("stripSvgFilters removes defs blocks and filter attributes", () => {
  const raw = `<g filter="url(#drop)"><path d="M0 0"/></g><defs><filter id="drop"/></defs>`;
  const stripped = stripSvgFilters(raw);

  assert.doesNotMatch(stripped, /<defs>/i);
  assert.doesNotMatch(stripped, /\sfilter=/i);
  assert.match(stripped, /<path d="M0 0"\/>/);
});

test("escapeHtml escapes reserved characters", () => {
  assert.equal(
    escapeHtml(`a&b<c>d"e'f`),
    "a&amp;b&lt;c&gt;d&quot;e&#39;f",
  );
});

test("buildMarkerShellHTML creates wrapper and inner icon", () => {
  const html = buildMarkerShellHTML({
    wrapperColor: "#16a34a",
    innerIconBody: `<path d="M1 1H2V2H1Z" fill="currentColor"/>`,
    innerIconViewBox: "0 0 16 16",
    innerIconColor: "#ffffff",
    title: "강남역 <11번>",
  });

  assert.match(html, /data-marker-shell="true"/);
  assert.match(html, /#16a34a/);
  assert.match(html, /#ffffff/);
  assert.match(html, /&lt;11번&gt;/);
  assert.doesNotMatch(html, /<11번>/);
});
