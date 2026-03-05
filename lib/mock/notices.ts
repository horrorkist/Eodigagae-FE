import type { NoticeItem } from "@/types/support";

const NOTICE_ITEMS: NoticeItem[] = [
  {
    id: "2026-03-01-release-note",
    title: "3월 업데이트: 마이페이지 베타 오픈",
    summary: "반려동물 정보 관리와 고객지원 메뉴가 추가되었습니다.",
    content:
      "마이페이지 베타가 오픈되었습니다. 이제 반려동물 정보를 저장하고, 공지사항을 확인하고, 잘못된 정보 신고와 의견 남기기를 이용할 수 있습니다.",
    publishedAt: "2026-03-01",
  },
  {
    id: "2026-02-20-map-stability",
    title: "지도 안정성 개선 안내",
    summary: "일부 기기에서 발생하던 지도 표시 지연 문제를 개선했습니다.",
    content:
      "특정 기기에서 앱 진입 시 지도 표시가 지연되던 현상을 개선했습니다. 최신 버전으로 업데이트 후 동일 증상이 반복되면 의견 남기기로 제보해 주세요.",
    publishedAt: "2026-02-20",
  },
  {
    id: "2026-02-10-poi-quality",
    title: "반려동물 동반 장소 데이터 품질 점검",
    summary: "장소 정보 정확도 향상을 위한 주간 점검을 시작했습니다.",
    content:
      "반려동물 동반 장소의 운영 상태와 주소 정확도를 높이기 위해 주간 점검 프로세스를 운영합니다. 잘못된 정보가 있다면 신고 메뉴를 이용해 주세요.",
    publishedAt: "2026-02-10",
  },
];

export function listNotices(): NoticeItem[] {
  return NOTICE_ITEMS.slice().sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function getNoticeById(id: string): NoticeItem | null {
  return listNotices().find((notice) => notice.id === id) ?? null;
}
