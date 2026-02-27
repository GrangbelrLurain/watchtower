---
title: 프록시 기능 (모킹 포함)
description: 프록시 아키텍처, 포워드/리버스, 로컬 라우팅, 모킹(Mocking) 인터셉터
keywords: [프록시, 아키텍처, 로컬라우팅, 모킹, Mocking, 리버스, TLS]
when: 프록시 구현·구조 및 모킹 파악 시
---

# 프록시 기능 (모킹 포함)

Watchtower 로컬 프록시의 아키텍처, 라우팅, 트래픽 흐름 및 **응답 모킹(Mocking)** 구조를 정리합니다.

---

## 1. 설계 원칙

### 1.1 프록시 상시 동작

- **프록시는 앱이 켜져 있으면 항상 작동한다.**
- Proxy 대시보드의 **on/off 스위치**는 프록시 자체가 아니라 **"로컬 라우팅" 활성화 여부**를 토글.
  - **On**: 등록된 도메인 요청을 로컬 서버로 라우팅
  - **Off**: 모든 요청을 원래 서버로 패스스루 (프록시는 계속 동작)
- API 로깅 및 **Mocking**은 프록시가 항상 동작하는 전제에서 작동.

### 1.2 라우팅 및 인터셉트 판단

**"어디로 보낼지 / 어떻게 응답할지"는 항상 프록시 서버가 결정한다.**

1. **Mocking Intercept**: 해당 요청에 대한 `MockRule`이 활성화되어 있으면, 서버로 요청을 보내지 않고 **저장된 응답(Golden Master)을 즉시 반환**합니다.
2. **Local Routing**: Mocking 대상이 아닐 경우, `LocalRoute` 규칙을 확인하여 로컬 백엔드로 라우팅합니다.
3. **Pass-through**: 위 조건에 모두 해당하지 않으면 실제 대상 호스트로 요청을 포워딩합니다 (이 과정에서 API 로깅 수행).

---

## 2. 포트 구성

```
┌────────────────────────────────────────────────────────────┐
│                 Watchtower 프록시 (127.0.0.1)               │
├──────────────────┬──────────────────┬──────────────────────┤
│ 포워드 프록시     │ 리버스 HTTP       │ 리버스 HTTPS         │
│ (예: 8888)        │ (예: 8080, 옵션)  │ (예: 8443, 옵션)    │
│ CONNECT 지원      │ Host/127.0.0.1    │ TLS 종료            │
│ Host 기준 라우팅  │ → 모킹/로컬 확인  │ Host 기준 라우팅    │
└──────────────────┴──────────────────┴──────────────────────┘
```

| 포트 | 설정 필드 | 역할 |
|------|-----------|------|
| 포워드 프록시 | `proxy_port` | HTTP_PROXY로 지정. CONNECT(HTTPS) 포함, Host 기준 라우팅 |
| 리버스 HTTP | `reverse_http_port` (옵션) | 브라우저 직접 접속 (`http://127.0.0.1:port`). 호스트 파일 불필요 |
| 리버스 HTTPS | `reverse_https_port` (옵션) | TLS 종료 후 Host 기준 라우팅. 동적 인증서 |

---

## 3. 라우팅/모킹 규칙 상세

| 우선순위 | 조건 | 동작 |
|----------|------|------|
| **1. Mocking** | `MockingService`에 해당 요청(Method+URL)과 일치하는 활성 룰 존재 | 즉시 Mock Response (Status, Headers, Body) 반환 |
| **2. Local** | 로컬 라우팅 On + Host가 로컬 라우트 매칭 | `target_host:target_port`로 전달 |
| **3. Reverse** | Host가 127.0.0.1 / localhost | 첫 번째 enabled 로컬 라우트로 전달 |
| **4. Pass-through** | 그 외 (조건 불일치) | 실제 서버로 전달 (설정에 따라 `ApiLogService` 로깅) |

---

## 4. 트래픽 흐름 예시

### 로컬 서버 → 외부 API (포워드) & Mocking 발동

1. 로컬 서버가 `HTTP_PROXY=127.0.0.1:8888` 설정
2. `https://api.real.com/v1/users` 요청 → 포워드 프록시로 전달.
3. **프록시 검사**:
   - `MockingService` 확인 -> 활성화된 MockRule 발견!
   - (실제 서버로 요청하지 않음)
   - MockRule에 저장된 JSON 데이터(`{ "id": 1, "name": "John" }`)와 상태코드 `200`을 조립하여 로컬 서버에 반환.

---

## 5. 데이터 모델

| 모델 | 필드 | 비고 |
|------|------|------|
| LocalRoute | id, domain, target_host, target_port, enabled | 도메인 → 로컬 매핑 |
| ProxySettings | dns_server, proxy_port, reverse_http_port, reverse_https_port | 프록시 설정 |
| **MockRule** | id, scenario_id, api_endpoint_id, request_hash, response_* | **[추가]** 테스트 시나리오 기반 모킹 규칙 |

---

## 6. 미래 확장

| 항목 | 설명 |
|------|------|
| 0.0.0.0 바인딩 | 모바일/외부 기기 접근 |
| CA + 인증서 다운로드 | SSL 다운로드 페이지 |
| 동적 변수 모킹 | Mock 응답 시 동적 변수(예: 날짜, 랜덤 ID) 치환 기능 |