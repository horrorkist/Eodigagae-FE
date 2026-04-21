import assert from "node:assert/strict";
import test from "node:test";

import { buildRouteMarkerHTML } from "../lib/routeMarker.ts";

test("buildRouteMarkerHTML renders start marker with pin-start icon", () => {
  const html = buildRouteMarkerHTML({
    variant: "start",
    title: `출발지 <시청>`,
  });

  assert.match(html, /data-route-marker="true"/);
  assert.match(html, /0 0 55 61/);
  assert.match(html, /translate\(-27\.5px,-48\.5px\)/);
  assert.match(html, /var\(--color-dg-green-500\)/);
  assert.match(html, /&lt;시청&gt;/);
  assert.doesNotMatch(html, /<시청>/);
  assert.match(html, /M26\.9868 24\.1519H21\.4288/);
});

test("buildRouteMarkerHTML renders destination marker with pin-end icon", () => {
  const html = buildRouteMarkerHTML({
    variant: "destination",
    title: "도착지",
  });

  assert.match(html, /data-route-marker="true"/);
  assert.match(html, /0 0 55 61/);
  assert.match(html, /var\(--color-dg-red-sub\)/);
  assert.match(html, /M25\.6056 24\.5663H21\.4288/);
});
