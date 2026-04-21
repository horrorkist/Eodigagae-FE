import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import AppIcon from "@/components/icons/AppIcon";
import { appIconWarning } from "@/components/icons/definitions.generated";
import type { GeoErrorInfo } from "@/lib/geolocationErrors";
import type { ModalConfig } from "@/types/modal";

type BodyLine = {
  text: string;
  className?: string;
};

export type MessageModalParams = {
  message: string;
};

export type OffRouteModalParams = {
  distanceM: number;
  stopLabel: string;
};

export type ArrivalModalParams = {
  isPoiRoute: boolean;
};

export type LocationErrorModalParams = {
  info: GeoErrorInfo;
};

export type DataLoadFailedModalParams = {
  subject: string;
};

export type CopyAddressSuccessModalParams = {
  label: string;
};

function buildBody(lines: BodyLine[]): ReactNode {
  if (lines.length === 1 && !lines[0]?.className) {
    return <p>{lines[0].text}</p>;
  }

  return (
    <div className="space-y-1">
      {lines.map((line, index) => (
        <p key={`${index}-${line.text}`} className={line.className}>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function createAlertIcon() {
  return (
    <FontAwesomeIcon
      icon={faTriangleExclamation}
      className="h-8 w-8 text-red-400"
    />
  );
}

function createLocationIcon() {
  return (
    <FontAwesomeIcon icon={faLocationDot} className="h-8 w-8 text-red-400" />
  );
}

function createRouteWarningIcon() {
  return <AppIcon icon={appIconWarning} className="h-12 w-12 text-dg-red-sub" />;
}

export const modalPresets = {
  recommendationDraftMissing(): ModalConfig {
    return {
      title: "추천 정보를 확인할 수 없어요",
      body: buildBody([{ text: "반려견 정보를 다시 입력한 뒤 시도해 주세요." }]),
    };
  },

  mapCenterUnavailable(): ModalConfig {
    return {
      title: "지도 중심 좌표를 확인할 수 없어요",
      body: buildBody([{ text: "지도가 로드된 뒤 다시 시도해 주세요." }]),
    };
  },

  recommendationEmpty({ message }: MessageModalParams): ModalConfig {
    return {
      title: "추천 경로를 찾지 못했어요",
      body: buildBody([{ text: message }]),
    };
  },

  recommendationLoadFailed({ message }: MessageModalParams): ModalConfig {
    return {
      title: "추천 경로를 불러오지 못했어요",
      body: buildBody([{ text: message }]),
    };
  },

  currentLocationRequired(): ModalConfig {
    return {
      title: "현재 위치가 필요해요",
      body: buildBody([
        {
          text: "위치 권한을 허용하거나 현재 위치를 먼저 확인한 뒤 다시 시도해 주세요.",
        },
      ]),
    };
  },

  poiRouteLoadFailed({ message }: MessageModalParams): ModalConfig {
    return {
      title: "길찾기 경로를 불러오지 못했어요",
      body: buildBody([{ text: message }]),
    };
  },

  offRoute({ distanceM, stopLabel }: OffRouteModalParams): ModalConfig {
    return {
      title: "경로를 벗어났어요",
      icon: createRouteWarningIcon(),
      body: buildBody([
        {
          text: `현재 경로에서 약 ${Math.round(distanceM)}m 벗어났어요. 지금 상태를 유지할까요, 아니면 ${stopLabel}할까요?`,
        },
      ]),
      confirmLabel: stopLabel,
      confirmTone: "danger",
      cancelLabel: "유지",
    };
  },

  arrival({ isPoiRoute }: ArrivalModalParams): ModalConfig {
    return {
      title: isPoiRoute
        ? "도착지에 거의 도착했어요"
        : "산책 코스가 거의 끝났어요",
      body: buildBody([
        { text: isPoiRoute ? "길안내를 종료할까요?" : "산책을 종료할까요?" },
      ]),
      confirmLabel: isPoiRoute ? "길안내 종료" : "산책 종료",
      cancelLabel: isPoiRoute ? "계속 안내" : "계속 산책",
    };
  },

  dataLoadFailed({ subject }: DataLoadFailedModalParams): ModalConfig {
    return {
      title: `${subject} 정보를 불러오지 못했어요`,
      icon: createAlertIcon(),
      body: buildBody([
        { text: "일시적인 오류가 발생했어요." },
        { text: "잠시 후 다시 시도해 주세요." },
      ]),
    };
  },

  locationError({ info }: LocationErrorModalParams): ModalConfig {
    return {
      title: info.title,
      icon: createLocationIcon(),
      body: buildBody([
        { text: info.description },
        { text: info.suggestion, className: "text-xs text-gray-400" },
      ]),
    };
  },

  copyAddressSuccess({ label }: CopyAddressSuccessModalParams): ModalConfig {
    return {
      title: "주소 복사 완료",
      body: buildBody([{ text: `${label} 주소를 클립보드에 복사했어요.` }]),
    };
  },

  copyAddressFailure(): ModalConfig {
    return {
      title: "주소 복사 실패",
      body: buildBody([
        { text: "클립보드에 복사하지 못했어요. 다시 시도해 주세요." },
      ]),
    };
  },

  cacheClearConfirm(): ModalConfig {
    return {
      title: "캐시 데이터 삭제",
      body: buildBody([
        {
          text: "캐시 데이터를 삭제하면 산책 기록과 설정이 함께 삭제됩니다. 소중한 기록이 사라질 수 있으니 다시 한 번 확인해주세요.",
        },
      ]),
      cancelLabel: "취소",
      confirmLabel: "삭제",
    };
  },

  petDeleteConfirm(): ModalConfig {
    return {
      title: "반려동물 정보 삭제",
      body: buildBody([
        { text: "반려동물 정보를 삭제하시겠어요?" },
        { text: "삭제된 정보는 되돌릴 수 없습니다." },
      ]),
      cancelLabel: "취소",
      confirmLabel: "삭제",
    };
  },
};
