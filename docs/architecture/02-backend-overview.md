---
title: 백엔드 전체 개요
description: Tauri Commands, 모델, 서비스, 저장소, 마이그레이션, FE 연동 패턴
keywords: [백엔드, 커맨드, 모델, 서비스, 저장소, 마이그레이션, 시나리오, 모킹]
when: BE 구조, Command, 모델·서비스 파악 시
---

# 백엔드 전체 개요

`src-tauri/src/`의 Tauri Commands, 모델, 서비스, 저장소를 정리합니다.

---

## 1. 데이터 설계 규칙

- **Join 테이블**: n:n 관계는 `*_link` / `*Link` 접미사 통일 (예: `DomainGroupLink`)
- **응답 포맷**: 모든 Command는 `ApiResponse<T>` (`success`, `message`, `data`) 반환
- **인자 직렬화**: `#[serde(rename_all = "camelCase")]` -> FE에서 camelCase로 전달

---

## 2. 모델

| 모델 | 파일 | 필드 | 비고 |
|------|------|------|------|
| **Domain** | domain.rs | id, url | 마스터 목록 |
| **SubPage** | sub_page.rs | id, domain_id, path, name, description | 도메인 하위 라우트 (예: /login) |
| **TestScenario** | test_scenario.rs | id, sub_page_id, name, description, is_active, steps | 하위 페이지의 테스트 흐름 |
| **ScenarioStep** | scenario_step.rs | id, scenario_id, step_order, api_endpoint_id, payload_template, assertions, extract_variables | 시나리오 단위 호출 |
| **MockRule** | mock_rule.rs | id, scenario_id, api_endpoint_id, request_hash, response_status, response_headers, response_body | Golden Master 데이터 |
| **DomainGroup** | domain_group.rs | id, name | 그룹 |
| **DomainGroupLink** | domain_group_link.rs | domain_id, group_id | 도메인-그룹 n:n |
| **DomainMonitorLink** | domain_monitor_link.rs | domain_id, check_enabled, interval_secs | 모니터 체크 대상 |
| **DomainStatusLog** | domain_status_log.rs | id, domain_id, status, level, ok, group, timestamp | 체크 결과 |
| **LocalRoute** | local_route.rs | id, domain, target_host, target_port, enabled | 프록시 로컬 라우트 |
| **ProxySettings** | proxy_settings.rs | dns_server, proxy_port, reverse_http_port, reverse_https_port | 프록시 설정 |
| **DomainApiLoggingLink** | domain_api_logging_link.rs | domain_id, logging_enabled, body_enabled | API 로깅 대상 |
| **ApiResponse\<T>** | api_response.rs | success, message, data | 공통 응답 |

---

## 3. 서비스·저장소

| 서비스 | 저장소 | 역할 |
|--------|--------|------|
| DomainService | `domains.json` | 도메인 CRUD |
| SubPageService | `sub_pages.json` | 하위 페이지 관리 |
| ScenarioService | `test_scenarios.json` | 시나리오 및 스텝 관리 |
| ScenarioRunnerService | (메모리) | 시나리오 실행 (Chaining, 변수 치환) |
| MockingService | `mock_rules.json` | 모킹 응답 제공 및 레코딩 |
| DomainGroupService | `groups.json` | 그룹 CRUD |
| DomainGroupLinkService | `domain_group_links.json` | 도메인-그룹 n:n |
| DomainMonitorService | `domain_monitor_links.json` + `logs/` | 상태 체크 |
| LocalRouteService | `domain_local_routes.json` | 프록시 라우트 |
| ProxySettingsService | `proxy_settings.json` | 프록시 설정 |
| ApiLoggingSettingsService | `domain_api_logging_links.json` | API 로깅 설정 |
| local_proxy | 메모리 | 프록시 서버, MockingService와 연동 |

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

### [추가] 하위 페이지 (sub_page_commands.rs)
| Command | 설명 |
|---------|------|
| `get_sub_pages` / `add_sub_page` / `update_sub_page` / `delete_sub_page` | 하위 페이지 CRUD |

### [추가] 테스트 시나리오 (scenario_commands.rs)
| Command | 설명 |
|---------|------|
| `get_scenarios_by_sub_page` / `create_scenario` / `update_scenario` / `delete_scenario` | 시나리오 CRUD |
| `add_scenario_step` / `update_scenario_step` / `remove_scenario_step` | 시나리오 스텝 관리 |
| `run_scenario` | 수동 시나리오 실행 트리거 |

### [추가] 모킹 (mocking_commands.rs)
| Command | 설명 |
|---------|------|
| `get_mock_rules` | 모킹 룰 조회 |
| `record_scenario_as_mock` | 시나리오 실행 결과를 Mock으로 레코딩 |
| `toggle_mock_rule` | 모킹 룰 활성화/비활성화 |

---

## 5. 백그라운드 동작

- **도메인 상태 체크**: 120초 간격 폴링 (향후 하위 페이지 체크 포함)
- **시나리오 러너**: 비동기 태스크로 실행, 이전 Step 결과(변수)를 다음 Step에 전달(Chaining)
- **프록시**: 앱 기동 시 자동 실행. 요청 인입 시 `MockingService`를 먼저 확인하여 Mock 응답 반환

---

## 6. 마이그레이션 및 버전 관리

기존 배열 기반의 저장 포맷에서 스키마 버전을 관리하기 위한 래퍼(Wrapper) 구조를 사용하며, **순차 마이그레이션(Sequential Migration)** 전략을 취합니다.

### 6.1 JSON 파일 포맷
모든 영구 저장 JSON 파일은 `VersionedData<T>` 구조체를 사용하여 직렬화됩니다.
```json
{
  "schema_version": 2,
  "data": [
    // 실제 데이터 배열 또는 객체
  ]
}
```

### 6.2 순차 마이그레이션 전략 (storage::migration)
버전 건너뛰기 없이 한 단계씩 차례대로 변환하여 최종 버전까지 도달하는 **Migration Chain** 방식을 사용합니다. (예: `v1` -> `v2` -> `v3`)

- **실행 시점**: 앱 시작 시 (Tauri `setup` 훅) 서비스 인스턴스를 생성하기 전에 실행됩니다.
- **프로세스**:
  1. 현재 파일의 `schema_version`을 판별합니다. (필드가 없으면 `v1`)
  2. 현재 버전이 최신 버전보다 낮다면, 바로 다음 버전으로 변환하는 함수를 호출합니다.
  3. 변환된 데이터를 가지고 다시 다음 버전으로의 마이그레이션이 필요한지 확인합니다.
  4. 최신 버전에 도달할 때까지 이 과정을 **재귀적/순차적으로 반복**합니다.
- **백업**: 마이그레이션 시작 전 원본 파일을 `.bak` 확장자로 백업하여 실패 시 복구를 보장합니다.

### 6.3 서비스의 파일 접근 (storage::versioned)
- **`load_versioned<T>`**: 파일을 읽을 때 항상 최신 버전의 데이터임을 기대하고 `data` 필드를 추출합니다. 마이그레이션이 선행되었으므로 서비스 레이어는 버전 교체 로직에 신경 쓰지 않아도 됩니다.
- **`save_versioned<T>`**: 저장 시 항상 현재 시스템의 최신 `schema_version`을 할당하여 저장합니다.