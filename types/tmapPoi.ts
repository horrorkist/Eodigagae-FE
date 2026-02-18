export type TmapPoiSearchSort = "R" | "A";
type MaybeArray<T> = T | T[];

export type TmapPoiEvCharger = {
  operatorId?: string;
  stationId?: string;
  chargerId?: string;
  status?: string;
  type?: string;
  powerType?: string;
  operatorName?: string;
  chargingDateTime?: string;
  updateDateTime?: string;
  isFast?: string;
  isAvailable?: string;
  [key: string]: unknown;
};

export type TmapPoiNewAddress = {
  centerLat?: string | number;
  centerLon?: string | number;
  frontLat?: string | number;
  frontLon?: string | number;
  roadName?: string;
  bldNo1?: string | number;
  bldNo2?: string | number;
  roadId?: string;
  fullAddressRoad?: string;
  // 문서 샘플에 따라 변형 가능성이 있어 보조 키도 허용
  centerName?: string;
  buildingIndex?: string;
  [key: string]: unknown;
};

export type TmapPoiGroupSub = {
  subPkey?: string;
  subSeq?: string | number;
  subName?: string;
  subCenterY?: string | number;
  subCenterX?: string | number;
  subNavY?: string | number;
  subNavX?: string | number;
  subRpFlag?: string;
  subPoiId?: string;
  subNavSeq?: string | number;
  subParkYn?: string | number;
  subClassCd?: string;
  subClassNmA?: string;
  subClassNmB?: string;
  subClassNmC?: string;
  subClassNmD?: string;
  [key: string]: unknown;
};

export type TmapPoiUpstream = {
  id?: string | number;
  pkey?: string;
  navSeq?: string | number;
  collectionType?: string;
  name?: string;
  telNo?: string;
  frontLat?: string | number;
  frontLon?: string | number;
  noorLat?: string | number;
  noorLon?: string | number;
  upperAddrName?: string;
  middleAddrName?: string;
  lowerAddrName?: string;
  detailAddrName?: string;
  // 샘플 응답에 오탈자(detailAddrname) 케이스가 존재함
  detailAddrname?: string;
  mlClass?: string | number;
  firstNo?: string | number;
  secondNo?: string | number;
  roadName?: string;
  firstBuildNo?: string | number;
  secondBuildNo?: string | number;
  radius?: string | number;
  bizName?: string;
  upperBizName?: string;
  middleBizName?: string;
  lowerBizName?: string;
  detailBizName?: string;
  rpFlag?: string;
  parkFlag?: string | number | null;
  detailInfoFlag?: string | number | null;
  desc?: string;
  dataKind?: string;
  zipCode?: string;
  evChargers?: {
    evCharger?: MaybeArray<TmapPoiEvCharger>;
  };
  newAddressList?: {
    newAddress?: MaybeArray<TmapPoiNewAddress>;
  };
  groupSubLists?: {
    groupSub?: MaybeArray<TmapPoiGroupSub>;
  };
  [key: string]: unknown;
};

export type TmapPoiSearchUpstreamResponse = {
  searchPoiInfo?: {
    totalCount?: string | number;
    count?: string | number;
    page?: string | number;
    pois?: {
      poi?: MaybeArray<TmapPoiUpstream>;
    };
  };
  error?:
    | {
        id?: string;
        name?: string;
        message?: string;
      }
    | string;
  [key: string]: unknown;
};

export type TmapPoi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  middleAddress: string;
  address: string;
  roadAddress: string;
  categoryPath: string[];
  bizCategory: string;
  telNo: string;
  distanceM: number | null;
  estimatedWalkMin: number | null;
  hasDetailInfo: boolean | null;
};

export type TmapPoiSearchMeta = {
  keyword: string;
  searchtypCd: TmapPoiSearchSort;
  page: number;
  count: number;
  totalCount: number;
};

export type TmapPoiSearchResponse = {
  meta: TmapPoiSearchMeta;
  items: TmapPoi[];
};
