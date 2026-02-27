---
title: 프로젝트 전체 개요
description: 기술 스택, 디렉터리 구조, 데이터 저장, 도메인 및 시나리오 중심 아키텍처, 로드맵
keywords: [개요, 스택, 구조, 도메인, 시나리오, 로드맵]
when: 프로젝트 구조, 스택, 전체 방향 파악 시
---

# Watchtower 프로젝트 개요

도메인 모니터링 및 개발자용 테스트 도구. 웹 인프라 가용성·성능 감시를 시작으로, 프록시 기반 트래픽 제어, API 문서화, **자동화된 테스트 시나리오 파이프라인(모킹 포함)**, E2E 자동화까지 확장합니다.

---

## 1. 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Vite 7, React 19, TanStack Router, Tailwind CSS 4, Framer Motion, lucide-react |
| 백엔드 | Rust, Tauri 2 |
| 프록시 | Axum, Hyper, Tokio (비동기 HTTP/HTTPS 프록시) |
| 도구 | pnpm, Biome (lint/format), TypeScript 5.8, Husky + lint-staged |

---

## 2. 디렉터리 구조

```
Watchtower/
├── src/                    # 프론트엔드 (React, Vite)
│   ├── routes/             # TanStack Router 파일 기반 라우트
│   ├── entities/           # 도메인별 타입 정의 (domain, proxy, settings, scenario)
│   ├── features/           # 기능별 UI (sidebar, update, test-runner)
│   └── shared/             # 공통 (api, ui, utils)
├── src-tauri/              # 백엔드 (Rust, Tauri)
│   └── src/
│       ├── command/        # Tauri Commands
│       ├── model/          # 데이터 모델
│       ├── service/        # 비즈니스 로직 + 저장소 (Scenario, Mocking 포함)
│       └── storage/        # JSON 버전 관리·마이그레이션
├── docs/                   # 문서
│   ├── architecture/       # 아키텍처 문서 (본 문서)
│   ├── conventions/        # 코드 컨벤션
│   └── feasibility/        # 기능 검토
└── package.json            # 프론트 의존성 및 스크립트
```

---

## 3. 데이터 저장

Tauri `app_data_dir` 기준 JSON 파일 저장. `schema_version` + `data` 래퍼 형식 (v2).

| 파일 | 데이터 | 서비스 |
|------|--------|--------|
| `domains.json` | 도메인 마스터 목록 | DomainService |
| `groups.json` | 도메인 그룹 | DomainGroupService |
| `domain_group_links.json` | 도메인↔그룹 n:n | DomainGroupLinkService |
| `domain_monitor_links.json` | 모니터 체크 대상 + 옵션 | DomainMonitorService |
| `logs/{date}.json` | 날짜별 상태 체크 로그 | DomainMonitorService |
| `domain_local_routes.json` | 프록시 로컬 라우트 | LocalRouteService |
| `proxy_settings.json` | 프록시 설정 | ProxySettingsService |
| `domain_api_logging_links.json`| API 로깅 도메인 등록 | ApiLoggingSettingsService |
| `sub_pages.json` | 도메인별 하위 페이지 | SubPageService |
| `test_scenarios.json` | 하위 페이지별 API 테스트 시나리오 | ScenarioService |
| `mock_rules.json` | Golden Master 레코딩/모킹 데이터 | MockingService |

### JSON 마이그레이션

- 앱 시작 시 `storage::migration::run_all()` 실행 (서비스 생성 전)
- `schema_version` 없으면 v1 취급 → 최신 버전으로 변환 후 `.bak` 백업
- 서비스는 `load_versioned` / `save_versioned`로 읽기/쓰기

---

## 4. 도메인 및 시나리오 중심 아키텍처

Domain을 **마스터 목록**으로 두고, 모니터링, 프록시, API 스키마뿐만 아니라 **하위 페이지(Sub-page)** 와 **테스트 시나리오**까지 확장되는 구조를 가집니다.

```
        ┌─────────────┐
        │   Domain    │  ← 마스터 목록 (Root)
        │ id, url     │
        └──────┬──────┘
               │
     ┌─────────┼─────────────────────────┐
     │         │                         │
     ▼         ▼                         ▼
┌──────────┐ ┌──────────┐ ┌───────────────────────────────┐
│  Monitor │ │  Proxy   │ │             APIs              │
│ (상태체크)│ │ (로컬라우트)│ │ Logging + Schema + Scenario     │
└──────────┘ └──────────┘ └──────────────┬────────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │         SubPage (하위 페이지)     │ (예: /login, /cart)
                         │ id, domain_id, path           │
                         └───────────────┬───────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │   TestScenario (테스트 시나리오)  │ (예: 로그인 흐름)
                         │ id, sub_page_id, steps[]      │
                         └───────────────┬───────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │     MockRule (모킹/레코딩)      │ (Golden Master)
                         │ scenario_id, mock_response    │
                         └───────────────────────────────┘
```

| 용도 | 주요 엔티티 | 역할 |
|------|-------------|------|
| Monitor | DomainMonitorLink | 최상위 도메인 및 하위 페이지 상태 감시 |
| Proxy | LocalRoute, MockRule | 로컬 라우팅 및 레코딩된 데이터로 응답 모킹(Mocking) |
| 시나리오 | SubPage, TestScenario | 페이지 단위로 API 호출 순서, 데이터 전달(Chaining) 정의 |

**참조 무결성**: Domain 삭제 시 관련 하위 페이지, 시나리오, 모킹 룰 등 하위 데이터 cascade 삭제.

---

## 5. 로드맵 요약 (9-Step 파이프라인 중심)

| 단계 | 주제 | 상태 |
|------|------|------|
| 1단계 | 웹사이트 스테이터스 체크 | 대부분 완료 |
| 2단계 | 외부 네트워크 프록시·로컬 연결 (모바일, SSL) | 미착수 |
| 3단계 | **프록시 & 테스트 시나리오 파이프라인 (9-Step)**<br> 1. API 문서화<br> 2. 하위 페이지 리스트업<br> 3. 페이지-API 매핑<br> 4. 하위 페이지 모니터링<br> 5. 트래픽 캡처로 API 자동 리스트업<br> 6~8. 시나리오 구성 및 Chaining 자동 검증<br> 9. 레코딩 및 Mocking | 설계 진행 중 |
| 4단계 | Playwright 통합·E2E 자동화 | 미착수 |

상세: [ROADMAP.md](../ROADMAP.md), 구현 체크리스트: [TODO.md](../TODO.md)

---

## 6. 관련 문서

| 문서 | 내용 |
|------|------|
| [02-backend-overview.md](02-backend-overview.md) | BE 모델·서비스·커맨드·저장소 |
| [03-frontend-overview.md](03-frontend-overview.md) | FE 라우트·엔티티·연동 패턴 |
| [04-domains.md](04-domains.md) | 도메인·그룹·**하위 페이지**·참조 무결성 |
| [05-monitor.md](05-monitor.md) | 모니터(상태 체크)·로그 |
| [06-proxy.md](06-proxy.md) | 프록시 아키텍처·로컬 라우팅·**모킹(Mocking) 구조** |
| [07-apis.md](07-apis.md) | API 뷰어·**시나리오 러너(Runner)·Chaining 파이프라인** |