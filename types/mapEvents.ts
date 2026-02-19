// types/mapEvents.ts
export type LatLng = { lat: number; lng: number };

/** KorPetTourService2 locationBasedList2 응답 아이템 */
export type PetPoiItem = {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2: string;
  zipcode: string;
  tel: string;
  mapx: string; // 경도(lng)
  mapy: string; // 위도(lat)
  mlevel: string;
  dist: string; // 거리(m), 소수점 포함 문자열
  areacode: string;
  sigungucode: string;
  cat1: string;
  cat2: string;
  cat3: string;
  firstimage: string;
  firstimage2: string;
  cpyrhtDivCd: string;
  createdtime: string; // "YYYYMMDDHHmmss"
  modifiedtime: string; // "YYYYMMDDHHmmss"
  lDongRegnCd: string;
  lDongSignguCd: string;
  lclsSystm1: string;
  lclsSystm2: string;
  lclsSystm3: string;
};

/** /api/petpois 응답의 meta 필드 */
export type PetPoiMeta = {
  rounded: { lat: number; lng: number; grid: number };
  radius: number;
  numOfRows: number;
  pageNo: number;
  revalidate: number;
  totalCount: number | null;
};

/** /api/petpois 전체 응답 */
export type PetPoiResponse = {
  key: string;
  meta: PetPoiMeta;
  items: PetPoiItem[];
};

export type MapChannel = "map" | "pet" | "ui";

export type BaseEvent<C extends MapChannel, T extends string> = {
  channel: C;
  type: T;
  ts?: number;
};

type WalkingControlEventType =
  | "START_WALKING"
  | "PAUSE_WALKING"
  | "RESUME_WALKING"
  | "STOP_WALKING";

/** MAP domain events */
export type MapEvents =
  | (BaseEvent<"map", "MOVE_TO"> & {
      pos: { lat: number; lng: number };
      zoom?: number;
      animate?: boolean;
    })
  | (BaseEvent<"map", "MOVE_MAP_CENTER"> & {
      pos: { lat: number; lng: number };
      zoom?: number;
      animate?: boolean;
    })
  | BaseEvent<"map", WalkingControlEventType>;

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

/** UI chrome events */
export type UiEvents =
  | BaseEvent<"ui", "UI_BOTTOM_CHROME_SHOW">
  | BaseEvent<"ui", "UI_BOTTOM_CHROME_HIDE">
  | BaseEvent<"ui", "UI_BOTTOM_CHROME_HIDE_ON_NEXT_HOME">
  | BaseEvent<"ui", "UI_HOME_ENTERED">;

export type AppEvent = MapEvents | PetEvents | UiEvents;
