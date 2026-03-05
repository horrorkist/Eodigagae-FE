import assert from "node:assert/strict";
import test from "node:test";

import { getNoticeById, listNotices } from "../lib/mock/notices.ts";

test("listNotices returns notices sorted by publishedAt desc", () => {
  const notices = listNotices();
  assert.ok(notices.length >= 2);

  for (let i = 0; i < notices.length - 1; i += 1) {
    assert.ok(notices[i].publishedAt >= notices[i + 1].publishedAt);
  }
});

test("getNoticeById returns notice for valid id", () => {
  const firstNotice = listNotices()[0];
  const notice = getNoticeById(firstNotice.id);
  assert.ok(notice);
  assert.equal(notice?.id, firstNotice.id);
});

test("getNoticeById returns null for unknown id", () => {
  const notice = getNoticeById("not-found-id");
  assert.equal(notice, null);
});
