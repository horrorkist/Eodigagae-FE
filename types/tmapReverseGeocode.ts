export type TmapReverseGeocodeResponse = {
  displayAddress: string | null;
  roadAddress: string | null;
  jibunAddress: string | null;
};

export type TmapReverseGeocodeAddressInfo = {
  fullAddress?: string;
  addressType?: string;
  city_do?: string;
  gu_gun?: string;
  eup_myun?: string;
  legalDong?: string;
  adminDong?: string;
  ri?: string;
  bunji?: string;
  roadName?: string;
  buildingIndex?: string;
  buildingName?: string;
  roadAddressKey?: string;
  [key: string]: unknown;
};

export type TmapReverseGeocodeUpstreamResponse = {
  addressInfo?: TmapReverseGeocodeAddressInfo;
  error?:
    | {
        id?: string;
        name?: string;
        message?: string;
      }
    | string;
  [key: string]: unknown;
};
