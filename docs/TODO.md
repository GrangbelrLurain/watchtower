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

> 아키텍처: [05-proxy.md](architecture/06-proxy.md)

- [ ] BE: 앱 시작 시 프록시 자동 기동 (`setup` hook)
- [ ] BE: `local_routing_enabled: AtomicBool` 상태 추가
- [ ] BE: 프록시 핸들러에서 `local_routing_enabled` 체크 후 라우팅/패스스루 분기
- [ ] FE: Proxy 대시보드 on/off 스위치 → 로컬 라우팅 토글로 변경
- [ ] FE: 프록시 start/stop 버튼 제거 (상시 동작이므로)

---

## APIs: Dashboard (Phase 1 — 현재 구현 중)

> 아키텍처: [06-apis.md](architecture/07-apis.md) §2

- [x] BE: `DomainApiLoggingLink` 모델
- [x] BE: `ApiLoggingSettingsService` (링크 CRUD + 호스트별 맵)
- [x] BE: `get_domain_api_logging_links`, `set_domain_api_logging`, `remove_domain_api_logging` Commands
- [x] BE: cascade delete (도메인 삭제 → 로깅 링크 삭제)
- [ ] BE: `cargo build` 확인
- [ ] FE: `DomainApiLoggingLink` 타입 + `commands.ts` 매핑
- [ ] FE: `/apis/dashboard` 페이지 (검색·추가·리스트·토글·삭제)
- [ ] FE: `/apis/index.tsx` → `/apis/dashboard` 리디렉트
- [ ] FE: `__root.tsx` 사이드바에 APIs 메뉴 추가
- [ ] FE: `routeTree.gen.ts` 자동 생성 확인
- [ ] FE: `pnpm type-check` 통과 확인

---

## APIs: Logs (Phase 2)

> 아키텍처: [06-apis.md](architecture/07-apis.md) §4

- [ ] BE: `ApiLogEntry` 모델 (id, timestamp, method, url, host, path, status_code, headers, body, source)
- [ ] BE: `ApiLogService` (로깅 파이프라인, 조회, 필터)
- [ ] BE: 프록시에 로깅 훅 연동 (`settings_map` 조회 → 로깅)
- [ ] BE: `get_api_logs`, `clear_api_logs` Commands
- [ ] FE: `/apis/logs` 페이지 (목록·필터·상세)

---

## APIs: Schema (Phase 3)

> 아키텍처: [06-apis.md](architecture/07-apis.md) §3

- [ ] BE: `ApiSchema` 모델, `DomainApiSchemaLink`
- [ ] BE: `ApiSchemaService` (import, fetch, 저장, 조회)
- [ ] BE: `import_api_schema`, `get_api_schemas`, `get_api_schema_by_id`, `remove_api_schema` Commands
- [ ] BE: `send_api_request` Command (HTTP 요청 전송)
- [ ] FE: `/apis/schema` 페이지 (문서 뷰어, Request Form)
- [ ] FE: OpenAPI JSON/YAML 파일 업로드 또는 URL fetch

---

## APIs: 확장 (Phase 4)

> 아키텍처: [06-apis.md](architecture/07-apis.md) §6

- [ ] BE/FE: Replay Request (로그에서 Request 재전송)
- [ ] BE/FE: Mock Response (로그 Response를 목데이터로 프록시에 주입)
- [ ] BE/FE: 테스트 케이스 등록·재실행·회귀 테스트

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
