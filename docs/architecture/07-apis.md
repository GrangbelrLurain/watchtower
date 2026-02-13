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
| **apis/dashboard** | 도메인 검색·추가, 등록된 도메인 리스트, 삭제, 스키마 뷰 이동, 로깅 on/off·바디 저장 토글 |
| **apis/schema** | Schema 페이지 자동 생성, 엔드포인트 테스트, 로그에서 request 불러오기, 테스트 결과 로그 추가 |
| **apis/logs** | API 테스트 결과 로깅, 프록시 패스스루 API 로깅 |

---

## 2. API Dashboard (`/apis/dashboard`)

### 2.1 목표

- Domain 마스터 목록에서 **API로 사용할 도메인을 등록**(링크)
- 등록된 도메인에 대해 **로깅 활성화**, **바디 저장** 등 per-domain 설정
- 해당 도메인의 **스키마 뷰**로 바로 이동할 수 있는 진입점

### 2.2 UI 인터랙션

1. **검색하여 추가**: 모든 도메인을 처음부터 표시하지 않음. 검색 입력으로 도메인을 찾아 API 등록 리스트에 추가.
2. **등록된 도메인 리스트**: 등록된 도메인만 카드/테이블로 표시. 각 도메인에:
   - 로깅 on/off 토글
   - 바디 저장 on/off 토글
   - "스키마 보기" 버튼 → `/apis/schema?domainId=N`
   - 삭제 버튼 (API 등록 해제)
3. **삭제**: 등록 해제 시 해당 도메인의 로깅 링크 제거 (도메인 자체는 마스터에서 유지)

---

## 3. API Schema (`/apis/schema`)

### 3.1 목표

- OpenAPI/Swagger spec을 import 또는 URL로 fetch → Schema 문서 자동 생성
- 각 엔드포인트에서 "Try it out" → Request 전송 → Response 표시
- 로그에서 해당 엔드포인트의 request를 불러와 테스트 가능
- 엔드포인트 테스트 결과를 로그에 추가

### 3.2 관련 엔티티

| 모델 | 역할 |
|------|------|
| `ApiSchema` | id, name, spec (OpenAPI JSON), source (import/url), domain_id |
| `DomainApiSchemaLink` | domain_id, schema_id |

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
