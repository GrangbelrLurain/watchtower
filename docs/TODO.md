---
title: TODO — 구현 체크리스트
description: 기능별 미완료 항목 추적
keywords: [TODO, 체크리스트, 구현, 태스크]
when: 다음 작업 확인, 진행 상황 추적 시
---

# TODO

기능별 구현 체크리스트. 완료 시 `[x]`로 업데이트합니다.

---

## Proxy: 상시 동작 + 로컬 라우팅 토글

> 아키텍처: [06-proxy.md](architecture/06-proxy.md)

- [x] BE: 앱 시작 시 프록시 자동 기동 (`setup` hook)
- [x] BE: `local_routing_enabled: AtomicBool` 상태 추가
- [x] BE: 프록시 핸들러에서 `local_routing_enabled` 체크 후 라우팅/패스스루 분기
- [x] BE: `set_local_routing_enabled` Command + `ProxySettings` 영속화
- [x] FE: Proxy 대시보드 on/off 스위치 → 로컬 라우팅 토글로 변경
- [x] FE: 프록시 start/stop 버튼 제거 (상시 동작이므로)
- [x] FE: 포트 설정 UI 통합 (Forward / Reverse HTTP / HTTPS)

---

## APIs: Dashboard (Phase 1 — 현재 구현 중)

> 아키텍처: [06-apis.md](architecture/07-apis.md) §2

- [x] BE: `DomainApiLoggingLink` 모델
- [x] BE: `ApiLoggingSettingsService` (링크 CRUD + 호스트별 맵)
- [x] BE: `get_domain_api_logging_links`, `set_domain_api_logging`, `remove_domain_api_logging` Commands
- [x] BE: cascade delete (도메인 삭제 → 로깅 링크 삭제)
- [x] BE: `cargo build` 확인
- [x] FE: `DomainApiLoggingLink` 타입 + `commands.ts` 매핑
- [x] FE: `/apis/dashboard` 페이지 (검색·추가·리스트·토글·삭제)
- [x] FE: `/apis/index.tsx` → `/apis/dashboard` 리디렉트
- [x] FE: `__root.tsx` 사이드바에 APIs 메뉴 추가
- [x] FE: `routeTree.gen.ts` 자동 생성 확인
- [x] FE: `pnpm type-check` 통과 확인

---

## APIs: Settings (도메인 등록/해제 분리)

> 아키텍처: [07-apis.md](architecture/07-apis.md) §2

- [x] FE: `/apis/settings` 신규 — 2패널(등록/미등록) + 그룹별 분류 + 검색 (Monitor Settings 패턴)
- [x] FE: `/apis/dashboard`에서 도메인 등록 카드 제거 + settings 링크 추가
- [x] FE: `__root.tsx` 사이드바에 APIs > Settings 메뉴 추가
- [x] FE: `routeTree.gen.ts` 재생성

---

## APIs: Logs (Phase 2)

> 아키텍처: [06-apis.md](architecture/07-apis.md) §4

- [x] BE: `ApiLogEntry` 모델 (id, timestamp, method, url, host, path, status_code, headers, body, source)
- [x] BE: `ApiLogService` (로깅 파이프라인, 조회, 필터)
- [x] BE: 프록시에 로깅 훅 연동 (`settings_map` 조회 → 로깅)
- [x] BE: `get_api_logs`, `clear_api_logs` Commands
- [x] FE: `/apis/logs` 페이지 (목록·필터·상세)

---

## APIs: Schema URL 등록 (Phase 1.5 — Dashboard 확장)

> 아키텍처: [07-apis.md](architecture/07-apis.md) §2, §3

- [x] BE: `DomainApiLoggingLink`에 `schema_url: Option<String>` 필드 추가
- [x] BE: `set_domain_api_logging` Command에 `schemaUrl` 파라미터 추가
- [x] BE: `download_api_schema` Command (URL fetch → 로컬 저장)
- [x] BE: `get_api_schema_content` Command (저장된 스키마 조회)
- [x] FE: `/apis/dashboard` 도메인 항목에 Schema URL 입력/편집 UI
- [x] FE: "Download" 버튼 → fetch 후 로컬 저장 + 결과 메시지

---

## APIs: Schema 뷰어 + 버전 관리 (Phase 3)

> 아키텍처: [07-apis.md](architecture/07-apis.md) §3

### 3-1. Schema 뷰어 + Request Form (완료)

- [x] BE: `send_api_request` Command (reqwest HTTP 클라이언트, TLS 무시, 타임아웃 30s)
- [x] FE: `openapi-parser.ts` 유틸리티 (엔드포인트 파싱, $ref 해석, 예시 JSON 생성)
- [x] FE: `/apis/schema` 페이지 (도메인 선택, 태그별 엔드포인트 목록, 상세 뷰, Request Form, Response 표시)
- [x] FE: `commands.ts` / `local_route.ts`에 `send_api_request`, `ApiRequestResult` 타입 추가

### 3-2. 모델/서비스 확장 (진행 중)

- [x] BE: `ApiSchema` 모델 (id, domain_id, version, spec, source, fetched_at)
- [x] BE: `DomainApiSchemaLink` (domain_id → schema_id)
- [x] BE: `ApiSchemaService` (import, fetch, 저장, 조회, 버전 이력)
- [x] BE: `import_api_schema`, `get_api_schemas`, `get_api_schema_by_id`, `remove_api_schema` Commands
- [ ] FE: OpenAPI JSON/YAML 파일 업로드 또는 URL fetch
- [x] FE: 버전 목록 + 버전 선택 UI

### Schema 버전 Diff (검토 필요)

> 동일 도메인의 Schema를 URL에서 재다운로드 시 이전 버전과 비교하여 변경사항을 표시 (git diff 유사)

- [ ] **검토**: OpenAPI JSON diff 라이브러리/알고리즘 조사 (JSON deep diff, OpenAPI-specific diff 도구)
- [ ] BE: 스키마 버전 저장 (fetch 시마다 새 버전 생성, 이전 버전 보존)
- [ ] BE: `diff_api_schemas` Command (두 버전 간 diff 반환)
- [ ] FE: 버전 간 diff 뷰어 (추가/삭제/변경된 엔드포인트·필드 하이라이팅)

---

## APIs: 확장 (Phase 4)

> 아키텍처: [06-apis.md](architecture/07-apis.md) §6

- [ ] BE/FE: Replay Request (로그에서 Request 재전송)
- [ ] BE/FE: Mock Response (로그 Response를 목데이터로 프록시에 주입)
- [ ] BE/FE: 테스트 케이스 등록·재실행·회귀 테스트

---

## Monitor: Settings 개선 (그룹별 UI + 검색)

> 아키텍처: [05-monitor.md](architecture/05-monitor.md) §5

- [x] FE: `get_groups` + `get_domain_group_links` fetch 추가, domainId → groupName 매핑 생성
- [x] FE: 검색 Input 추가 (URL/그룹명으로 필터링)
- [x] FE: 각 패널(체크할/안할) 내부에서 그룹별 섹션으로 도메인 분류 표시
- [x] FE: 그룹 헤더에 그룹 단위 전체 선택/해제 토글 추가
- [x] FIX: 체크박스 클릭 시 스크롤 위로 올라가는 버그 (ListItem 컴포넌트 외부 분리)

---

## Domains: 확장

> 아키텍처: [04-domains.md](architecture/04-domains.md)

- [ ] FE: `/domains/$id` (Domain Detail) 페이지
- [ ] FE: 하위 페이지 재귀적 상태 점검
- [ ] FE: LCP 등 성능 지표 측정·시각화
- [ ] FE: Domains → "프록시에 추가" 버튼
- [ ] FE: Proxy → "도메인에서 가져오기" 버튼
- [ ] FE: 통합 검색 UI

---

## Proxy: 미래 확장

> 아키텍처: [05-proxy.md](architecture/06-proxy.md) §6

- [ ] BE: 0.0.0.0 바인딩 (모바일/외부 기기 접근)
- [ ] BE: CA + 인증서 다운로드 API
- [ ] FE: SSL 다운로드 페이지
- [ ] FE: QR 코드 생성 (모바일 설정 안내)
- [ ] BE: hosts 파일 편집 (2차 스코프)

---

## 글로벌

- [ ] FE: `/settings` 확장 — 체크 주기 설정 (현재 120초 하드코딩)
- [ ] BE/FE: Command 타입 자동 생성 (tauri-typegen 검토)
