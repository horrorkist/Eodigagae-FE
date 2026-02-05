// types/mapEvents.ts
export type LatLng = { lat: number; lng: number };

export type PetPoiItem = {
  contentid: string;
  title: string;
  addr1?: string;
  tel?: string;
  mapx: string; // lng
  mapy: string; // lat
};

export type MapCmd =
  | { type: "REQUEST_MY_LOCATION" }
  | { type: "MOVE_TO"; pos: LatLng; zoom?: number; animate?: boolean }
  | { type: "CLEAR_PICKED" }
  // ✅ petpois 관련 pubsub
  | { type: "PETPOI_TOGGLE"; on: boolean }
  | { type: "PETPOI_REFRESH" }
  | { type: "PETPOI_RESULT"; items: PetPoiItem[]; key: string; ts: number }
  | { type: "PETPOI_ERROR"; message: string; key: string; ts: number }
  | { type: "MOVE_MY_MARKER_READY" }
  | { type: "MOVE_MY_MARKER_CANCELLED" }
  | { type: "MY_MARKER_MOVED" };
