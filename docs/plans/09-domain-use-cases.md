---
title: Domain 중심 용도별 구조
description: Domain 마스터 목록과 Monitor·Proxy·Api 용도별 엔티티 관계
keywords: [도메인, 마스터, 모니터, 프록시, api, 스키마]
when: 도메인 용도별 구조, 엔티티 관계 파악 시
related: [01-backend-api, 05-domain-local-routing, 07-api-tooling, 08-domain-proxy-integration]
---

# Domain 중심 용도별 구조

Domain을 **마스터 목록**으로 두고, Monitor·Proxy·Api는 각각 Domain을 참조하는 구조입니다.

## 1. 전체 구조

| 엔티티 | 역할 | Domain 선행 |
|--------|------|-------------|
| **Domain** | 앱에 등록된 전체 도메인 목록 (마스터) | — |
| **DomainMonitor** | HEAD 요청으로 상태 감시를 할 도메인 목록 | domain_id → Domain |
| **Proxy** (LocalRoute) | 프록시로 로컬로 보내야 할 도메인 목록 | domain_id → Domain |
| **Api** | API 스키마·기능이 필요한 도메인 목록 | domain_id → Domain (ApiSchema + Link) |

**제약**: Monitor·Proxy·Api 중 하나에 등록되려면 **반드시 Domain에 먼저 등록**되어 있어야 한다.

---

## 2. 구조 다이어그램

```
        ┌─────────────┐
        │   Domain    │  ← 마스터 목록 (항상 먼저 등록)
        │ id, url     │
        └──────┬──────┘
               │
     ┌─────────┼─────────┐
     │         │         │
     ▼         ▼         ▼
┌──────────┐ ┌──────────┐ ┌─────────────────────┐
│  Monitor │ │  Proxy   │ │        Api          │
│ (상태체크)│ │ (로컬라우트)│ │ ApiSchema + Link   │
└──────────┘ └──────────┘ └─────────────────────┘
   domain_id   domain_id   domain_id (via Link)
```

---

## 3. 엔티티별 상세

### 3.1 Domain (마스터)

- **역할**: 앱에 등록된 도메인 풀
- **저장소**: `domains.json`
- **규칙**: Monitor·Proxy·Api에 추가하려면 Domain에 먼저 있어야 함

### 3.2 DomainMonitorLink (링크 테이블)

- **역할**: HEAD 요청으로 상태 감시를 할 도메인 목록 + 옵션
- **필드**: domain_id, check_enabled, interval 등
- **저장소**: `domain_monitor_links.json`
- **참조**: domain_id → Domain

### 3.3 Proxy (LocalRoute)

- **역할**: 프록시로 로컬 서버로 보내야 할 도메인 목록
- **현재**: LocalRoute에 `domain` (호스트 문자열) 저장
- **목표**: domain_id로 Domain 연결 (DomainLocalRouteLink 또는 LocalRoute.domain_id)

### 3.4 Api (ApiSchema + DomainApiSchemaLink)

- **역할**: API 스키마가 필요한 도메인 목록
- **구조**:
  - **ApiSchema**: id, url (스키마 다운로드 URL), name 등
  - **DomainApiSchemaLink**: domain_id, schema_id
- **저장소**: `api_schemas.json`, `domain_api_schema_links.json`

---

## 4. 참조 무결성

| 동작 | 규칙 |
|------|------|
| Monitor/Proxy/Api 추가 | domain_id가 Domain에 존재해야 함 |
| Domain 삭제 | 해당 domain_id를 참조하는 Monitor·Proxy·Api·Link 레코드도 함께 삭제 (cascade) |
| Domain만 존재 | Monitor·Proxy·Api에 없어도 됨 (용도 없이 등록만 해둔 경우 허용) |

---

## 5. 구현 방향

| 구분 | 현재 | 목표 |
|------|------|------|
| DomainMonitorLink | domain_id, check_enabled, interval | 구현됨 (domain_monitor_links.json) |
| Proxy | LocalRoute(domain: String) | domain_id 추가 또는 DomainLocalRouteLink |
| Api | 미구현 | ApiSchema + DomainApiSchemaLink 신규 |

---

참고: [01-backend-api.md](01-backend-api.md), [05-domain-local-routing.md](05-domain-local-routing.md), [07-api-tooling.md](07-api-tooling.md), [08-domain-proxy-integration.md](08-domain-proxy-integration.md).
