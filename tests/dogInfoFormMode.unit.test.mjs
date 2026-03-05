import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveDogInfoFormSubmitLabel,
  shouldRequestRouteRecommendation,
} from "../components/dog-form/mode.ts";

test("shouldRequestRouteRecommendation returns true only for route mode", () => {
  assert.equal(shouldRequestRouteRecommendation("route"), true);
  assert.equal(shouldRequestRouteRecommendation("profile"), false);
});

test("resolveDogInfoFormSubmitLabel uses explicit label first", () => {
  assert.equal(resolveDogInfoFormSubmitLabel("route", "저장"), "저장");
  assert.equal(resolveDogInfoFormSubmitLabel("profile", "수정"), "수정");
});

test("resolveDogInfoFormSubmitLabel returns mode defaults", () => {
  assert.equal(resolveDogInfoFormSubmitLabel("route"), "경로 추천");
  assert.equal(resolveDogInfoFormSubmitLabel("profile"), "저장");
});
