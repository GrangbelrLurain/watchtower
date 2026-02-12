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
| [프로젝트 개요](plans/00-project-overview.md) | 프로젝트 구조, 스택, 디렉터리 | 한눈에 보기 (plans/00) |
| [ROADMAP](ROADMAP.md) | 단계별 기능, 진행 상황 | 전체 로드맵 |
| [backend-fe-strategy](backend-fe-strategy.md) | BE/FE 설계 개요 | 백엔드 분석 및 라우트 전략 |
| [plans/](plans/README.md) | 구현 스펙, 코드 매핑 | 구체화된 계획 문서 |
| [feasibility/](feasibility/README.md) | 기능 가능 여부 검토 | 계획 전 연구 |
| [conventions/](conventions/README.md) | 코드 작성 시 | Rust, TypeScript 컨벤션 |

## 프론트매터 (YAML)

모든 문서는 상단에 YAML 프론트매터를 포함합니다.

| 필드 | 설명 | 예시 |
|------|------|------|
| `title` | 문서 제목 | `title: 백엔드 API 정리` |
| `description` | 한 줄 요약 | `description: Tauri Commands 목록, 모델·서비스 매핑` |
| `keywords` | 검색·매칭용 키워드 (한글 통일) | `keywords: [백엔드, api, 커맨드]` |
| `when` | 이 문서를 참조해야 하는 상황 | `when: Command 호출, BE 구조 파악 시` |
| `related` | 관련 문서 (선택) | `related: [04-fe-be-connection]` |

**related 경로 규칙**: 같은 폴더=파일명만, 다른 폴더=`폴더/파일명`, 루트 문서=`파일명` (예: `backend-fe-strategy`, `ROADMAP`)

---

## 디렉터리 구조

```
docs/
  README.md              # 본 문서 (인덱스)
  ROADMAP.md
  backend-fe-strategy.md
  plans/                 # 구현 계획 (00~08)
    00-project-overview.md
    01-backend-api.md
    ...
  feasibility/           # 기능 가능 여부 검토
  conventions/            # 코드 컨벤션
```
