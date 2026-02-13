---
title: 백엔드 전체 개요
description: Tauri Commands, 모델, 서비스, 저장소, 마이그레이션, FE 연동 패턴
keywords: [백엔드, 커맨드, 모델, 서비스, 저장소, 마이그레이션]
when: BE 구조, Command, 모델·서비스 파악 시
---

# 백엔드 전체 개요

`src-tauri/src/`의 Tauri Commands, 모델, 서비스, 저장소를 정리합니다.

---

## 1. 데이터 설계 규칙

- **Join 테이블**: n:n 관계는 `*_link` / `*Link` 접미사 통일 (예: `DomainGroupLink`)
- **응답 포맷**: 모든 Command는 `ApiResponse<T>` (`success`, `message`, `data`) 반환
- **인자 직렬화**: `#[serde(rename_all = "camelCase")]` — FE에서 camelCase로 전달

---

## 2. 모델

| 모델 | 파일 | 필드 | 비고 |
|------|------|------|------|
| **Domain** | domain.rs | id, url | 마스터 목록 |
| **DomainGroup** | domain_group.rs | id, name | 그룹 |
| **DomainGroupLink** | domain_group_link.rs | domain_id, group_id | 도메인–그룹 n:n |
| **DomainMonitorLink** | domain_monitor_link.rs | domain_id, check_enabled, interval_secs | 모니터 체크 대상 + 옵션 |
| **DomainStatusLog** | domain_status_log.rs | id, domain_id, status, level, ok, group, timestamp | 체크 결과 (메모리 + 로그 파일) |
| **LocalRoute** | local_route.rs | id, domain, target_host, target_port, enabled | 프록시 로컬 라우트 |
| **ProxySettings** | proxy_settings.rs | dns_server, proxy_port, reverse_http_port, reverse_https_port | 프록시 설정 |
| **DomainApiLoggingLink** | domain_api_logging_link.rs | domain_id, logging_enabled, body_enabled | API 로깅 도메인 등록 |
| **SettingsExport** | settings_export.rs | — | 임포트/익스포트용 |
| **ApiResponse\<T>** | api_response.rs | success, message, data | 공통 응답 |

---

## 3. 서비스·저장소

| 서비스 | 저장소 | 역할 |
|--------|--------|------|
| DomainService | `domains.json` | 도메인 CRUD, 임포트/전체삭제 |
| DomainGroupService | `groups.json` | 그룹 CRUD |
| DomainGroupLinkService | `domain_group_links.json` | 도메인–그룹 n:n 링크 |
| DomainMonitorService | `domain_monitor_links.json` + `logs/` | 모니터 체크, 상태 로그 |
| LocalRouteService | `domain_local_routes.json` | 프록시 라우트 CRUD |
| ProxySettingsService | `proxy_settings.json` | 프록시 설정 |
| ApiLoggingSettingsService | `domain_api_logging_links.json` | API 로깅 링크 + 호스트별 설정 맵 |
| local_proxy (모듈) | — | HTTP/HTTPS 프록시 서버 |

---

## 4. Commands 목록

### 도메인 (domain_commands.rs)

| Command | 설명 | 서비스 |
|---------|------|--------|
| `regist_domains` | URL 목록 + group_id로 일괄 등록 | DomainService, DomainGroupLinkService |
| `get_domains` | 전체 목록 조회 | DomainService |
| `get_domain_by_id` | id로 조회 | DomainService |
| `update_domain_by_id` | url 수정 | DomainService |
| `remove_domains` | 삭제 (cascade: 그룹 링크, 모니터, API 로깅 링크) | DomainService + 각 Link 서비스 |
| `import_domains` | JSON 임포트 | DomainService |
| `clear_all_domains` | 전체 삭제 | DomainService |

### 도메인 그룹 (domain_group_commands.rs)

| Command | 설명 |
|---------|------|
| `get_domain_group_links` | 전체 링크 조회 |
| `set_domain_groups` | 도메인의 소속 그룹 교체 |
| `set_group_domains` | 그룹의 소속 도메인 교체 |
| `get_domains_by_group` | 그룹별 도메인 조회 |
| `get_groups_for_domain` | 도메인의 그룹 조회 |
| `create_group` / `get_groups` / `update_group` / `delete_group` | 그룹 CRUD |

### 도메인 모니터 (domain_monitor_command.rs)

| Command | 설명 |
|---------|------|
| `get_latest_status` | 최신 상태 목록 |
| `check_domain_status` | 전체 상태 체크 실행 |
| `get_domain_status_logs` | 날짜별 로그 조회 |
| `get_domain_monitor_list` | 모니터 링크 + URL 목록 |
| `set_domain_monitor_check_enabled` | 체크 활성화/비활성화 |

### 프록시 (local_route_commands.rs)

| Command | 설명 |
|---------|------|
| `get_local_routes` / `add_local_route` / `update_local_route` / `remove_local_route` | 라우트 CRUD |
| `set_local_route_enabled` | 라우트 활성화 토글 |
| `get_proxy_status` / `start_local_proxy` / `stop_local_proxy` | 프록시 상태·제어 |
| `get_proxy_settings` / `set_proxy_dns_server` / `set_proxy_port` / `set_proxy_reverse_ports` | 프록시 설정 |
| `get_proxy_setup_url` | 셋업 페이지 URL |

### API 로깅 (api_log_commands.rs)

| Command | 설명 |
|---------|------|
| `get_domain_api_logging_links` | 전체 로깅 링크 조회 |
| `set_domain_api_logging` | 로깅 설정 추가/변경 |
| `remove_domain_api_logging` | 로깅 설정 제거 |

### 설정 (settings_commands.rs)

| Command | 설명 |
|---------|------|
| `export_all_settings` | 전체 설정 익스포트 |
| `import_all_settings` | 전체 설정 임포트 |

---

## 5. 백그라운드 동작

- **2분 주기 도메인 상태 체크**: `setup`에서 `tauri::async_runtime::spawn`으로 120초 간격 루프
- **프록시**: (향후) 앱 시작 시 자동 기동 예정

---

## 6. FE 연동 패턴

### invoke 래퍼

- **위치**: `src/shared/api/` — `ApiCommandMap` (commands.ts), `invokeApi` (invoke.ts)
- **방식**: Command key별 Request/Response 타입 수동 정의, `invokeApi<C>(cmd, request?)` 타입 안전 호출
- **인자 규칙**: `{ payload: { ... } }` 형태 (camelCase)

### 공통 패턴

| 항목 | 방식 |
|------|------|
| 로딩 | `useState(false)` + try/finally |
| 에러 | try/catch + console.error, 토스트 |
| 목록 갱신 | mutation 후 fetch 재호출 |
| fetch | useCallback + useEffect 마운트 시 1회 |

### 새 Command 연동 체크리스트

1. `commands.ts`에 `ApiCommandMap` 타입 추가
2. 인자: camelCase, `{ payload: { ... } }` 형태
3. 응답: `response.success` → `response.data` 사용
4. mutation 후 fetch 재호출
5. `entities/*/types/` 타입과 BE 모델 필드 동기화

---

## 7. JSON 스키마 버전 관리

| 규칙 | 설명 |
|------|------|
| 버전 필드 | `schema_version` 루트 필드 |
| v1 = 없음 | `schema_version` 없으면 v1 취급 |
| 마이그레이션 | v1 → v2 순차 변환, `.bak` 백업 |

```json
{ "schema_version": 2, "data": [ ... ] }
```

| 모듈 | 역할 |
|------|------|
| `storage/migration.rs` | 앱 시작 시 `run_all()`, 각 파일에 migration chain 적용 |
| `storage/versioned.rs` | `load_versioned`, `save_versioned` |
