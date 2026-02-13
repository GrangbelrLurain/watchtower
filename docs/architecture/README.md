---
title: Architecture (아키텍처)
description: 프로젝트 구조, BE/FE 개요, 기능별 아키텍처 문서 모음
keywords: [아키텍처, 구조, 설계]
when: 프로젝트 구조·설계 파악 시
---

# Watchtower Architecture

Watchtower 프로젝트의 **아키텍처 문서** 모음입니다.

---

## 문서 구조

| 문서 | 역할 |
|------|------|
| [01-project-overview.md](01-project-overview.md) | **프로젝트 전체 개요**: 기술 스택, 디렉터리 구조, 데이터 저장, 도메인 중심 아키텍처, 로드맵 |
| [02-backend-overview.md](02-backend-overview.md) | **백엔드 전체 개요**: 모델, 서비스, Commands, 저장소, JSON 마이그레이션, FE 연동 패턴 |
| [03-frontend-overview.md](03-frontend-overview.md) | **프론트엔드 전체 개요**: 라우트 트리, 사이드바, FE 엔티티, 공통 UI, FE–BE 연동, 페이지별 Command |
| [04-domains.md](04-domains.md) | **도메인 기능**: 마스터 목록, 그룹, 도메인–프록시 연동, 참조 무결성 |
| [05-monitor.md](05-monitor.md) | **모니터 기능**: 상태 체크, 백그라운드 폴링, 로그, 설정 |
| [06-proxy.md](06-proxy.md) | **프록시 기능**: 아키텍처, 포워드/리버스, 로컬 라우팅, 상시 동작, 트래픽 흐름 |
| [07-apis.md](07-apis.md) | **APIs 기능**: 대시보드(도메인 등록), Schema 뷰·엔드포인트 테스트, 로그·프록시 패스스루 로깅 |

---

## 관련 문서

- [TODO.md](../TODO.md) — 기능별 구현 체크리스트
- [ROADMAP.md](../ROADMAP.md) — 전체 기획·구현 로드맵 (1~4단계)
- [conventions/](../conventions/) — 코드 컨벤션 (Rust, TypeScript)
- [feasibility/](../feasibility/) — 기능별 가능 여부 검토
