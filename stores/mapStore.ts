import { create } from "zustand";

export type LatLng = { lat: number; lng: number };

export type RouteSummary = {
  distance?: number; // meters
  duration?: number; // ms (응답 따라 단위 다를 수 있음)
};

export type RouteResult = {
  summary?: RouteSummary;
  path: [number, number][]; // [[lng,lat], ...]
};

type MapState = {
  myPos: LatLng | null;
  pickedPos: LatLng | null;

  route: RouteResult | null;
  routeLoading: boolean;
  routeError: string | null;

  drawRoute: boolean;

  setMyPos: (p: LatLng | null) => void;
  setPickedPos: (p: LatLng | null) => void;
  clearPicked: () => void;

  requestRoute: () => Promise<void>;
  requestTmapWalkRoute: () => Promise<void>;

  setDrawRoute: (v: boolean) => void;
  clearRoute: () => void;

  cmd: MapCommand | null;
  emitCmd: (cmd: MapCommand) => void;
  clearCmd: () => void;
};

type MapCommand =
  | { type: "REQUEST_MY_LOCATION" }
  | {
      type: "MOVE_TO";
      pos: { lat: number; lng: number };
      zoom?: number;
      animate?: boolean;
    };

function extractTmapPedestrian(data: any): RouteResult {
  // TMAP 보행자 경로는 보통 GeoJSON 형태로 features 배열이 오고,
  // LineString의 coordinates가 [[lng,lat], ...] 형태로 들어있음.
  const features: any[] = Array.isArray(data?.features) ? data.features : [];

  const path: [number, number][] = [];
  let distance: number | undefined;
  let duration: number | undefined;

  for (const f of features) {
    const g = f?.geometry;
    const props = f?.properties;

    // 요약값은 FeatureCollection의 첫 feature(props) 혹은 별도 필드에 있을 수 있어서
    // 최초로 발견한 값을 채택
    if (distance == null) {
      const d =
        props?.totalDistance ??
        props?.distance ??
        data?.totalDistance ??
        data?.distance;
      if (typeof d === "number") distance = d;
    }

    if (duration == null) {
      const t =
        props?.totalTime ??
        props?.duration ??
        data?.totalTime ??
        data?.duration;
      if (typeof t === "number") {
        // TMAP은 보통 초(sec) 단위로 오는 경우가 많아서,
        // 여기서는 "초로 오면 ms로 바꿔" 같은 확정 변환을 하지 않고 그대로 둠.
        // 필요하면 여기서 ms 변환 규칙을 확정해도 됨.
        duration = t;
      }
    }

    if (g?.type === "LineString" && Array.isArray(g?.coordinates)) {
      for (const c of g.coordinates) {
        // coordinate: [lng,lat]
        const lng = c?.[0];
        const lat = c?.[1];
        if (typeof lng === "number" && typeof lat === "number") {
          path.push([lng, lat]);
        }
      }
    }
  }

  if (path.length === 0) {
    throw new Error("TMAP 도보 경로 좌표를 파싱하지 못했어요.");
  }

  return { summary: { distance, duration }, path };
}

export const useMapStore = create<MapState>((set, get) => ({
  myPos: null,
  pickedPos: null,

  route: null,
  routeLoading: false,
  routeError: null,

  drawRoute: false,

  setMyPos: (p) => set({ myPos: p }),
  setPickedPos: (p) => set({ pickedPos: p }),
  clearPicked: () => set({ pickedPos: null }),

  requestRoute: async () => {
    const { myPos, pickedPos } = get();

    if (!myPos || !pickedPos) {
      set({
        routeError: "출발/도착 좌표가 필요해요.",
        route: null,
        drawRoute: false,
      });
      return;
    }

    set({ routeLoading: true, routeError: null });

    try {
      const start = `${myPos.lng},${myPos.lat}`;
      const goal = `${pickedPos.lng},${pickedPos.lat}`;

      const res = await fetch(
        `/api/directions?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}&option=traoptimal`,
        { method: "GET" },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "경로 요청 실패");
      }

      if (!Array.isArray(data?.path) || data.path.length === 0) {
        throw new Error("경로 데이터가 비어있어요.");
      }

      set({
        route: { summary: data.summary, path: data.path },
        routeLoading: false,
        routeError: null,
        // 요청만 하고 그리기는 버튼으로!
        drawRoute: false,
      });
    } catch (e: any) {
      set({
        route: null,
        routeLoading: false,
        routeError: e?.message ?? "알 수 없는 오류",
        drawRoute: false,
      });
    }
  },

  requestTmapWalkRoute: async () => {
    const { myPos, pickedPos } = get();

    if (!myPos || !pickedPos) {
      set({
        routeError: "출발/도착 좌표가 필요해요.",
        route: null,
        drawRoute: false,
      });
      return;
    }

    set({ routeLoading: true, routeError: null });

    try {
      // 서버 프록시(API Route)로 보냄: AppKey는 서버에서만 처리
      const res = await fetch("/api/tmap/pedestrian", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startX: myPos.lng,
          startY: myPos.lat,
          endX: pickedPos.lng,
          endY: pickedPos.lat,
          // 필요하면 옵션 추가:
          // reqCoordType: "WGS84GEO",
          // resCoordType: "WGS84GEO",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "TMAP 도보 경로 요청 실패");
      }

      const parsed = extractTmapPedestrian(data);

      set({
        route: parsed,
        routeLoading: false,
        routeError: null,
        drawRoute: false, // 요청만 하고 그리기는 버튼으로!
      });
    } catch (e: any) {
      set({
        route: null,
        routeLoading: false,
        routeError: e?.message ?? "알 수 없는 오류",
        drawRoute: false,
      });
    }
  },

  setDrawRoute: (v) => set({ drawRoute: v }),

  clearRoute: () => set({ route: null, routeError: null, drawRoute: false }),
  cmd: null,
  emitCmd: (cmd) => set({ cmd }),
  clearCmd: () => set({ cmd: null }),
}));
