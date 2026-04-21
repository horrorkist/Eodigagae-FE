"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildFacilityPinMarkerHTML } from "@/lib/facilityMarker";
import { buildClusterBadgeHTML } from "@/lib/naverMarkerCluster";
import { buildLabelMarkerHTML, buildPinMarkerHTML } from "@/lib/poiMarker";
import { buildRouteMarkerHTML } from "@/lib/routeMarker";
import { buildSearchResultMarkerHTML } from "@/lib/searchResultMarker";

type PreviewItem = {
  key: string;
  label: string;
  note: string;
  previews: string[];
  overlays: Array<{
    key: string;
    html: string;
    lat: number;
    lng: number;
    zIndex?: number;
    clickable?: boolean;
    title?: string;
  }>;
};

type PreviewGroup = {
  key: string;
  title: string;
  note: string;
  items: PreviewItem[];
};

const MAP_CENTER = { lat: 37.5665, lng: 126.978 };

function offsetPosition(eastM: number, northM: number) {
  const latDelta = northM / 111_320;
  const lngDelta =
    eastM /
    (111_320 * Math.max(0.2, Math.cos((MAP_CENTER.lat * Math.PI) / 180)));

  return {
    lat: MAP_CENTER.lat + latDelta,
    lng: MAP_CENTER.lng + lngDelta,
  };
}

function buildGroups(): PreviewGroup[] {
  const petPoiSamples = [
    { key: "12", label: "관광지", title: "남산 산책로", eastM: -315 },
    { key: "14", label: "문화시설", title: "시립 미술관", eastM: -225 },
    { key: "15", label: "축제·행사", title: "주말 펫 페어", eastM: -135 },
    { key: "28", label: "레포츠", title: "한강 러닝존", eastM: -45 },
    { key: "32", label: "숙박", title: "펫 프렌들리 호텔", eastM: 45 },
    { key: "38", label: "쇼핑", title: "반려용품 편집숍", eastM: 135 },
    { key: "39", label: "음식점", title: "테라스 식당", eastM: 225 },
    { key: "etc", label: "기타", title: "커뮤니티 공간", eastM: 315 },
  ];

  const petPoiItems: PreviewItem[] = petPoiSamples.map((sample) => {
    const contentTypeId = sample.key === "etc" ? "999" : sample.key;
    const position = offsetPosition(sample.eastM, 280);

    return {
      key: `pet-${sample.key}`,
      label: sample.label,
      note: contentTypeId === "999" ? "기본 fallback 스타일" : sample.title,
      previews: [
        buildPinMarkerHTML(contentTypeId),
        buildLabelMarkerHTML(sample.title, contentTypeId),
      ],
      overlays: [
        {
          key: `pet-pin-${sample.key}`,
          html: buildPinMarkerHTML(contentTypeId),
          lat: position.lat,
          lng: position.lng,
          zIndex: 1100,
          title: sample.title,
        },
        {
          key: `pet-label-${sample.key}`,
          html: buildLabelMarkerHTML(sample.title, contentTypeId),
          lat: position.lat,
          lng: position.lng,
          zIndex: 1200,
          clickable: false,
        },
      ],
    };
  });

  const facilityItems: PreviewItem[] = [
    {
      key: "facility-fountain",
      label: "음수대",
      note: "홈 시설 POI / 경유 시설 마커",
      previews: [buildFacilityPinMarkerHTML("fountain", "음수대")],
      overlays: [
        {
          key: "facility-fountain-overlay",
          html: buildFacilityPinMarkerHTML("fountain", "음수대"),
          zIndex: 1100,
          ...offsetPosition(-80, 120),
        },
      ],
    },
    {
      key: "facility-trash",
      label: "배변봉투함",
      note: "홈 시설 POI / 경유 시설 마커",
      previews: [buildFacilityPinMarkerHTML("trash-bin", "배변봉투함")],
      overlays: [
        {
          key: "facility-trash-overlay",
          html: buildFacilityPinMarkerHTML("trash-bin", "배변봉투함"),
          zIndex: 1100,
          ...offsetPosition(80, 120),
        },
      ],
    },
  ];

  const searchItems: PreviewItem[] = [
    {
      key: "search-result",
      label: "검색 결과",
      note: "TMAP 검색 결과 마커",
      previews: [buildSearchResultMarkerHTML("검색 결과")],
      overlays: [
        {
          key: "search-result-overlay",
          html: buildSearchResultMarkerHTML("검색 결과"),
          zIndex: 1100,
          ...offsetPosition(0, -10),
        },
      ],
    },
  ];

  const routeItems: PreviewItem[] = [
    {
      key: "route-start",
      label: "출발지",
      note: "산책 시작",
      previews: [buildRouteMarkerHTML({ variant: "start", title: "출발지" })],
      overlays: [
        {
          key: "route-start-overlay",
          html: buildRouteMarkerHTML({ variant: "start", title: "출발지" }),
          zIndex: 1100,
          clickable: false,
          ...offsetPosition(-250, -165),
        },
      ],
    },
    {
      key: "route-pivot-1",
      label: "경유지 1",
      note: "숫자 피벗 마커",
      previews: [
        buildRouteMarkerHTML({
          variant: "pivot",
          title: "첫 번째 경유지",
          label: "1",
        }),
      ],
      overlays: [
        {
          key: "route-pivot-1-overlay",
          html: buildRouteMarkerHTML({
            variant: "pivot",
            title: "첫 번째 경유지",
            label: "1",
          }),
          zIndex: 1100,
          clickable: false,
          ...offsetPosition(-125, -165),
        },
      ],
    },
    {
      key: "route-facility-fountain",
      label: "경유 시설 - 음수대",
      note: "경로 waypoint",
      previews: [
        buildRouteMarkerHTML({
          variant: "facility",
          title: "음수대",
          facilitySource: "fountain",
        }),
      ],
      overlays: [
        {
          key: "route-facility-fountain-overlay",
          html: buildRouteMarkerHTML({
            variant: "facility",
            title: "음수대",
            facilitySource: "fountain",
          }),
          zIndex: 1100,
          clickable: false,
          ...offsetPosition(0, -165),
        },
      ],
    },
    {
      key: "route-facility-trash",
      label: "경유 시설 - 배변봉투함",
      note: "경로 waypoint",
      previews: [
        buildRouteMarkerHTML({
          variant: "facility",
          title: "배변봉투함",
          facilitySource: "trash-bin",
        }),
      ],
      overlays: [
        {
          key: "route-facility-trash-overlay",
          html: buildRouteMarkerHTML({
            variant: "facility",
            title: "배변봉투함",
            facilitySource: "trash-bin",
          }),
          zIndex: 1100,
          clickable: false,
          ...offsetPosition(125, -165),
        },
      ],
    },
    {
      key: "route-destination",
      label: "도착지",
      note: "산책 종료",
      previews: [
        buildRouteMarkerHTML({
          variant: "destination",
          title: "도착지",
        }),
      ],
      overlays: [
        {
          key: "route-destination-overlay",
          html: buildRouteMarkerHTML({
            variant: "destination",
            title: "도착지",
          }),
          zIndex: 1100,
          clickable: false,
          ...offsetPosition(250, -165),
        },
      ],
    },
  ];

  const clusterItems: PreviewItem[] = [
    {
      key: "cluster-kto",
      label: "클러스터 - 반려동물 동반",
      note: "KTO POI",
      previews: [buildClusterBadgeHTML("kto", 12)],
      overlays: [
        {
          key: "cluster-kto-overlay",
          html: buildClusterBadgeHTML("kto", 12),
          zIndex: 1300,
          ...offsetPosition(-180, -330),
        },
      ],
    },
    {
      key: "cluster-fountain",
      label: "클러스터 - 음수대",
      note: "시설 POI",
      previews: [buildClusterBadgeHTML("fountain", 8)],
      overlays: [
        {
          key: "cluster-fountain-overlay",
          html: buildClusterBadgeHTML("fountain", 8),
          zIndex: 1300,
          ...offsetPosition(-60, -330),
        },
      ],
    },
    {
      key: "cluster-trash",
      label: "클러스터 - 배변봉투함",
      note: "시설 POI",
      previews: [buildClusterBadgeHTML("trash-bin", 16)],
      overlays: [
        {
          key: "cluster-trash-overlay",
          html: buildClusterBadgeHTML("trash-bin", 16),
          zIndex: 1300,
          ...offsetPosition(60, -330),
        },
      ],
    },
    {
      key: "cluster-search",
      label: "클러스터 - 검색 결과",
      note: "TMAP 검색",
      previews: [buildClusterBadgeHTML("tmap", 5)],
      overlays: [
        {
          key: "cluster-search-overlay",
          html: buildClusterBadgeHTML("tmap", 5),
          zIndex: 1300,
          ...offsetPosition(180, -330),
        },
      ],
    },
  ];

  return [
    {
      key: "pet-poi",
      title: "반려동물 동반 POI",
      note: "카테고리별 핀과 라벨 조합",
      items: petPoiItems,
    },
    {
      key: "facilities",
      title: "시설 마커",
      note: "홈 시설 POI와 경로 경유 시설에서 공통 사용",
      items: facilityItems,
    },
    {
      key: "search",
      title: "검색 결과",
      note: "TMAP 검색 결과 전용",
      items: searchItems,
    },
    {
      key: "route",
      title: "경로 마커",
      note: "출발, 경유, 도착 상태별 변형",
      items: routeItems,
    },
    {
      key: "clusters",
      title: "클러스터 배지",
      note: "클러스터러가 묶일 때 보이는 뱃지",
      items: clusterItems,
    },
  ];
}

export default function MarkerDebugPage() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const groups = useMemo(() => buildGroups(), []);
  const naverMapKey = process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID;

  useEffect(() => {
    if (!sdkReady || !mapElementRef.current || !window.naver?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new window.naver.maps.Map(mapElementRef.current, {
        center: new window.naver.maps.LatLng(MAP_CENTER.lat, MAP_CENTER.lng),
        zoom: 15,
        minZoom: 13,
        scaleControl: false,
        mapDataControl: false,
        logoControlOptions: {
          position: window.naver.maps.Position.BOTTOM_LEFT,
        },
      });
    }

    for (const marker of markersRef.current) {
      marker.setMap(null);
    }
    markersRef.current = [];

    const map = mapRef.current;
    const positions: naver.maps.LatLng[] = [];

    for (const group of groups) {
      for (const item of group.items) {
        for (const overlay of item.overlays) {
          const position = new window.naver.maps.LatLng(overlay.lat, overlay.lng);
          positions.push(position);
          markersRef.current.push(
            new window.naver.maps.Marker({
              map,
              position,
              title: overlay.title ?? item.label,
              clickable: overlay.clickable ?? false,
              zIndex: overlay.zIndex ?? 1100,
              icon: {
                content: overlay.html,
                anchor: new window.naver.maps.Point(0, 0),
              },
            }),
          );
        }
      }
    }

    if (positions.length > 0) {
      map.fitBounds(positions, {
        top: 80,
        right: 40,
        bottom: 80,
        left: 40,
      });
    }

    return () => {
      for (const marker of markersRef.current) {
        marker.setMap(null);
      }
      markersRef.current = [];
    };
  }, [groups, sdkReady]);

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      {naverMapKey ? (
        <Script
          id="debug-marker-naver-sdk"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverMapKey}`}
          strategy="afterInteractive"
          onReady={() => {
            setSdkFailed(false);
            setSdkReady(true);
          }}
          onError={() => {
            setSdkReady(false);
            setSdkFailed(true);
          }}
        />
      ) : null}
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
            Debug
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">
            지도 마커 카탈로그
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-600">
            실제 지도 위 샘플 배치와 HTML 프리뷰를 같이 보여줍니다. 카테고리 추가나
            스타일 수정 뒤에 이 페이지에서 빠르게 비교하면 됩니다.
          </p>
        </div>
      </section>

      <section className="border-b border-black/10 bg-neutral-200/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  맵 프리뷰
                </h2>
                <p className="text-xs text-neutral-500">
                  서울 시청 기준 샘플 좌표에 정적으로 배치
                </p>
              </div>
              <div className="text-xs text-neutral-500">
                {sdkReady && !sdkFailed
                  ? "SDK ready"
                  : sdkFailed
                    ? "SDK load failed"
                    : naverMapKey
                      ? "SDK loading..."
                      : "SDK key missing"}
              </div>
            </div>
            <div className="relative h-[62vh] min-h-[420px] bg-[#dfe8d7]">
              <div ref={mapElementRef} className="h-full w-full" />
              {!naverMapKey ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/86 px-6 text-center">
                  <p className="max-w-md text-sm leading-6 text-neutral-700">
                    `NEXT_PUBLIC_NAVER_MAPS_KEY_ID`가 없어서 지도는 띄우지 못했어요.
                    아래 프리뷰 섹션에서는 마커 종류 자체는 계속 확인할 수 있습니다.
                  </p>
                </div>
              ) : null}
              {sdkFailed ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/86 px-6 text-center">
                  <p className="max-w-md text-sm leading-6 text-neutral-700">
                    Naver Maps SDK 로드에 실패했습니다. 네트워크 또는 키 설정을 확인해
                    주세요.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-neutral-900">
                {group.title}
              </h2>
              <p className="text-sm text-neutral-600">{group.note}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <article
                  key={item.key}
                  className="rounded-lg border border-black/10 bg-white p-4"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {item.label}
                    </h3>
                    <p className="text-xs leading-5 text-neutral-500">
                      {item.note}
                    </p>
                  </div>
                  <div className="mt-4 flex min-h-28 flex-wrap items-center gap-4 rounded-lg bg-neutral-100 px-4 py-5">
                    {item.previews.map((preview, index) => (
                      <div
                        key={`${item.key}-preview-${index}`}
                        className="flex min-w-24 items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: preview }}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
