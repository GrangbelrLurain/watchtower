---
description: Watchtower 프론트엔드 라우트 현황 및 전략 대응
---

# 프론트엔드 라우트 정리

TanStack Router 파일 기반 라우팅과 backend-fe-strategy 문서 대응, FE 엔티티를 정리합니다.

**FE에서 백엔드 연결 방식**(호출 패턴, 응답 형식, 페이지별 사용 Command)은 [04-fe-be-connection.md](04-fe-be-connection.md) 참고.

## 현재 라우트 트리

| 경로 | 라우트 파일 | 비고 |
|------|-------------|------|
| `/` | `src/routes/index.tsx` | Home / Dashboard |
| `/about` | `src/routes/about.tsx` | 소개 |
| `/domains` | `src/routes/domains/index.tsx` | 도메인 목록 |
| `/domains/regist` | `src/routes/domains/regist/index.tsx` | 도메인 일괄 등록 |
| `/domains/status` | `src/routes/domains/status/index.tsx` | 도메인 상태 |
| `/domains/status/logs` | `src/routes/domains/status/logs.tsx` | 상태 로그 |
| `/domains/groups` | `src/routes/domains/groups/index.tsx` | 도메인 그룹 관리 |

라우트 트리 자동 생성 파일: `src/routeTree.gen.ts` (수정하지 않음, 참고만).

## 사이드바 메뉴 (__root.tsx)

- **Home** → `/`
- **Domains** → `/domains` (자식: Regist → `/domains/regist`, Status → `/domains/status`, Groups → `/domains/groups`, Logs → `/domains/status/logs`)

## backend-fe-strategy와의 대응

| 전략 문서 항목 | 실제 라우트 | 상태 |
|----------------|-------------|------|
| Dashboard 전체 도메인 상태 요약 | `/` | 구현됨 |
| Domain List 등록된 도메인 관리 | `/domains` | 구현됨 |
| Add Domain 신규 URL 일괄 등록 | `/domains/regist` | 구현됨 (경로명만 add → regist) |
| Domain Detail 개별 도메인 상세 | `/domains/$id` | 미구현 |
| Settings 알림·체크 주기 설정 | `/settings` | 미구현 |

추가로 구현된 라우트: `/domains/status`, `/domains/status/logs`, `/domains/groups`.

## FE 엔티티 (entities/domain/types/)

| 파일 | 타입 | 필드 | 백엔드와 차이 |
|------|------|------|----------------|
| domain.d.ts | Domain | `id`, `url`, `group_id?` | BE와 동기화됨 (1:n 그룹 연결) |
| domain_status.ts | DomainStatusLog | `url`, `status`, `level`, `latency`, `ok`, `group`, `timestamp`, `errorMessage?` | 체크 결과 (BE DomainStatusLog) |
| domain_group.ts | DomainGroup | `id`, `name` | BE와 동일 |

## 도메인–그룹 1:n 연결 (구현됨)

- **등록 시**: `/domains/regist`에서 그룹 선택 후 일괄 등록 시 `regist_domains`에 `group_id` 전달.
- **목록**: `/domains`에서 그룹별 필터, 행별 그룹명 표시, 셀렉트로 그룹 변경 (`update_domain_by_id`).
- **그룹 페이지**: `/domains/groups`에서 그룹 카드별로 소속 도메인 목록(1:n) 표시, 도메인 없을 때 Domains/Regist 링크 안내.

## 향후 추가 시 권장

- **`/domains/$id` (Domain Detail)**  
  - 사용 Command: `get_domain_by_id`, `get_latest_status`(해당 도메인 필터) 또는 `get_domain_status_logs`로 이력 표시.
  - 라우트 파일: `src/routes/domains/$id.tsx` 또는 `src/routes/domains/$id/index.tsx` (TanStack Router 규칙에 맞게).
- **`/settings` (Settings)**  
  - 알림·체크 주기 설정. 현재 BE에 체크 주기(120초)가 하드코딩되어 있으므로, 설정 저장 시 BE 확장(설정 파일 또는 command) 필요.
