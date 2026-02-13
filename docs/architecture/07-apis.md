---
title: APIs 기능
description: API 대시보드(도메인 등록), Schema 뷰·엔드포인트 테스트, 로그·프록시 패스스루 로깅
keywords: [api, 대시보드, 스키마, 로깅, 테스트, OpenAPI, 프록시]
when: API 대시보드·Schema·로그 기능 구현 시
---

# APIs 기능

API 도메인 등록·관리, Schema 뷰·엔드포인트 테스트, API 로그 기능을 정리합니다.

---

## 1. 전체 구조

```
/apis/
  dashboard/   ← API 도메인 등록·관리
  schema/      ← API Schema 뷰·엔드포인트 테스트
  logs/        ← API 로그 (테스트 결과 + 프록시 패스스루 로깅)
```

| 페이지 | 주요 기능 |
|--------|-----------|
| **apis/dashboard** | 등록된 도메인 리스트, Schema URL 관리, 로깅 on/off·바디 저장 토글, 스키마 다운로드 |
| **apis/settings** | 도메인 등록/해제 (2패널: 등록 도메인 / 미등록 도메인, 그룹별 분류, 검색) |
| **apis/schema** | Schema 페이지 자동 생성, 엔드포인트 테스트, 로그에서 request 불러오기, 테스트 결과 로그 추가 |
| **apis/logs** | API 테스트 결과 로깅, 프록시 패스스루 API 로깅 |

---

## 2. API Dashboard (`/apis/dashboard`)

### 2.1 목표

- 등록된 도메인에 대해 **로깅 활성화**, **바디 저장** 등 per-domain 설정
- **Schema URL** 등록·다운로드 관리
- 해당 도메인의 **스키마 뷰**로 바로 이동할 수 있는 진입점

### 2.2 UI 인터랙션

1. **등록된 도메인 리스트**: 등록된 도메인만 카드로 표시. 각 도메인에:
   - 로깅 on/off 토글
   - 바디 저장 on/off 토글
   - Schema URL 입력/편집 + 다운로드 버튼
   - 삭제 버튼 (API 등록 해제)
2. **도메인 등록/해제**는 `/apis/settings` 페이지에서 수행 (Dashboard에서는 Settings로의 링크 제공)

---

## 2-1. API Settings (`/apis/settings`)

### 목표

- Monitor Settings와 동일한 2패널 UI로 도메인 등록/해제 관리
- 그룹별 분류 + 검색으로 대량의 도메인도 효율적으로 관리

### UI 구조

```
[검색 Input: URL 또는 그룹명으로 필터링]

[API 등록된 도메인 (N)]              [미등록 도메인 (M)]
  ▼ Production (3)                    ▼ Production (5)
    ☑ api.example.com                   ☑ cdn.example.com
    ...                                 ...
  ▼ Default (2)                       ▼ Staging (10)
    ☑ test.example.com                  ...

  [← 선택 항목 등록 해제 (K)]        [선택 항목 API 등록 → (K)]
```

- 왼쪽 패널: `get_domain_api_logging_links`로 가져온 등록 도메인 (해제: `remove_domain_api_logging`)
- 오른쪽 패널: 전체 도메인 중 미등록 도메인 (등록: `set_domain_api_logging`)
- 그룹 데이터: `get_groups` + `get_domain_group_links`
- 그룹별 섹션 + 그룹 단위 선택 토글

---

## 3. API Schema (`/apis/schema`)

### 3.1 목표

- OpenAPI/Swagger spec을 import 또는 URL로 fetch → Schema 문서 자동 생성
- 각 엔드포인트에서 "Try it out" → Request 전송 → Response 표시
- 로그에서 해당 엔드포인트의 request를 불러와 테스트 가능
- 엔드포인트 테스트 결과를 로그에 추가

### 3.2 현재 구현 (Phase 3-1: 뷰어 + Request Form)

**BE:**
- `send_api_request` 커맨드: `reqwest`로 HTTP 요청 전송 (TLS 무시, 30s 타임아웃)
  - Payload: `{ method, url, headers, body }`
  - Result: `{ statusCode, headers, body, elapsedMs }`
- 스키마 파일은 `{app_data}/schemas/{domain_id}.json`에 저장 (Dashboard에서 다운로드)

**FE:**
- `openapi-parser.ts`: OpenAPI 3.x JSON 파서
  - `parseOpenApiSpec()`: paths → 엔드포인트 추출, 태그별 그룹화
  - `resolveSchema()`: `$ref`, `allOf` 재귀 해석
  - `generateExample()`: JSON Schema → 예시 JSON 자동 생성
- `/apis/schema` 페이지:
  - 도메인 선택 (Schema URL 등록 도메인만)
  - 왼쪽 패널: 태그별 엔드포인트 목록 + 검색
  - 오른쪽 패널: 엔드포인트 상세 + 파라미터 폼 + Request Body + Send Request + Response

### 3.3 향후 구현 (Phase 3-2: 모델/서비스 확장)

| 모델 | 역할 |
|------|------|
| `ApiSchema` | id, name, spec (OpenAPI JSON), source (import/url), domain_id |
| `DomainApiSchemaLink` | domain_id, schema_id |

- 버전 관리, 파일 업로드, diff 뷰어

---

## 4. API Logs (`/apis/logs`)

### 4.1 목표

- API 테스트 결과 로깅 (Schema 페이지에서 실행한 테스트)
- 등록된 API 도메인의 **프록시 패스스루 시 API 로깅** (실시간 트래픽 캡처)
- 로그 필터링 (도메인, 경로, 메서드, 상태코드, 기간)

### 4.2 관련 엔티티

| 모델 | 역할 |
|------|------|
| `ApiLogEntry` | id, timestamp, method, url, host, path, status_code, headers, body, source(test/proxy) |

---

## 5. 프록시 연동 (API 로깅 흐름)

프록시는 앱이 켜져 있으면 항상 작동하며, API 로깅은 이 전제 위에서 동작합니다. (프록시 상세: [06-proxy.md](06-proxy.md))

```
[프록시 요청 수신]
    │
    ├─ Host 추출 (소문자)
    │
    ├─ settings_map 조회 (Arc<RwLock<HashMap<String, (bool, bool)>>>)
    │   ├─ 등록됨 + logging_enabled=true → 로깅 수행
    │   │   └─ body_enabled=true → 바디도 저장
    │   └─ 미등록 또는 logging_enabled=false → 로깅 안 함
    │
    ├─ 로컬 라우팅 여부에 따라 로컬/패스스루 결정
    │
    └─ [로깅 대상이면] ApiLogService에 로그 저장
```

---

## 6. 향후 확장

| 기능 | 설명 | 선행 |
|------|------|------|
| Replay Request | 로그에서 Request 재전송, 수정 가능 | API Logs |
| Mock Response | 로그 Response를 목데이터로 프록시에 주입 | API Logs |
| 테스트 케이스 | Request Form에서 "테스트 케이스로 저장" → 재실행·회귀 테스트 | Schema + Logs |
