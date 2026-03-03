import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeFountainItems,
  normalizeTrashBinItems,
} from "../services/facilities.ts";

test("normalizeFountainItems parses valid fountain rows", () => {
  const rows = normalizeFountainItems([
    {
      fountainName: "보라매공원 음수대",
      address: "서울특별시 동작구 여의대방로20길 33",
      latitude: 37.4952,
      longitude: 126.9179,
      managedBy: "동작구청",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].fountainName, "보라매공원 음수대");
  assert.equal(rows[0].managedBy, "동작구청");
});

test("normalizeFountainItems excludes malformed rows", () => {
  const rows = normalizeFountainItems([
    {
      fountainName: "",
      address: "서울특별시 동작구",
      latitude: 37.4952,
      longitude: 126.9179,
      managedBy: "동작구청",
    },
    {
      fountainName: "정상 음수대",
      address: "서울특별시 동작구",
      latitude: 37.4952,
      longitude: 126.9179,
      managedBy: "동작구청",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].fountainName, "정상 음수대");
});

test("normalizeFountainItems deduplicates identical rows", () => {
  const rows = normalizeFountainItems([
    {
      fountainName: "보라매공원 음수대",
      address: "서울특별시 동작구 여의대방로20길 33",
      latitude: 37.4952,
      longitude: 126.9179,
      managedBy: "동작구청",
    },
    {
      fountainName: "보라매공원 음수대",
      address: "서울특별시 동작구 여의대방로20길 33",
      latitude: 37.4952,
      longitude: 126.9179,
      managedBy: "동작구청",
    },
  ]);

  assert.equal(rows.length, 1);
});

test("normalizeTrashBinItems parses and trims trash-bin rows", () => {
  const rows = normalizeTrashBinItems([
    {
      cityName: " 강남구 ",
      address: " 서울특별시 강남구 강남대로 396 ",
      locationDesc: " 강남역 11번 출구 앞 ",
      latitude: 37.4979,
      longitude: 127.0276,
      binType: " 일반쓰레기 ",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].cityName, "강남구");
  assert.equal(rows[0].binType, "일반쓰레기");
});

test("normalizeTrashBinItems excludes rows without required fields", () => {
  const rows = normalizeTrashBinItems([
    {
      cityName: "강남구",
      address: "",
      locationDesc: "",
      latitude: 37.4979,
      longitude: 127.0276,
      binType: "일반쓰레기",
    },
    {
      cityName: "강남구",
      address: "서울특별시 강남구 강남대로 396",
      locationDesc: "강남역 11번 출구 앞",
      latitude: 37.4979,
      longitude: 127.0276,
      binType: "일반쓰레기",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].address, "서울특별시 강남구 강남대로 396");
});

test("normalizeTrashBinItems deduplicates identical rows", () => {
  const rows = normalizeTrashBinItems([
    {
      cityName: "서초구",
      address: "동작대로 113-3",
      locationDesc: "태평백화점 앞",
      latitude: 37.4851,
      longitude: 126.9822,
      binType: "재활용쓰레기",
    },
    {
      cityName: "서초구",
      address: "동작대로 113-3",
      locationDesc: "태평백화점 앞",
      latitude: 37.4851,
      longitude: 126.9822,
      binType: "재활용쓰레기",
    },
  ]);

  assert.equal(rows.length, 1);
});
