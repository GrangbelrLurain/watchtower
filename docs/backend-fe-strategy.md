---
title: Backend & Frontend Strategy
description: Watchtower 백엔드 분석 및 프론트엔드 구현 계획
keywords: [백엔드, 프론트엔드, 러스트, 타우리, 라우트, api]
when: BE/FE 설계 개요, 라우트 전략 파악 시
related: [plans/01-backend-api, plans/02-frontend-routes, plans/05-domain-local-routing, plans/06-proxy-architecture, plans/08-domain-proxy-integration, plans/09-domain-use-cases]
---

# 🛸 Watchtower Backend & Frontend Strategy

이 문서는 `src-tauri`의 핵심 로직 분석 결과와 그에 따른 프론트엔드 라우트 설계를 기록합니다.

## 1. Rust Backend 분석 (src-tauri)

이 앱은 도메인 모니터링 및 관리를 위한 핵심 커맨드를 갖추고 있습니다. **도메인 로컬 라우팅 (3단계)** 도 완료되어 프록시·로컬 라우트 관련 Commands가 추가되었습니다.

### 주요 데이터 모델

| 모델 | 필드 | 비고 |
|------|------|------|
| **Domain** | `id` (u32), `url` (String) | **마스터 목록**. Monitor·Proxy·Api의 선행 조건 |
| **DomainGroup** | `id` (u32), `name` (String) | domain_group.rs |
| **DomainGroupLink** | `domain_id` (u32), `group_id` (u32) | 도메인–그룹 n:n 연결 |
| **DomainMonitorLink** | `domain_id`, `check_enabled`, `interval` 등 | Monitor: HEAD 요청 상태 감시 대상 |
| **DomainStatusLog** | `id`, `domain_id`, `status`, `level`, `ok`, `group`, `timestamp` | 체크 결과 구조. 최신은 메모리(`last_checks`), 과거는 `logs/{date}.json` |
| **LocalRoute** | `id`, `domain`, `target_host`, `target_port`, `enabled` | Proxy: 도메인 → 로컬 (host:port) 매핑 |
| **ApiSchema** | `id`, `url`, `name` 등 | _(예정)_ Api: 스키마 다운로드 URL |
| **DomainApiSchemaLink** | `domain_id`, `schema_id` | _(예정)_ 도메인–스키마 연결 |
| **ApiResponse\<T>** | `success`, `message`, `data` | 일관된 응답 포맷 |

### Domain 중심 용도별 구조

Domain에 없으면 Monitor·Proxy·Api에 등록할 수 없다. (→ [09-domain-use-cases](plans/09-domain-use-cases.md))

### 가용한 Tauri Commands

#### 도메인 (domain_commands.rs)

| Command | 설명 |
|---------|------|
| `regist_domains` | URL 목록 + 선택적 group_id로 도메인 일괄 등록 후 해당 그룹에 링크 |
| `get_domains` | 전체 도메인 목록 조회 |
| `get_domain_by_id` | id로 도메인 상세 조회 |
| `update_domain_by_id` | id로 url만 수정 (그룹은 link로 관리) |
| `remove_domains` | id로 도메인 삭제 및 해당 도메인 링크 제거 |
| `import_domains` | Domain 배열로 JSON 임포트 |
| `clear_all_domains` | 전체 도메인 삭제 |

#### 도메인 상태 (domain_status_command.rs)

| Command | 설명 |
|---------|------|
| `get_latest_status` | 최신 상태 목록 조회 |
| `check_domain_status` | 도메인 전체 상태 체크 (실행) |
| `get_domain_status_logs` | 날짜(date 문자열)별 로그 조회 |
| `get_domain_monitor_list` | monitor 체크 대상 목록 조회 |
| `set_domain_monitor_check_enabled` | domain_id별 체크 활성화 여부 설정 |

#### 도메인 그룹 (domain_group_commands.rs)

| Command | 설명 |
|---------|------|
| `get_domain_group_links` | 전체 도메인–그룹 링크 목록 조회 |
| `set_domain_groups` | 특정 도메인의 소속 그룹을 group_ids로 교체 |
| `set_group_domains` | 특정 그룹의 소속 도메인을 domain_ids로 교체 |
| `get_domains_by_group` | group_id로 해당 그룹 소속 도메인 목록 반환 |
| `get_groups_for_domain` | domain_id로 해당 도메인이 소속된 그룹 목록 반환 |
| `create_group` | 그룹 생성 (name) |
| `get_groups` | 전체 그룹 목록 조회 |
| `update_group` | id, name으로 그룹 수정 |
| `delete_group` | id로 그룹 삭제 및 해당 그룹 링크 제거 |

#### 로컬 라우트·프록시 (local_route_commands.rs)

| Command | 설명 |
|---------|------|
| `get_local_routes` | 등록된 도메인→로컬 매핑 목록 조회 |
| `add_local_route` | 라우트 추가 (domain, target_host, target_port) |
| `update_local_route` | 라우트 수정 |
| `remove_local_route` | 라우트 삭제 |
| `set_local_route_enabled` | 라우트 활성/비활성 토글 |
| `get_proxy_status` | 프록시 실행 상태 조회 |
| `start_local_proxy` | 로컬 프록시 시작 |
| `stop_local_proxy` | 로컬 프록시 중지 |
| `get_proxy_settings` | 프록시 설정 조회 |
| `set_proxy_dns_server` | DNS 서버 설정 |
| `set_proxy_port` | 프록시 포트 설정 |
| `set_proxy_reverse_ports` | 리버스 포트(HTTP/HTTPS) 설정 |
| `get_proxy_setup_url` | 프록시 설정·SSL 다운로드 URL |

#### 설정 (settings_commands.rs)

| Command | 설명 |
|---------|------|
| `export_all_settings` | 전체 설정·도메인·그룹·라우트·링크 일괄 내보내기 |
| `import_all_settings` | 전체 설정 일괄 가져오기 |

#### 기타

| Command | 설명 |
|---------|------|
| `greet` | 테스트용 (name → 인사 문자열) |
| `check_apis` | 스텁 (println만, 추후 API 유효성 테스트용) |

## 2. 프론트엔드 구현 계획 (src/routes/)

백엔드 기능을 사용자에게 제공하기 위한 TanStack Router 기반의 뷰 설계입니다.

### Route 설계 (현재 구현)

| 경로 | 역할 | 상태 |
|------|------|------|
| `/` | Dashboard: 전체 도메인 상태 요약 및 모니터링 현황판 | 구현됨 |
| `/domains` | Domain List: 등록된 도메인 관리 (수정, 삭제, 필터링) | 구현됨 |
| `/domains/dashboard` | Domains 대시보드 | 구현됨 |
| `/domains/regist` | Add Domain: 신규 URL 일괄 등록 UI | 구현됨 |
| `/domains/groups` | 도메인 그룹 관리 | 구현됨 |
| `/status` | 도메인 상태: 최신 체크 결과·실시간 모니터링 | 구현됨 |
| `/status/logs` | 상태 로그: 날짜별 체크 이력 | 구현됨 |
| `/status/settings` | 체크 설정 | 구현됨 |
| `/proxy` | Proxy: 로컬 라우트·프록시 설정·실행 | 구현됨 |
| `/proxy/dashboard` | 프록시 대시보드 | 구현됨 |
| `/proxy/setup` | 프록시 설정·SSL 다운로드 | 구현됨 |
| `/settings` | 앱 설정 | 구현됨 |
| `/domains/$id` | Domain Detail: 개별 도메인 상태 상세 정보 | 미구현 |

### 구현 전략 대응

- **일괄 등록**: 긴 URL 리스트를 한 번에 처리하는 UI/UX (regist_domains).
- **실시간성**: Tauri 커맨드를 주기적으로 호출하거나 이벤트를 수신하여 실시간 상태 반영.
- **그룹화**: 도메인을 서비스나 목적별로 그룹화하여 관리 (DomainGroupLink n:n).
- **로컬 라우팅**: 도메인을 로컬 서버로 연결하여 멀티 도메인·Mocking 테스트.

## 3. 핵심 기능 요구사항

- **일괄 등록**: 긴 URL 리스트를 한 번에 처리하는 UI/UX.
- **실시간성**: Tauri 커맨드를 주기적으로 호출하거나 이벤트를 수신하여 실시간 상태 반영.
- **그룹화**: 도메인을 서비스나 목적별로 그룹화하여 관리.
- **도메인–프록시 연동** (3단계): 모니터링 도메인 ↔ 프록시 라우트 검색·자동완성·양방향 연동.

---

마지막 업데이트: 2026-02-12
