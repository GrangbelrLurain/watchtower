---
title: 프론트엔드 전체 개요
description: 라우트 트리, 사이드바, FE 엔티티, FE–BE 연동 패턴, 페이지별 Command
keywords: [프론트엔드, 라우트, 엔티티, invoke, 사이드바]
when: FE 구조, 라우트, 연동 패턴 파악 시
---

# 프론트엔드 전체 개요

`src/` 하위 TanStack Router 라우트, 엔티티 타입, FE–BE 연동 패턴을 정리합니다.

---

## 1. 라우트 트리

| 경로 | 라우트 파일 | 비고 |
|------|-------------|------|
| `/` | `routes/index.tsx` | Home / Dashboard |
| `/about` | `routes/about.tsx` | 소개 |
| `/domains` | `routes/domains/index.tsx` | → `/domains/dashboard` 리디렉트 |
| `/domains/dashboard` | `routes/domains/dashboard.tsx` | 도메인 대시보드 |
| `/domains/regist` | `routes/domains/regist/index.tsx` | 도메인 일괄 등록 |
| `/domains/groups` | `routes/domains/groups/index.tsx` | 도메인 그룹 관리 |
| `/domains/$id` | `routes/domains/$id.tsx` | 도메인 상세 |
| `/monitor` | `routes/monitor/index.tsx` | 모니터 대시보드 |
| `/monitor/logs` | `routes/monitor/logs.tsx` | 모니터 로그 |
| `/monitor/settings` | `routes/monitor/settings.tsx` | 모니터 설정 |
| `/proxy` | `routes/proxy/index.tsx` | → `/proxy/dashboard` 리디렉트 |
| `/proxy/dashboard` | `routes/proxy/dashboard.tsx` | 프록시 대시보드 (로컬 라우팅 토글) |
| `/proxy/setup` | `routes/proxy/setup.tsx` | 프록시 설정 |
| `/apis` | `routes/apis/index.tsx` | → `/apis/dashboard` 리디렉트 |
| `/apis/dashboard` | `routes/apis/dashboard.tsx` | API 도메인 등록·관리 |
| `/apis/schema` | `routes/apis/schema.tsx` | API Schema 뷰어 |
| `/apis/logs` | `routes/apis/logs.tsx` | API 로그 |
| `/apis/mocks` | `routes/apis/mocks.tsx` | API Mocking |
| `/apis/tests` | `routes/apis/tests.tsx` | API 테스트 |
| `/apis/settings` | `routes/apis/settings.tsx` | API 설정 |
| `/settings` | `routes/settings/index.tsx` | 앱 설정 |

라우트 트리 자동 생성: `src/routeTree.gen.ts` (직접 수정하지 않음).

---

## 2. 사이드바 메뉴 (`__root.tsx`)

- **Home** → `/`
- **Domains** → `/domains/dashboard` (Dashboard, Regist, Groups)
- **Monitor** → `/monitor` (Logs, Settings)
- **Proxy** → `/proxy/dashboard` (Dashboard, Setup)
- **APIs** → `/apis/dashboard` (Dashboard, Schema, Logs)

---

## 3. FE 엔티티

| 파일 | 타입 | 필드 |
|------|------|------|
| `entities/domain/types/domain.d.ts` | Domain | id, url |
| `entities/domain/types/domain.d.ts` | DomainGroupLink | domain_id, group_id |
| `entities/domain/types/domain_monitor.ts` | DomainStatusLog | url, status, level, latency, ok, group, timestamp, errorMessage? |
| `entities/domain/types/domain_monitor.ts` | DomainMonitorWithUrl | domain_id, url, check_enabled, interval_secs |
| `entities/domain/types/domain_group.ts` | DomainGroup | id, name |
| `entities/proxy/types/local_route.ts` | LocalRoute | id, domain, target_host, target_port, enabled |
| `entities/proxy/types/local_route.ts` | ProxyStatusPayload | running, port, reverse_http_port?, reverse_https_port? |
| `entities/proxy/types/local_route.ts` | ProxySettings | dns_server, proxy_port, reverse_http_port?, reverse_https_port? |

---

## 4. 공통 UI 컴포넌트 (`shared/ui/`)

Button, Card, Input, Modal, Titlebar, Badge, Textarea, Typography, LoadingScreen, SearchableInput (compound 컴포넌트)

---

## 5. FE–BE 연동 (`shared/api/`)

### invokeApi 패턴

```ts
// commands.ts: Command별 Request/Response 타입
export interface ApiCommandMap {
  get_domains: { request?: undefined; response: Domain[] };
  regist_domains: { request: { payload: { urls: string[]; groupId?: number } }; response: Domain[] };
  // ...
}

// invoke.ts: 타입 안전 래퍼
const result = await invokeApi("get_domains");
```

### 인자 형식

- 인자 있으면: `{ payload: { ... } }` (camelCase)
- 인자 없으면: 생략

### 페이지별 사용 Command

| 라우트 | 사용 Command |
|--------|-------------|
| `/domains/dashboard` | get_domains, get_groups, update_domain_by_id, remove_domains, clear_all_domains |
| `/domains/regist` | get_groups, regist_domains |
| `/monitor` | get_latest_status, check_domain_status |
| `/monitor/logs` | get_domain_status_logs |
| `/monitor/settings` | get_domain_monitor_list, set_domain_monitor_check_enabled |
| `/domains/groups` | get_groups, get_domains, create_group, delete_group, update_group |
| `/proxy/dashboard` | get_proxy_status, start_local_proxy, stop_local_proxy, get_local_routes, add_local_route, ... |
| `/proxy/setup` | get_proxy_settings, set_proxy_*, get_proxy_setup_url |
| `/apis/dashboard` | get_domains, get_domain_api_logging_links, set_domain_api_logging, remove_domain_api_logging |
| `/settings` | export_all_settings, import_all_settings |
