---
title: 3단계 API 도구
description: 프록시 Request/Response 로깅, Replay, Mock, Schema 기반 문서·Request Form
keywords: [api, 로깅, 재생, 목, OpenAPI, 스키마]
when: API 로깅·Replay·Mock·문서 기능 구현 시
related: [05-domain-local-routing, 06-proxy-architecture, 08-domain-proxy-integration]
---

# 3단계: API 도구 — 로깅·Replay·Mock·문서

[ROADMAP.md](../ROADMAP.md) 3단계 **도메인 프록시 및 트래픽 변조** 중, **프록시를 통과하는 API Request/Response**를 활용한 개발자 도구 기능을 정리한 문서입니다.

**목표**: 프록시를 통해 흐르는 API 트래픽을 기록·재생·목데이터로 활용하고, Schema 기반 문서와 실행 가능한 Form을 제공한다.

**선행**: [05-domain-local-routing.md](05-domain-local-routing.md) 도메인 로컬 라우팅, [06-proxy-architecture.md](06-proxy-architecture.md) 프록시 구성.

---

## 0. 기능 개요 및 의존성

```
[프록시] Request/Response 로깅 (1)
    ├── → Replay Request (2)
    ├── → Mock Response 프록시 (3)
    └── → (선택) 로그 기반 Schema 추론 (4)

[Schema] OpenAPI import / 추론 (4)
    └── → 문서 + Request Form (5)
         └── → 테스트 케이스 등록 (6)
```

| # | 기능 | 설명 | 선행 |
|---|------|------|------|
| 1 | **Request/Response 로깅** | 프록시를 통과하는 API 요청·응답을 저장 | 프록시 동작 |
| 2 | **Replay Request** | 로깅된 Request로 테스트 요청 재전송 | 1 |
| 3 | **Mock Response 프록시** | 로깅된 Response를 목데이터로 프록시에 주입 | 1 |
| 4 | **API Schema 문서 자동생성** | OpenAPI import 또는 로그 기반 추론 | 1 (추론 시) |
| 5 | **문서 내 Request Form** | 자동 생성된 문서에서 API 요청 전송 UI (Swagger UI 유사) | 4 |
| 6 | **테스트 케이스 등록** | Request 양식(Form·로그)을 테스트 케이스로 저장, 재실행·회귀 테스트 | 5 |

---

## 1. Request/Response 로깅 (프록시)

### 1.1 목표

- 프록시를 통과하는 HTTP/HTTPS Request, Response를 저장.
- 도메인·경로·메서드·상태코드·헤더·바디(선택) 등을 기록.
- ROADMAP 3단계 "로그 및 데이터 수집"과 연계.

### 1.2 BE 필요 항목

| 구분 | 항목 |
|------|------|
| **모델** | `ApiLogEntry`: id, timestamp, method, url, host, path, status_code, request_headers(선택), request_body(선택), response_headers(선택), response_body(선택) |
| **저장소** | `app_data_dir/api_logs/` — 날짜별 또는 롤링 파일 (JSON, SQLite 등) |
| **서비스** | ApiLogService: 로깅 파이프라인, 조회, 필터(도메인·경로·메서드·기간) |
| **프록시 연동** | local_proxy에서 요청/응답 처리 시 ApiLogService 호출 (옵션: 로깅 On/Off, 바디 저장 On/Off) |
| **Commands** | `get_api_logs`, `clear_api_logs`, `set_api_logging_enabled` |

### 1.3 FE 필요 항목

| 구분 | 항목 |
|------|------|
| **페이지** | `/proxy/logs` 또는 `/ logs` — 로그 목록·필터·상세 보기 |
| **설정** | 로깅 활성화 토글, 바디 저장 토글 (설정 페이지 또는 프록시 페이지) |

---

## 2. Replay Request (로깅된 Request로 테스트)

### 2.1 목표

- 로깅된 Request를 선택해 재전송.
- 헤더·바디 수정 후 재전송 (선택).

### 2.2 BE 필요 항목

| 구분 | 항목 |
|------|------|
| **Command** | `replay_api_request`: log_id 또는 raw request 제공 → 실제로 HTTP 요청 전송 후 응답 반환 |
| **권한** | 네트워크 outbound (이미 프록시에서 사용 중) |

### 2.3 FE 필요 항목

| 구분 | 항목 |
|------|------|
| **UI** | 로그 목록에서 "Replay" 버튼, (선택) 편집 모달 |
| **결과** | Replay 응답 표시 (상태코드, 헤더, 바디) |

---

## 3. Mock Response 프록시 (로깅된 Response로 목데이터)

### 3.1 목표

- 로깅된 Response를 "이 도메인·경로에 대한 Mock"으로 매핑.
- 실제 백엔드 대신 캡처된 Response를 반환해 FE 개발·테스트 지원.

### 3.2 BE 필요 항목

| 구분 | 항목 |
|------|------|
| **모델** | `MockMapping`: id, domain, path_pattern, method, source_log_id 또는 response_snapshot, enabled |
| **저장소** | `app_data_dir/mock_mappings.json` |
| **서비스** | MockMappingService: CRUD, 프록시에 Mock 규칙 전달 |
| **프록시 확장** | 요청 수신 시 Mock 규칙 매칭 → 매칭되면 저장된 Response 반환, 아니면 기존 라우팅 |
| **Commands** | `get_mock_mappings`, `add_mock_mapping`, `remove_mock_mapping`, `set_mock_mapping_enabled` |

### 3.3 FE 필요 항목

| 구분 | 항목 |
|------|------|
| **UI** | 로그에서 "Use as Mock" 버튼 → Mock 매핑 추가 |
| **페이지** | Mock 매핑 목록·CRUD·활성화 토글 (프록시 또는 별도 페이지) |

---

## 4. API Schema로 문서 자동생성

### 4.1 목표

- OpenAPI/Swagger spec import → 문서 생성.
- (선택) 로그 기반 추론 → 엔드포인트·메서드·스키마 추정.

### 4.2 BE 필요 항목

| 구분 | 항목 |
|------|------|
| **모델** | `ApiSchema`: id, name, spec (OpenAPI JSON), source (import / inferred) |
| **저장소** | `app_data_dir/api_schemas/` |
| **서비스** | ApiSchemaService: import, 저장, 조회 |
| **Commands** | `import_api_schema`, `get_api_schemas`, `get_api_schema_by_id`, `remove_api_schema` |

### 4.3 FE 필요 항목

| 구분 | 항목 |
|------|------|
| **페이지** | `/api-docs` 또는 `/proxy/docs` — Schema 목록, 문서 뷰어 |
| **Import** | OpenAPI JSON/YAML 파일 업로드 |

---

## 5. 문서 내 Request Form (API 실행 UI)

### 5.1 목표

- Schema 기반으로 엔드포인트·메서드·파라미터 표시.
- Swagger UI처럼 각 엔드포인트에서 "Try it out" → Request 전송 → Response 표시.

### 5.2 BE 필요 항목

| 구분 | 항목 |
|------|------|
| **Command** | `send_api_request`: method, url, headers, body → HTTP 요청 전송 후 응답 반환 (Replay와 유사) |
| **또는** | Replay용 `replay_api_request`를 확장해 raw request 지원 |

### 5.3 FE 필요 항목

| 구분 | 항목 |
|------|------|
| **UI** | Schema 문서 화면에서 각 엔드포인트별 Form (method, URL, headers, body 입력) |
| **실행** | "Send" 클릭 → invoke → Response 표시 |

---

## 6. 테스트 케이스 등록 (API Request 양식 기반)

### 6.1 목표

- Request Form 또는 로그에서 "테스트 케이스로 저장" 버튼으로 등록.
- 저장된 케이스를 재실행해 회귀 테스트·스모크 테스트 지원.
- (선택) 기대 응답(예상 상태코드·바디) 지정 → 자동 Pass/Fail 판정.

### 6.2 BE 필요 항목

| 구분 | 항목 |
|------|------|
| **모델** | `ApiTestCase`: id, name, method, url, headers, body, expected_status(선택), expected_body_pattern(선택), schema_id(선택), created_at |
| **저장소** | `app_data_dir/api_test_cases.json` |
| **서비스** | ApiTestCaseService: CRUD, 실행 |
| **Commands** | `add_api_test_case`, `get_api_test_cases`, `update_api_test_case`, `remove_api_test_case`, `run_api_test_case`, `run_api_test_cases` (배치) |
| **실행** | `run_api_test_case`: 해당 Request로 HTTP 전송 → 응답 반환, (선택) expected와 비교해 Pass/Fail |

### 6.3 FE 필요 항목

| 구분 | 항목 |
|------|------|
| **UI** | Request Form·로그 상세에서 "테스트 케이스로 저장" 버튼 |
| **페이지** | `/proxy/tests` 또는 문서 내 "테스트 케이스" 탭 — 목록·CRUD·실행 |
| **실행** | 단일/배치 실행 버튼, 결과(Pass/Fail, 응답) 표시 |

### 6.4 등록 소스

| 소스 | 동작 |
|------|------|
| **Request Form** | Form에서 만든 method, url, headers, body → "Save as test case" → name 입력 후 저장 |
| **API 로그** | 로그 상세에서 "테스트 케이스로 저장" → (선택) 수정 후 저장 |
| **Replay 결과** | Replay 후 "이 요청을 테스트 케이스로 저장" |

---

## 7. 체크리스트 요약

| 구분 | 항목 |
|------|------|
| **BE** | ApiLogEntry 모델·저장소, ApiLogService |
| **BE** | 프록시 레이어에 로깅 훅 연동 |
| **BE** | get_api_logs, clear_api_logs, set_api_logging_enabled |
| **BE** | replay_api_request (Replay) |
| **BE** | MockMapping 모델·저장소, MockMappingService |
| **BE** | 프록시에 Mock 응답 주입 로직 |
| **BE** | get_mock_mappings, add_mock_mapping, remove_mock_mapping, set_mock_mapping_enabled |
| **BE** | ApiSchema 모델·저장소, ApiSchemaService |
| **BE** | import_api_schema, get_api_schemas, get_api_schema_by_id, remove_api_schema |
| **BE** | send_api_request (문서 Form용) |
| **BE** | ApiTestCase 모델·저장소, ApiTestCaseService |
| **BE** | add_api_test_case, get_api_test_cases, update_api_test_case, remove_api_test_case |
| **BE** | run_api_test_case, run_api_test_cases (배치) |
| **FE** | API 로그 목록·필터·상세·Replay 버튼 |
| **FE** | Mock 매핑 목록·CRUD·"Use as Mock" |
| **FE** | Schema import·문서 뷰어 |
| **FE** | 문서 내 Request Form·실행·Response 표시 |
| **FE** | Request Form·로그에서 "테스트 케이스로 저장" 버튼 |
| **FE** | 테스트 케이스 목록·CRUD·단일/배치 실행·결과(Pass/Fail) 표시 |

---

참고: [ROADMAP.md](../ROADMAP.md) 3단계, [03-roadmap-tasks.md](03-roadmap-tasks.md), [06-proxy-architecture.md](06-proxy-architecture.md).
