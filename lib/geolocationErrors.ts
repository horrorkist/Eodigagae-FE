type GeoErrorInfo = {
  title: string;
  description: string;
  suggestion: string;
};

export function getGeoErrorInfo(
  error: GeolocationPositionError | Error | null,
): GeoErrorInfo {
  if (!error) {
    return {
      title: "위치를 확인할 수 없어요",
      description: "알 수 없는 오류가 발생했습니다.",
      suggestion: "잠시 후 다시 시도해 주세요.",
    };
  }

  if ("code" in error && typeof (error as GeolocationPositionError).code === "number") {
    const geo = error as GeolocationPositionError;

    switch (geo.code) {
      case geo.PERMISSION_DENIED:
        return {
          title: "위치 권한이 필요해요",
          description: "위치 정보 사용이 차단되어 있습니다.",
          suggestion:
            "브라우저 설정 > 사이트 설정 > 위치에서 권한을 허용해 주세요.",
        };

      case geo.POSITION_UNAVAILABLE:
        return {
          title: "위치를 확인할 수 없어요",
          description: "기기에서 위치 정보를 가져올 수 없습니다.",
          suggestion:
            "GPS가 켜져 있는지 확인하고, 실내에서는 Wi-Fi를 활성화해 보세요.",
        };

      case geo.TIMEOUT:
        return {
          title: "위치 확인 시간이 초과됐어요",
          description: "위치 정보를 가져오는 데 시간이 너무 오래 걸렸습니다.",
          suggestion: "네트워크 연결을 확인하고, 잠시 후 다시 시도해 주세요.",
        };
    }
  }

  return {
    title: "위치 서비스를 사용할 수 없어요",
    description:
      error.message || "이 브라우저에서 위치 서비스를 지원하지 않습니다.",
    suggestion: "다른 브라우저나 기기에서 시도해 주세요.",
  };
}
