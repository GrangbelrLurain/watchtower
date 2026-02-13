---
title: Watchtower 문서
description: 프로젝트 문서 인덱스 (Human·Agent 공유)
keywords: [문서, 인덱스]
when: 프로젝트 문서 위치, 전체 맵 파악 시
---

# Watchtower 문서

프로젝트 문서 (Human·Agent 공유)

## 문서 맵

| 문서 | when | 설명 |
|------|------|------|
| [프로젝트 개요](architecture/01-project-overview.md) | 프로젝트 구조, 스택, 전체 방향 파악 시 | 기술 스택, 디렉터리, 데이터 저장, 도메인 중심 아키텍처, 로드맵 |
| [TODO](TODO.md) | 다음 작업 확인, 진행 상황 추적 시 | 기능별 구현 체크리스트 |
| [ROADMAP](ROADMAP.md) | 단계별 기능, 진행 상황 파악 시 | 전체 로드맵 (1~4단계) |
| [backend-fe-strategy](backend-fe-strategy.md) | BE/FE 설계 개요, 라우트 전략 파악 시 | 백엔드 분석 및 프론트엔드 구현 계획 |
| [architecture/](architecture/README.md) | 프로젝트 아키텍처·설계 파악 시 | 아키텍처 문서 (01~06) |
| [feasibility/](feasibility/README.md) | 기능 가능 여부 검토 시 | 계획 전 연구 |
| [conventions/](conventions/README.md) | 코드 작성 시 | Rust, TypeScript 컨벤션 |

## 프론트매터 (YAML)

모든 문서는 상단에 YAML 프론트매터를 포함합니다.

| 필드 | 설명 | 예시 |
|------|------|------|
| `title` | 문서 제목 | `title: 백엔드 전체 개요` |
| `description` | 한 줄 요약 | `description: Tauri Commands, 모델, 서비스, 저장소` |
| `keywords` | 검색·매칭용 키워드 | `keywords: [백엔드, 커맨드, 모델]` |
| `when` | 이 문서를 참조해야 하는 상황 | `when: BE 구조, Command 파악 시` |

---

## 디렉터리 구조

```
docs/
  README.md              # 본 문서 (인덱스)
  TODO.md                # 기능별 구현 체크리스트
  ROADMAP.md
  backend-fe-strategy.md
  architecture/          # 아키텍처 문서
    README.md
    01-project-overview.md
    02-backend-overview.md
    03-frontend-overview.md
    04-domains.md
    05-monitor.md
    06-proxy.md
    07-apis.md
  feasibility/           # 기능 가능 여부 검토
  conventions/           # 코드 컨벤션
```
