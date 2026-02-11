---
description: Watchtower 프로젝트 한눈에 보기
---

# Watchtower 프로젝트 개요

도메인 모니터링 및 개발자용 테스트 도구. 웹 인프라 가용성·성능 감시를 시작으로, 프록시·E2E 자동화까지 확장할 예정입니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Vite 7, React 19, TanStack Router, Tailwind CSS 4, @tauri-apps/api, Framer Motion, lucide-react |
| 백엔드 | Rust, Tauri 2 |
| 도구 | pnpm, Biome (lint/format), TypeScript 5.8, Husky + lint-staged |

## 루트 디렉터리 구조

- `src/` — 프론트엔드 (React, Vite)
- `src-tauri/` — 백엔드 (Rust, Tauri)
- `.agent/workflows/` — 워크플로·전략 문서 (backend-fe-strategy, ROADMAP, project-overview)
- `.agent/workflows/plans/` — 구체화된 계획 문서 (본 문서 및 01~10, [README](README.md) 참고)
- `package.json` — 프론트 의존성 및 스크립트 (dev, build, tauri, format, type-check)

## 프론트엔드 디렉터리 (src/)

| 경로 | 설명 |
|------|------|
| `routes/` | TanStack Router 파일 기반 라우트 (__root, index, about, domains/*) |
| `entities/domain/types/` | 도메인·도메인 상태·도메인 그룹 타입 정의 |
| `features/sidebar/ui/` | 사이드바 UI 컴포넌트 |
| `shared/ui/` | 공통 UI (Button, Card, Input, Modal, Titlebar, Badge, Textarea, Typography, LoadingScreen) |

## 백엔드 디렉터리 (src-tauri/src/)

| 경로 | 설명 |
|------|------|
| `command/` | Tauri commands (domain_commands, domain_group_commands, domain_status_command) |
| `model/` | 도메인·그룹·상태·API 응답 모델 |
| `service/` | DomainService, DomainGroupService, DomainStatusService |

## 데이터 저장 (앱 데이터 디렉터리)

Tauri `app_data_dir` 기준:

- `domains.json` — 등록된 도메인 목록 (DomainService)
- `groups.json` — 도메인 그룹 목록 (DomainGroupService)
- `domain_group_links.json` — 도메인–그룹 n:n 연결 (Link 서비스, **join 테이블은 `*_link` 접미사 통일**)
- `logs/` — 도메인 상태 체크 로그 (DomainStatusService)

## 관련 문서

- [01-backend-api.md](01-backend-api.md) — 백엔드 API(Commands)·모델·서비스 정리
- [02-frontend-routes.md](02-frontend-routes.md) — 라우트 트리·전략 대응·엔티티
- [03-roadmap-tasks.md](03-roadmap-tasks.md) — 로드맵 단계별 구체 태스크
- [04-fe-be-connection.md](04-fe-be-connection.md) — FE domains 페이지 ↔ 백엔드 연결 방식(패턴, 페이지별 Command)
- [05-domain-local-routing.md](05-domain-local-routing.md) — 3단계 도메인 로컬 서버 DNS 연결 필요 항목
- [09-api-tooling.md](09-api-tooling.md) — API 로깅·Replay·Mock·문서
- [10-domain-proxy-integration.md](10-domain-proxy-integration.md) — 도메인–프록시 연동 및 검색
