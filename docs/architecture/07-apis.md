---
title: APIs 및 테스트 시나리오 기능
description: API 대시보드, Schema 뷰, 테스트 시나리오 체이닝(Chaining), API 로그
keywords: [api, 시나리오, 체이닝, 모킹, 스키마, 테스트, OpenAPI, 프록시]
when: API 대시보드·Schema·시나리오 기능 구현 시
---

# APIs 및 테스트 시나리오 기능

API 도메인 등록·관리, Schema 뷰·단일 엔드포인트 테스트, API 로그 기능과 더불어 **하위 페이지별 테스트 시나리오 파이프라인(Chaining) 및 모킹** 기능을 정리합니다.

---

## 1. 전체 구조

```
/apis/
  dashboard/   ← API 도메인 등록·관리 (로깅 설정, 스키마 관리)
  settings/    ← 도메인 등록/해제 관리 (2패널 UI)
  schema/      ← API Schema 뷰·단일 엔드포인트 수동 테스트
  logs/        ← API 로그 (테스트 결과 + 프록시 패스스루 트래픽 캡처)
  scenarios/   ← [추가] 하위 페이지 기반 테스트 시나리오 구성 및 실행
```

---

## 2. API Dashboard & Settings (`/apis/dashboard`, `/apis/settings`)

### 2.1 API Dashboard
- 등록된 도메인 리스트를 카드로 표시합니다.
- 각 도메인에 대해 **로깅 활성화**, **바디 저장** on/off 토글을 제공합니다.
- **Schema URL** 등록/편집 및 다운로드 버튼, 삭제 버튼을 제공합니다.

### 2.2 API Settings
- Monitor Settings와 동일한 **2패널 UI**(등록된 도메인 / 미등록 도메인)로 도메인을 관리합니다.
- 그룹별 분류 + 검색 기능으로 대량의 도메인을 효율적으로 등록/해제(`set_domain_api_logging`, `remove_domain_api_logging`)합니다.

---

## 3. API Schema (`/apis/schema`)

- OpenAPI/Swagger spec을 import 또는 URL로 fetch하여 **Schema 문서 자동 생성**
- 각 엔드포인트에서 "Try it out" 폼을 통해 Request 전송 및 Response 표시
- **BE**: `send_api_request` 커맨드로 `reqwest` 기반 HTTP 요청 전송 (Payload: `{ method, url, headers, body }`)
- **FE**: `openapi-parser.ts` (OpenAPI 3.x 파서)가 paths 분석, `$ref` 해석, 예시 JSON 자동 생성 기능 수행

---

## 4. API Logs (`/apis/logs`) 및 프록시 연동

### 4.1 로그 수집 목적
- API 테스트 결과 보관
- **프록시 패스스루 시 실시간 트래픽 캡처** (로그 필터링: 도메인, 경로, 메서드, 상태코드)
- 캡처된 트래픽을 바탕으로 하위 페이지별 사용 API를 자동으로 리스트업(로드맵 5단계)하는 데 활용.

### 4.2 프록시 연동 (API 로깅 흐름)
프록시는 항상 동작하며 다음과 같이 로그를 남깁니다.
1. Host 추출
2. 등록된 도메인 중 `logging_enabled=true`인지 확인 (`body_enabled` 확인)
3. 로컬 라우팅/모킹/패스스루 결정 후, 대상 서버로 패스스루될 때 `ApiLogService`에 로그 저장

---

## 5. [추가] 테스트 시나리오 파이프라인 (Chaining)

단일 엔드포인트 테스트를 넘어, **로그인 성공 후 받은 토큰을 다음 API 호출의 헤더에 자동으로 주입하는 등** API 간 데이터 전달(Chaining)이 가능하도록 설계됩니다.

### 5.1 구성 요소

| 컴포넌트 | 설명 |
|---|---|
| **Scenario Editor** | 하위 페이지별로 실행할 API Step 목록을 Drag & Drop으로 순서 배치하고, 페이로드 및 Assertion 규칙 작성 |
| **Variable Extraction** | 특정 Step 응답 JSON에서 값을 추출해 변수(예: `{{user_token}}`)로 저장 |
| **Template Substitution** | 다음 Step 요청 시 헤더/바디에 `{{user_token}}`이 포함되어 있으면 치환하여 발송 |
| **Assertion Engine** | 응답 Status, 필수 필드 존재 여부 등 정의된 조건이 맞는지 검증 |

### 5.2 실행 흐름 (Scenario Runner)

1. 수동/스케줄러에 의해 `TestScenario` 실행 시작
2. Step 1 실행 (예: POST /login)
3. Step 1 응답 수신 → **Assertion 검증** → 성공 시 **변수 추출**
4. Step 2 준비 (예: GET /profile) → 헤더에 추출된 변수 삽입 → 실행
5. 시나리오 완료 후 Pass/Fail 상세 내역 표시

---

## 6. [추가] 골든 마스터 레코딩 및 Mocking (로드맵 9단계)

성공적으로 실행된 시나리오의 응답 결과를 저장하여, 이후 프론트엔드 개발 시 백엔드 없이 안정적인 UI 테스트를 가능하게 합니다.

1. **레코딩 (Recording)**: 시나리오 러너가 성공적으로 끝난 경우 "결과를 골든 마스터로 레코딩" 트리거.
2. **저장**: 각 Step의 요청 식별자(Request Hash)와 응답 데이터가 `mock_rules.json`에 저장됨.
3. **인터셉트 (Intercept)**: 프록시가 클라이언트의 요청을 받을 때, 등록된 Mock Rule과 일치하면 실제 백엔드로 보내지 않고 **저장된 골든 마스터 JSON을 즉시 반환(Mocking)**.