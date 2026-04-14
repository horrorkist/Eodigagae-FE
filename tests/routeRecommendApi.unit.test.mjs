import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRouteRecommendResponse,
  getUpstreamRouteRecommendError,
  mapUpstreamRouteToRecommendation,
  normalizeUpstreamRoutes,
  parseRouteRecommendRequest,
} from "../lib/strollRouteRecommend.ts";

const RAW_ROUTE = {
  strollId: "550e8400-e29b-41d4-a716-446655440000",
  strollName: "추천 경로 1",
  totalDistance: 3170,
  estimatedTime: 30,
  matchScore: 97.5,
  path: [
    { latitude: 37.5, longitude: 127.0 },
    { latitude: 37.5005, longitude: 127.0007 },
    { latitude: 37.501, longitude: 127.001 },
  ],
  waypoints: [
    {
      name: "중간 포인트",
      category: "park",
      latitude: 37.5005,
      longitude: 127.0007,
      sequence: 1,
    },
    {
      name: "두 번째 포인트",
      category: "park",
      latitude: 37.5008,
      longitude: 127.0009,
      sequence: 2,
    },
  ],
  navigationGuides: [
    {
      pointName: "삼성월드타워",
      description: "삼성월드타워아파트에서 좌회전",
      turnType: 1,
      latitude: 37.5172,
      longitude: 127.0473,
    },
  ],
};

test("parseRouteRecommendRequest validates request payload", () => {
  const parsed = parseRouteRecommendRequest({
    latitude: 37.5,
    longitude: 127.0,
    dogSize: "MEDIUM",
    dogAge: 24,
    walkingTime: 30,
    walkingDistance: 2.1,
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.deepEqual(parsed.value, {
    latitude: 37.5,
    longitude: 127.0,
    dogSize: "MEDIUM",
    dogAge: 24,
    walkingTime: 30,
    walkingDistance: 2.1,
  });
});

test("normalizeUpstreamRoutes accepts object and array payloads", () => {
  const single = normalizeUpstreamRoutes(RAW_ROUTE);
  const multi = normalizeUpstreamRoutes([RAW_ROUTE, RAW_ROUTE]);

  assert.equal(single?.length, 1);
  assert.equal(multi?.length, 2);
});

test("mapUpstreamRouteToRecommendation maps upstream route shape", () => {
  const recommendation = mapUpstreamRouteToRecommendation(RAW_ROUTE, 0);

  assert.ok(recommendation);
  assert.equal(recommendation?.id, RAW_ROUTE.strollId);
  assert.equal(recommendation?.title, RAW_ROUTE.strollName);
  assert.equal(recommendation?.displayLabel, "경로 1");
  assert.equal(recommendation?.source, "stroll-api");
  assert.equal(recommendation?.route.summary?.distance, 3170);
  assert.equal(recommendation?.route.summary?.duration, 1800);
  assert.deepEqual(recommendation?.route.path[0], [127.0, 37.5]);
  assert.equal(recommendation?.waypoint.title, "중간 포인트");
  assert.equal(recommendation?.waypoint.lat, 37.5005);
  assert.equal(recommendation?.waypoint.lng, 127.0007);
  assert.equal(recommendation?.waypoints.length, 2);
  assert.equal(recommendation?.waypoints[1].title, "두 번째 포인트");
  assert.equal(recommendation?.route.legs?.length, 3);
  assert.equal(recommendation?.route.waypoints?.length, 2);
  assert.deepEqual(recommendation?.route.waypoints?.[0].coordinate, [
    127.0007, 37.5005,
  ]);
  assert.deepEqual(recommendation?.route.waypoints?.[0].markerCoordinate, [
    127.0007, 37.5005,
  ]);
  assert.equal(recommendation?.route.waypoints?.[0].kind, "pivot");
  assert.equal(recommendation?.route.waypoints?.[0].facilityKind, null);
  assert.ok(recommendation?.route.waypoints?.[0].distanceAlongRouteM != null);
  assert.deepEqual(recommendation?.route.waypoints?.[1].coordinate, [
    127.0009, 37.5008,
  ]);
  assert.notDeepEqual(recommendation?.route.waypoints?.[1].markerCoordinate, [
    127.0009, 37.5008,
  ]);
  assert.equal(recommendation?.route.waypoints?.[1].kind, "pivot");
  assert.equal(recommendation?.route.waypoints?.[1].facilityKind, null);
  assert.ok(recommendation?.route.waypoints?.[1].distanceAlongRouteM != null);
  assert.equal(recommendation?.route.guidance?.[0].name, "삼성월드타워");
  assert.equal(
    recommendation?.route.guidance?.[0].description,
    "삼성월드타워아파트에서 좌회전",
  );
});

test("mapUpstreamRouteToRecommendation builds dog-walk legs from all non-start/end waypoints", () => {
  const recommendation = mapUpstreamRouteToRecommendation(
    {
      strollId: "pivot-only-legs",
      strollName: "왕복 산책",
      totalDistance: 1222,
      estimatedTime: 16,
      matchScore: 12.3,
      path: [
        { latitude: 37.566538006539915, longitude: 126.97801273225318 },
        { latitude: 37.56654633815694, longitude: 126.97797106914757 },
        { latitude: 37.5665352240526, longitude: 126.97773220234261 },
        { latitude: 37.56662965746631, longitude: 126.97772942214439 },
        { latitude: 37.56662965412794, longitude: 126.9775433279932 },
        { latitude: 37.56662965083942, longitude: 126.97736001136667 },
        { latitude: 37.566354683012555, longitude: 126.97737112924987 },
        { latitude: 37.56615470626619, longitude: 126.97737113491135 },
        { latitude: 37.56599639139177, longitude: 126.97737391691795 },
        { latitude: 37.56595750702441, longitude: 126.97737391801878 },
        { latitude: 37.565760309028185, longitude: 126.97744613924236 },
        { latitude: 37.56563254620645, longitude: 126.97745169790863 },
        { latitude: 37.56524092522718, longitude: 126.97746004156923 },
        { latitude: 37.565229806489434, longitude: 126.97696286497161 },
        { latitude: 37.564957614871325, longitude: 126.9769045446593 },
        { latitude: 37.56502982007721, longitude: 126.97642403085088 },
        { latitude: 37.56506036869227, longitude: 126.97623515830996 },
        { latitude: 37.56533533532379, longitude: 126.97615737983611 },
        { latitude: 37.56554919889593, longitude: 126.97613237606022 },
        { latitude: 37.56578806090653, longitude: 126.97618236474207 },
        { latitude: 37.56584083274722, longitude: 126.97619347334675 },
        { latitude: 37.56589915959719, longitude: 126.97621013684346 },
        { latitude: 37.56598526114471, longitude: 126.97623513212784 },
        { latitude: 37.566224123553766, longitude: 126.97630734100665 },
        { latitude: 37.56623800938295, longitude: 126.97622679239883 },
        { latitude: 37.566324103257756, longitude: 126.97582404888814 },
        { latitude: 37.5663491000521, longitude: 126.97580738303265 },
        { latitude: 37.56634076738874, longitude: 126.97579071812068 },
        { latitude: 37.5663574268863, longitude: 126.9754990775615 },
        { latitude: 37.566385200836514, longitude: 126.97546574647953 },
        { latitude: 37.56639353125791, longitude: 126.97535742278264 },
        { latitude: 37.56642408017188, longitude: 126.97518521539 },
        { latitude: 37.566510178829695, longitude: 126.97504911424522 },
        { latitude: 37.56651295598557, longitude: 126.97503244901876 },
        { latitude: 37.566510178829695, longitude: 126.97504911424522 },
        { latitude: 37.56642408017188, longitude: 126.97518521539 },
        { latitude: 37.56639353125791, longitude: 126.97535742278264 },
        { latitude: 37.566385200836514, longitude: 126.97546574647953 },
        { latitude: 37.5663574268863, longitude: 126.9754990775615 },
        { latitude: 37.56634076738874, longitude: 126.97579071812068 },
        { latitude: 37.5663491000521, longitude: 126.97580738303265 },
        { latitude: 37.566324103257756, longitude: 126.97582404888814 },
        { latitude: 37.56623800938295, longitude: 126.97622679239883 },
        { latitude: 37.566224123553766, longitude: 126.97630734100665 },
        { latitude: 37.56598526114471, longitude: 126.97623513212784 },
        { latitude: 37.56589915959719, longitude: 126.97621013684346 },
        { latitude: 37.56584083274722, longitude: 126.97619347334675 },
        { latitude: 37.56578806090653, longitude: 126.97618236474207 },
        { latitude: 37.56554919889593, longitude: 126.97613237606022 },
        { latitude: 37.56533533532379, longitude: 126.97615737983611 },
        { latitude: 37.56506036869227, longitude: 126.97623515830996 },
        { latitude: 37.56502982007721, longitude: 126.97642403085088 },
        { latitude: 37.564957614871325, longitude: 126.9769045446593 },
        { latitude: 37.565229806489434, longitude: 126.97696286497161 },
        { latitude: 37.56524092522718, longitude: 126.97746004156923 },
        { latitude: 37.56563254620645, longitude: 126.97745169790863 },
        { latitude: 37.565760309028185, longitude: 126.97744613924236 },
        { latitude: 37.56595750702441, longitude: 126.97737391801878 },
        { latitude: 37.56599639139177, longitude: 126.97737391691795 },
        { latitude: 37.56615470626619, longitude: 126.97737113491135 },
        { latitude: 37.566354683012555, longitude: 126.97737112924987 },
        { latitude: 37.56662965083942, longitude: 126.97736001136667 },
        { latitude: 37.56662965412794, longitude: 126.9775433279932 },
        { latitude: 37.56662965746631, longitude: 126.97772942214439 },
        { latitude: 37.5665352240526, longitude: 126.97773220234261 },
        { latitude: 37.56654633815694, longitude: 126.97797106914757 },
        { latitude: 37.566538006539915, longitude: 126.97801273225318 },
      ],
      waypoints: [
        {
          name: "출발지",
          category: "START",
          latitude: 37.5665,
          longitude: 126.978,
          sequence: 0,
        },
        {
          name: "반환점",
          category: "PIVOT",
          latitude: 37.56649392980968,
          longitude: 126.9750295111956,
          sequence: 0,
        },
        {
          name: "도착지",
          category: "END",
          latitude: 37.5665,
          longitude: 126.978,
          sequence: 0,
        },
      ],
      navigationGuides: [],
    },
    0,
  );

  assert.ok(recommendation);
  assert.deepEqual(
    recommendation?.waypoints.map((waypoint) => waypoint.title),
    ["출발지", "반환점", "도착지"],
  );
  assert.equal(recommendation?.route.waypoints?.length, 3);
  assert.equal(recommendation?.route.waypoints?.[0].kind, "start");
  assert.deepEqual(recommendation?.route.waypoints?.[0].coordinate, [
    126.978, 37.5665,
  ]);
  assert.deepEqual(recommendation?.route.waypoints?.[0].markerCoordinate, [
    126.978, 37.5665,
  ]);
  assert.ok(recommendation?.route.waypoints?.[0].distanceAlongRouteM != null);
  assert.equal(recommendation?.route.waypoints?.[1].kind, "pivot");
  assert.deepEqual(recommendation?.route.waypoints?.[1].coordinate, [
    126.9750295111956, 37.56649392980968,
  ]);
  assert.notDeepEqual(recommendation?.route.waypoints?.[1].markerCoordinate, [
    126.9750295111956, 37.56649392980968,
  ]);
  assert.ok(recommendation?.route.waypoints?.[1].distanceAlongRouteM != null);
  assert.equal(recommendation?.route.waypoints?.[2].kind, "end");
  assert.deepEqual(recommendation?.route.waypoints?.[2].coordinate, [
    126.978, 37.5665,
  ]);
  assert.deepEqual(recommendation?.route.waypoints?.[2].markerCoordinate, [
    126.978, 37.5665,
  ]);
  assert.ok(recommendation?.route.waypoints?.[2].distanceAlongRouteM != null);
  assert.equal(recommendation?.waypoint.title, "반환점");
  assert.equal(recommendation?.route.legs?.length, 2);
});

test("mapUpstreamRouteToRecommendation snaps all non-start/end waypoints onto the path", () => {
  const recommendation = mapUpstreamRouteToRecommendation(
    {
      strollId: "facility-waypoints",
      strollName: "시설 산책",
      totalDistance: 500,
      estimatedTime: 8,
      matchScore: 33,
      path: [
        { latitude: 37.5, longitude: 127.0 },
        { latitude: 37.5, longitude: 127.001 },
        { latitude: 37.5, longitude: 127.002 },
        { latitude: 37.5, longitude: 127.003 },
        { latitude: 37.5, longitude: 127.004 },
      ],
      waypoints: [
        {
          name: "출발지",
          category: "START",
          latitude: 37.5,
          longitude: 127.0,
          sequence: 0,
        },
        {
          name: "반환점",
          category: "PIVOT",
          latitude: 37.5002,
          longitude: 127.0014,
          sequence: 0,
        },
        {
          name: "쓰레기통",
          category: "TRASH_BIN",
          latitude: 37.5003,
          longitude: 127.0025,
          sequence: 0,
        },
        {
          name: "음수대",
          category: "FOUNTAIN",
          latitude: 37.5004,
          longitude: 127.0035,
          sequence: 0,
        },
        {
          name: "도착지",
          category: "END",
          latitude: 37.5,
          longitude: 127.004,
          sequence: 0,
        },
      ],
      navigationGuides: [],
    },
    0,
  );

  assert.ok(recommendation);
  assert.equal(recommendation?.route.waypoints?.[1].kind, "pivot");
  assert.equal(recommendation?.route.waypoints?.[1].facilityKind, null);
  assert.notDeepEqual(recommendation?.route.waypoints?.[1].markerCoordinate, [
    127.0014, 37.5002,
  ]);
  assert.equal(recommendation?.route.waypoints?.[2].kind, "pivot");
  assert.equal(recommendation?.route.waypoints?.[2].facilityKind, "trash-bin");
  assert.notDeepEqual(recommendation?.route.waypoints?.[2].markerCoordinate, [
    127.0025, 37.5003,
  ]);
  assert.equal(recommendation?.route.waypoints?.[3].kind, "pivot");
  assert.equal(recommendation?.route.waypoints?.[3].facilityKind, "fountain");
  assert.notDeepEqual(recommendation?.route.waypoints?.[3].markerCoordinate, [
    127.0035, 37.5004,
  ]);
  assert.ok(recommendation?.route.waypoints?.[2].distanceAlongRouteM != null);
  assert.ok(recommendation?.route.waypoints?.[3].distanceAlongRouteM != null);
  assert.equal(recommendation?.route.legs?.length, 4);
});

test("buildRouteRecommendResponse fills minimal meta from request", () => {
  const response = buildRouteRecommendResponse([RAW_ROUTE], {
    latitude: 37.5,
    longitude: 127.0,
    dogSize: "SMALL",
    dogAge: 12,
    walkingDistance: 2.5,
  });

  assert.ok(response);
  assert.deepEqual(response?.meta, {
    poiCount: 0,
    candidateCount: 1,
    shortlistCount: 1,
    validatedCount: 1,
    temperature: 0,
    targetMinKm: 2.5,
    targetMaxKm: 2.5,
  });
});

test("buildRouteRecommendResponse returns null for invalid upstream shape", () => {
  const response = buildRouteRecommendResponse(
    [
      {
        strollId: "route-1",
        strollName: "broken",
        totalDistance: 1000,
        estimatedTime: 10,
        path: [{ latitude: 37.5 }],
      },
    ],
    {
      latitude: 37.5,
      longitude: 127.0,
      dogSize: "MEDIUM",
      dogAge: 24,
    },
  );

  assert.equal(response, null);
});

test("getUpstreamRouteRecommendError prefers upstream message", () => {
  assert.equal(
    getUpstreamRouteRecommendError({ message: "upstream failed" }, 500),
    "upstream failed",
  );
  assert.equal(
    getUpstreamRouteRecommendError(null, 500),
    "추천 경로 요청에 실패했어요. (HTTP 500)",
  );
});
