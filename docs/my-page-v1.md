# 마이페이지 v1

## IA
- `/my`: 마이페이지 허브
- `/my/support/guides`: 안내사항
- `/my/support/notices`: 공지사항 목록
- `/my/support/report`: 잘못된 정보 신고
- `/my/support/feedback`: 의견 남기기

## 스토리지 키 정책
- `dog:profile:v1`: 반려동물 정보(`dog`, `formDraft`)
- `my:settings:v1`: 마이페이지 설정(`notificationsEnabled`)
- `search:recent-keywords`: 검색 최근어 캐시(삭제 대상)
- `search:page-state`: 검색 페이지 상태 캐시(삭제 대상)
- `walkDebug`: 산책 디버그 캐시(삭제 대상)
- `walkDebugPanelVisible`: 디버그 패널 표시 캐시(삭제 대상)

## 고객지원 데이터 정책
- 공지사항: `lib/mock/notices.ts` 정적 데이터 사용
- 잘못된 정보 신고: 개발중 placeholder 노출
- 의견 남기기: 개발중 placeholder 노출

## 반려동물 입력 정책
- 반려동물 등록/수정은 `/my` 내부 전용 모달에서 처리
- 입력 필드: 이름(선택), 나이(필수), 단위(년/개월), 크기(소형/중형/대형)
- 프로필 사진은 Cloudflare Images direct upload로 업로드
- 저장 정보: `imageId`, `variantUrl`, `uploadedAt` (dog store에 로컬 영속)
- 사진 교체/반려동물 삭제 시 기존 Cloudflare 이미지 삭제 시도(best-effort)

## 백엔드 연동 계획 (후속)
- 알림 설정 서버 동기화 API
- 신고/의견 제출 API
- 공지사항 CMS/API 연동
