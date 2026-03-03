import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClusterBadgeHTML,
  CLUSTER_MAX_ZOOM,
  CLUSTER_MIN_SIZE,
  createOrUpdateClusterer,
} from "../lib/naverMarkerCluster.ts";

test("buildClusterBadgeHTML renders source color and count", () => {
  const html = buildClusterBadgeHTML("fountain", 12);

  assert.match(html, /data-source="fountain"/);
  assert.match(html, /background:#3b82f6/);
  assert.match(html, />12<\/div>/);
});

test("createOrUpdateClusterer returns null when plugin ctor is missing", () => {
  const originalWindow = globalThis.window;
  globalThis.window = {};

  try {
    const ref = { current: null };
    const clusterer = createOrUpdateClusterer({
      clustererRef: ref,
      map: /** @type {any} */ ({}),
      markers: [],
      source: "kto",
    });

    assert.equal(clusterer, null);
    assert.equal(ref.current, null);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("createOrUpdateClusterer creates clusterer with fixed options", () => {
  const originalWindow = globalThis.window;

  class FakeClusterer {
    constructor(options) {
      this.options = options;
      this.map = options.map;
      this.markers = options.markers ?? [];
    }

    setMap(map) {
      this.map = map;
    }

    setMarkers(markers) {
      this.markers = markers;
    }

    clear() {
      this.markers = [];
    }

    addMarkers(markers) {
      this.markers.push(...markers);
    }

    redraw() {}
  }

  globalThis.window = { MarkerClustering: FakeClusterer };

  try {
    const ref = { current: null };
    const map = /** @type {any} */ ({ name: "map" });
    const markers = [/** @type {any} */ ({ id: 1 })];

    const clusterer = createOrUpdateClusterer({
      clustererRef: ref,
      map,
      markers,
      source: "trash-bin",
      zIndex: 999,
    });

    assert.ok(clusterer);
    assert.equal(ref.current, clusterer);
    assert.equal(clusterer.options.minClusterSize, CLUSTER_MIN_SIZE);
    assert.equal(clusterer.options.maxZoom, CLUSTER_MAX_ZOOM);
    assert.equal(clusterer.options.zIndex, 999);
    assert.equal(clusterer.options.source, "trash-bin");
  } finally {
    globalThis.window = originalWindow;
  }
});

test("createOrUpdateClusterer disposes existing clusterer when markers become empty", () => {
  const originalWindow = globalThis.window;

  class FakeClusterer {
    constructor() {
      this.clearCalled = 0;
      this.setMarkersArgs = [];
      this.setMapArgs = [];
    }

    setMap(map) {
      this.setMapArgs.push(map);
    }

    setMarkers(markers) {
      this.setMarkersArgs.push(markers);
    }

    clear() {
      this.clearCalled += 1;
    }
  }

  globalThis.window = { MarkerClustering: FakeClusterer };

  try {
    const existing = new FakeClusterer();
    const ref = { current: existing };
    const clusterer = createOrUpdateClusterer({
      clustererRef: ref,
      map: /** @type {any} */ ({ name: "map" }),
      markers: [],
      source: "kto",
    });

    assert.equal(clusterer, null);
    assert.equal(ref.current, null);
    assert.equal(existing.clearCalled, 1);
    assert.deepEqual(existing.setMarkersArgs, [[]]);
    assert.deepEqual(existing.setMapArgs, [null]);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("createOrUpdateClusterer disposes existing clusterer when ctor is missing", () => {
  const originalWindow = globalThis.window;

  class FakeClusterer {
    constructor() {
      this.clearCalled = 0;
      this.setMarkersArgs = [];
      this.setMapArgs = [];
    }

    setMap(map) {
      this.setMapArgs.push(map);
    }

    setMarkers(markers) {
      this.setMarkersArgs.push(markers);
    }

    clear() {
      this.clearCalled += 1;
    }
  }

  const existing = new FakeClusterer();
  globalThis.window = {};

  try {
    const ref = { current: existing };
    const clusterer = createOrUpdateClusterer({
      clustererRef: ref,
      map: /** @type {any} */ ({ name: "map" }),
      markers: [/** @type {any} */ ({ id: 1 })],
      source: "tmap",
    });

    assert.equal(clusterer, null);
    assert.equal(ref.current, null);
    assert.equal(existing.clearCalled, 1);
    assert.deepEqual(existing.setMarkersArgs, [[]]);
    assert.deepEqual(existing.setMapArgs, [null]);
  } finally {
    globalThis.window = originalWindow;
  }
});
