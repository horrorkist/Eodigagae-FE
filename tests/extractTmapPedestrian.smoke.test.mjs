import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { extractTmapPedestrian } from "../lib/extractTmapPedestrian.ts";

const FIXTURE_DIR = path.resolve("tests/fixtures");

async function readFixture(name) {
  const raw = await readFile(path.join(FIXTURE_DIR, name), "utf-8");
  return JSON.parse(raw);
}

test("extractTmapPedestrian parses deterministic success fixture", async () => {
  const fixture = await readFixture("tmap-pedestrian.success.json");
  const route = extractTmapPedestrian(fixture);

  assert.equal(route.summary?.distance, 1234);
  assert.equal(route.summary?.duration, 456000);
  assert.equal(route.path.length, 6);
  assert.equal(route.guidance?.length, 3);
  assert.equal(route.segments?.length, 2);

  assert.equal(route.endpoints?.start?.pointType, "SP");
  assert.equal(route.endpoints?.end?.pointType, "EP");

  assert.deepEqual(route.featureStats, {
    totalFeatures: 5,
    pointFeatures: 3,
    lineFeatures: 2,
  });
});

test("extractTmapPedestrian throws for points-only payload", async () => {
  const fixture = await readFixture("tmap-pedestrian.points-only.json");

  assert.throws(() => extractTmapPedestrian(fixture), {
    message: "TMAP 도보 응답은 받았지만 경로 선분(LineString)을 찾지 못했어요.",
  });
});
