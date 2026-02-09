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

export type MapChannel = "map" | "pet";

export type BaseEvent<C extends MapChannel, T extends string> = {
  channel: C;
  type: T;
  ts?: number;
};

/** MAP domain events */
export type MapEvents =
  | (BaseEvent<"map", "MOVE_TO"> & {
      pos: { lat: number; lng: number };
      zoom?: number;
      animate?: boolean;
    })
  | BaseEvent<"map", "REQUEST_MY_LOCATION">
  | BaseEvent<"map", "MOVE_MY_MARKER_READY">
  | BaseEvent<"map", "MOVE_MY_MARKER_CANCELLED">
  | BaseEvent<"map", "MY_MARKER_MOVED">
  | BaseEvent<"map", "MOVE_DEST_READY">
  | BaseEvent<"map", "MOVE_DEST_CANCELLED">
  | BaseEvent<"map", "DEST_MOVED">;

/** PET domain events */
export type PetEvents =
  | (BaseEvent<"pet", "PETPOI_TOGGLE"> & { on: boolean })
  | BaseEvent<"pet", "PETPOI_REFRESH">
  | (BaseEvent<"pet", "PETPOI_RESULT"> & {
      items: PetPoiItem[];
      key: string;
    })
  | (BaseEvent<"pet", "PETPOI_ERROR"> & {
      message: string;
      key: string;
    });

export type AppEvent = MapEvents | PetEvents;
