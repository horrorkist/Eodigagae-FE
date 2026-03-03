import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeAndSortHomePois,
  normalizeFountainsToHomeList,
  normalizePetPoisToHomeList,
  normalizeTrashBinsToHomeList,
} from "../lib/homePoiNormalizer.ts";

function createPetPoi(overrides = {}) {
  return {
    contentid: "pet-1",
    contenttypeid: "39",
    title: "반려 식당",
    addr1: "서울시 강남구",
    addr2: "",
    zipcode: "",
    tel: "02-000-0000",
    mapx: "127.001",
    mapy: "37.501",
    mlevel: "",
    dist: "0",
    areacode: "",
    sigungucode: "",
    cat1: "",
    cat2: "",
    cat3: "",
    firstimage: "",
    firstimage2: "",
    cpyrhtDivCd: "",
    createdtime: "",
    modifiedtime: "",
    lDongRegnCd: "",
    lDongSignguCd: "",
    lclsSystm1: "",
    lclsSystm2: "",
    lclsSystm3: "",
    ...overrides,
  };
}

test("normalizePetPoisToHomeList normalizes petpoi shape", () => {
  const items = normalizePetPoisToHomeList(
    [createPetPoi()],
    { lat: 37.5, lng: 127.0 },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].source, "kto");
  assert.equal(items[0].title, "반려 식당");
  assert.equal(items[0].category, "음식점");
  assert.ok(items[0].distanceM != null);
});

test("normalizeFountainsToHomeList filters invalid coordinates", () => {
  const items = normalizeFountainsToHomeList(
    [
      {
        fountainName: "공원 음수대",
        address: "서울시 동작구",
        latitude: 37.4952,
        longitude: 126.9179,
        managedBy: "동작구청",
      },
      {
        fountainName: "오류 음수대",
        address: "서울시",
        latitude: Number.NaN,
        longitude: 126.9,
        managedBy: "",
      },
    ],
    { lat: 37.5, lng: 127.0 },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].source, "fountain");
  assert.equal(items[0].category, "음수대");
});

test("normalizeTrashBinsToHomeList normalizes and filters invalid rows", () => {
  const items = normalizeTrashBinsToHomeList(
    [
      {
        cityName: "강남구",
        address: "서울특별시 강남구 강남대로 396",
        locationDesc: "강남역 11번 출구 앞",
        latitude: 37.4979,
        longitude: 127.0276,
        binType: "일반쓰레기",
      },
      {
        cityName: "강남구",
        address: "",
        locationDesc: "",
        latitude: 37.5,
        longitude: Number.NaN,
        binType: "",
      },
    ],
    { lat: 37.5, lng: 127.0 },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].source, "trash-bin");
  assert.equal(items[0].category, "쓰레기통");
});

test("mergeAndSortHomePois respects enabled sources and distance ordering", () => {
  const merged = mergeAndSortHomePois({
    petPois: [
      createPetPoi({
        contentid: "pet-a",
        title: "A",
        mapy: "37.5001",
        mapx: "127.0001",
      }),
    ],
    fountains: [
      {
        fountainName: "B",
        address: "서울시",
        latitude: 37.5002,
        longitude: 127.0002,
        managedBy: "",
      },
    ],
    trashBins: [
      {
        cityName: "강남구",
        address: "서울시",
        locationDesc: "C",
        latitude: 37.5003,
        longitude: 127.0003,
        binType: "일반",
      },
    ],
    enabledSources: {
      kto: true,
      fountain: true,
      "trash-bin": false,
    },
    referencePos: { lat: 37.5, lng: 127.0 },
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].source, "kto");
  assert.equal(merged[1].source, "fountain");
});

test("mergeAndSortHomePois sets null distance when referencePos is missing", () => {
  const merged = mergeAndSortHomePois({
    petPois: [createPetPoi()],
    fountains: [],
    trashBins: [],
    enabledSources: {
      kto: true,
    },
    referencePos: null,
  });

  assert.equal(merged.length, 1);
  assert.equal(merged[0].distanceM, null);
});

test("mergeAndSortHomePois guarantees unique ids even when source ids collide", () => {
  const merged = mergeAndSortHomePois({
    petPois: [],
    fountains: [],
    trashBins: [
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
    ],
    enabledSources: {
      "trash-bin": true,
    },
    referencePos: { lat: 37.5, lng: 127.0 },
  });

  assert.equal(merged.length, 2);
  assert.notEqual(merged[0].id, merged[1].id);
});
