---
title: 프로젝트 전체 개요
description: 기술 스택, 디렉터리 구조, 데이터 저장, 도메인 중심 아키텍처, 로드맵
keywords: [개요, 스택, 구조, 도메인, 로드맵]
when: 프로젝트 구조, 스택, 전체 방향 파악 시
---

# Watchtower 프로젝트 개요

도메인 모니터링 및 개발자용 테스트 도구. 웹 인프라 가용성·성능 감시를 시작으로, 프록시·API 도구·E2E 자동화까지 확장합니다.

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
│   ├── entities/           # 도메인별 타입 정의 (domain, proxy, settings)
│   ├── features/           # 기능별 UI (sidebar, update)
│   └── shared/             # 공통 (api, ui, utils)
├── src-tauri/              # 백엔드 (Rust, Tauri)
│   └── src/
│       ├── command/        # Tauri Commands
│       ├── model/          # 데이터 모델
│       ├── service/        # 비즈니스 로직 + 저장소
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
| `domain_group_links.json` | 도메인–그룹 n:n | DomainGroupLinkService |
| `domain_monitor_links.json` | 모니터 체크 대상 + 옵션 | DomainMonitorService |
| `logs/{date}.json` | 날짜별 상태 체크 로그 | DomainMonitorService |
| `domain_local_routes.json` | 프록시 로컬 라우트 | LocalRouteService |
| `proxy_settings.json` | 프록시 설정 | ProxySettingsService |
| `domain_api_logging_links.json` | API 로깅 도메인 등록 | ApiLoggingSettingsService |

### JSON 마이그레이션

- 앱 시작 시 `storage::migration::run_all()` 실행 (서비스 생성 전)
- `schema_version` 없으면 v1 취급 → v2로 변환 후 `.bak` 백업
- 서비스는 `load_versioned` / `save_versioned`로 읽기/쓰기

---

## 4. 도메인 중심 아키텍처

Domain을 **마스터 목록**으로 두고, Monitor·Proxy·APIs는 각각 Domain을 참조하는 구조.

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
│  Monitor │ │  Proxy   │ │        APIs         │
│ (상태체크)│ │ (로컬라우트)│ │ Logging + Schema   │
└──────────┘ └──────────┘ └─────────────────────┘
   domain_id   domain_id   domain_id (via Link)
```

| 용도 | 엔티티 | 역할 |
|------|--------|------|
| Monitor | DomainMonitorLink | HEAD 요청으로 상태 감시 대상 |
| Proxy | LocalRoute | 프록시로 로컬에 보낼 대상 |
| APIs | DomainApiLoggingLink | API 로깅·스키마 기능 대상 |

**참조 무결성**: Domain 삭제 시 Monitor·Proxy·APIs의 관련 링크도 cascade 삭제.

---

## 5. 로드맵 요약

| 단계 | 주제 | 상태 |
|------|------|------|
| 1단계 | 웹사이트 스테이터스 체크 | 대부분 완료 |
| 2단계 | 외부 네트워크 프록시·로컬 연결 (모바일, SSL) | 미착수 |
| 3단계 | 도메인 프록시·API 도구·트래픽 변조 | 진행 중 |
| 4단계 | Playwright 통합·E2E 자동화 | 미착수 |

상세: [ROADMAP.md](../ROADMAP.md), 구현 체크리스트: [TODO.md](../TODO.md)

---

## 6. 관련 문서

| 문서 | 내용 |
|------|------|
| [02-backend-overview.md](02-backend-overview.md) | BE 모델·서비스·커맨드·저장소 |
| [03-frontend-overview.md](03-frontend-overview.md) | FE 라우트·엔티티·연동 패턴 |
| [04-domains.md](04-domains.md) | 도메인·그룹·참조 무결성 |
| [05-monitor.md](05-monitor.md) | 모니터(상태 체크)·로그 |
| [06-proxy.md](06-proxy.md) | 프록시 아키텍처·로컬 라우팅 |
| [07-apis.md](07-apis.md) | API 대시보드·스키마·로그 |
