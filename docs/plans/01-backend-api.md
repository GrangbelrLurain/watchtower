---
title: 백엔드 API 정리
description: Tauri Commands 목록, 모델·서비스·저장소 매핑
keywords: [백엔드, api, 커맨드, 타우리, 도메인]
when: Command 호출, BE 모델·서비스 구조 파악 시
related: [04-fe-be-connection, 02-frontend-routes, 09-domain-use-cases, 10-json-schema-migration, conventions/00-rust-conventions]
---

# 백엔드 API 정리

`src-tauri/src/lib.rs`의 `invoke_handler`에 등록된 Tauri Commands와 모델·서비스·저장소 매핑을 정리합니다.

## 데이터 설계·네이밍 규칙

- **Join(연결) 테이블**: 엔티티 간 n:n 관계를 담는 모델·저장소는 **`link` 접미사**로 통일한다.
  - 예: `DomainGroupLink`, `domain_group_links.json` (도메인–그룹 연결)
  - 다른 접미사(join, mapping, relation 등) 대신 `*_link` / `*Link`를 사용한다.

## 모델

| 모델 | 필드 | 비고 |
|------|------|------|
| **Domain** | `id` (u32), `url` (String) | domain.rs — **마스터 목록**. Monitor·Proxy·Api의 선행 조건 |
| **DomainGroup** | `id` (u32), `name` (String) | domain_group.rs |
| **DomainGroupLink** | `domain_id` (u32), `group_id` (u32) | domain_group_link.rs — 도메인–그룹 n:n |
| **DomainMonitorLink** | `domain_id`, `check_enabled`, `interval` 등 | Monitor: 체크 대상 + 옵션 ([09-domain-use-cases](09-domain-use-cases.md)) |
| **DomainStatusLog** | `id`, `domain_id`, `status`, `level`, `ok`, `group`, `timestamp` | 체크 결과 구조. 최신은 메모리(`last_checks`), 과거는 `logs/{date}.json` |
| **LocalRoute** | `id`, `domain`, `target_host`, `target_port`, `enabled` | 프록시 라우트. (→ domain_id 연결 목표, [09-domain-use-cases](09-domain-use-cases.md)) |
| **ApiSchema** | `id`, `url`, `name` 등 | _(예정)_ API 스키마 다운로드 URL. [09-domain-use-cases](09-domain-use-cases.md) |
| **DomainApiSchemaLink** | `domain_id`, `schema_id` | _(예정)_ 도메인–스키마 연결 |
| **ApiResponse\<T>** | `success` (bool), `message` (String), `data` (T) | 일관된 응답 포맷 (api_response.rs) |

### Domain 중심 용도별 구조

Domain은 **마스터 목록**이다. Monitor·Proxy·Api에 등록되려면 Domain에 먼저 있어야 한다.

| 용도 | 엔티티 | 역할 |
|------|--------|------|
| Monitor | DomainMonitorLink | HEAD 요청으로 상태 감시 대상 |
| Proxy | LocalRoute | 프록시로 로컬에 보낼 대상 |
| Api | ApiSchema + DomainApiSchemaLink | 스키마·API 기능이 필요한 대상 |

자세한 내용: [09-domain-use-cases.md](09-domain-use-cases.md)

### status 체크 관련 엔티티 분리

- **DomainMonitorLink** — 체크 대상 도메인 목록 + 관련 옵션 (domain_id, check_enabled, interval 등). `domain_monitor_links.json`에 유지.
- **DomainStatusLog** — 체크 결과 구조. 최신은 메모리(`last_checks`), 과거 기록은 `logs/{date}.json`에 저장. 별도 Result 구조 없이 DomainStatusLog가 최신·과거 모두 표현.

## 등록된 Commands 목록

### 도메인 (domain_commands.rs)

| Command | 설명 | 사용 서비스 |
|---------|------|-------------|
| `regist_domains` | URL 목록 + 선택적 group_id로 도메인 일괄 등록 후 해당 그룹에 링크 | DomainService, DomainGroupLinkService |
| `get_domains` | 전체 도메인 목록 조회 | DomainService |
| `get_domain_by_id` | id로 도메인 상세 조회 | DomainService |
| `update_domain_by_id` | id로 url만 수정 (그룹은 link로 관리) | DomainService |
| `remove_domains` | id로 도메인 삭제 및 해당 도메인 링크 제거 | DomainService, DomainGroupLinkService |
| `import_domains` | Domain 배열로 JSON 임포트 | DomainService |
| `clear_all_domains` | 전체 도메인 삭제 | DomainService |

### 도메인 Monitor (domain_monitor_command.rs)

| Command | 설명 | 사용 서비스 |
|---------|------|-------------|
| `get_latest_status` | 최신 상태 목록 조회 | DomainMonitorService |
| `check_domain_status` | 도메인 전체 상태 체크 (실행) | DomainMonitorService, DomainService, DomainGroupService, DomainGroupLinkService |
| `get_domain_status_logs` | 날짜(date 문자열)별 로그 조회 | DomainMonitorService |

### 도메인 그룹 (domain_group_commands.rs)

| Command | 설명 | 사용 서비스 |
|---------|------|-------------|
| `get_domain_group_links` | 전체 도메인–그룹 링크 목록 조회 | DomainGroupLinkService |
| `set_domain_groups` | 특정 도메인의 소속 그룹을 group_ids로 교체 | DomainGroupLinkService |
| `set_group_domains` | 특정 그룹의 소속 도메인을 domain_ids로 교체 | DomainGroupLinkService |
| `get_domains_by_group` | group_id로 해당 그룹 소속 도메인 목록 반환 | DomainService, DomainGroupLinkService |
| `get_groups_for_domain` | domain_id로 해당 도메인이 소속된 그룹 목록 반환 | DomainGroupService, DomainGroupLinkService |
| `create_group` | 그룹 생성 (name) | DomainGroupService |
| `get_groups` | 전체 그룹 목록 조회 | DomainGroupService |
| `update_group` | id, name으로 그룹 수정 | DomainGroupService |
| `delete_group` | id로 그룹 삭제 및 해당 그룹 링크 제거 | DomainGroupService, DomainGroupLinkService |

### 기타

| Command | 설명 |
|---------|------|
| `greet` | 테스트용 (name → 인사 문자열) |
| `check_apis` | 스텁 (println만, 추후 API 유효성 테스트용) |

## 서비스·저장소

| 서비스 | 저장소 경로 | 역할 |
|--------|-------------|------|
| DomainService | `app_data_dir/domains.json` | 도메인 CRUD, 임포트/전체삭제 |
| DomainGroupService | `app_data_dir/groups.json` | 그룹 CRUD |
| DomainGroupLinkService | `app_data_dir/domain_group_links.json` | 도메인–그룹 n:n 링크 CRUD |
| DomainMonitorService | `app_data_dir/logs/` (로그), `domain_monitor_links.json`, 메모리 `last_checks` | monitor 체크 대상, 상태 체크, 최신 결과·날짜별 로그 조회 |

## 백그라운드 동작

- **2분 주기 도메인 상태 체크**: `setup`에서 `tauri::async_runtime::spawn`으로 루프 실행. `status_service.check_domains(&domain_service, &group_service, &link_service)` 호출 후 120초 대기 반복.

## Command → Service 매핑 요약

- **DomainService**: regist_domains, get_domains, get_domain_by_id, update_domain_by_id, remove_domains, import_domains, clear_all_domains, check_domain_status(읽기), get_domains_by_group(읽기)
- **DomainGroupService**: get_groups_for_domain(읽기), create_group, get_groups, update_group, delete_group, check_domain_status(읽기)
- **DomainGroupLinkService**: regist_domains(링크 추가), remove_domains(링크 제거), get_domain_group_links, set_domain_groups, set_group_domains, get_domains_by_group, get_groups_for_domain, delete_group(링크 제거), check_domain_status(읽기)
- **DomainStatusService**: get_latest_status, check_domain_status, get_domain_status_logs

## FE invoke 래퍼 (현재)

- **위치**: `src/shared/api/` — `ApiCommandMap` (commands.ts), `invokeApi` (invoke.ts)
- **방식**: Command key별 Request/Response 타입을 수동 정의, `invokeApi<C>(cmd, request?)` 로 타입 안전 호출
- **인자 규칙**: 인자가 있는 Command는 `{ payload: { ... } }` 형태로 전달 (객체 단위 통일)
- **참고**: [04-fe-be-connection.md](04-fe-be-connection.md) invoke 패턴, [00-rust-conventions.md](../conventions/00-rust-conventions.md) Command 규칙

## (선택) Command 타입 자동 생성

Command 수·변경 빈도가 늘어나면 **Rust → TypeScript 자동 생성** 도입을 검토할 수 있다.

| 도구 | 설명 |
|------|------|
| **tauri-typegen** | `#[tauri::command]` 함수를 파싱해 `types.ts`, `commands.ts` 자동 생성. build.rs 통합, (선택) Zod 검증 |
| **tauri-ts-generator** | CLI 기반, 비슷한 역할 |

**도입 시 고려**:
- `ApiResponse<T>`, `Result<_, String>` 패턴 호환 여부 확인
- CI에서 `tauri-typegen generate`를 프론트 빌드 전 단계로 실행
- 현재 수동 ApiCommandMap 대비 마이그레이션 비용 vs 유지보수 이득
