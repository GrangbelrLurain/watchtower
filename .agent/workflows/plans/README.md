# Workflows Plans

Watchtower 프로젝트의 **구체화된 계획 문서** 모음입니다. 상위 [workflows](../) 문서(전략·로드맵)를 코드와 매핑한 스펙·태스크를 담습니다.

## 목차

| 문서 | 역할 |
|------|------|
| [00-project-overview.md](00-project-overview.md) | 프로젝트 한눈에 보기: 스택, 디렉터리 구조, 데이터 저장 위치, 다른 plans 문서 링크 |
| [01-backend-api.md](01-backend-api.md) | 백엔드 API: Tauri Commands 목록, 모델, 서비스·저장소, Command–Service 매핑, 백그라운드 동작 |
| [02-frontend-routes.md](02-frontend-routes.md) | 프론트엔드 라우트: 현재 라우트 트리, 사이드바 메뉴, backend-fe-strategy 대응, FE 엔티티, 미구현(/domains/$id, /settings) 및 향후 권장사항 |
| [03-roadmap-tasks.md](03-roadmap-tasks.md) | 로드맵 태스크: 1~4단계별 완료/미완료 항목, 구현 시 필요한 레이어(BE/FE/설정), 선행 조건 |
| [04-fe-be-connection.md](04-fe-be-connection.md) | FE–백엔드 연결: invoke 패턴, ApiResponse 사용, 인자(snake_case), 페이지별 사용 Command, 새 연동 시 체크리스트 |
| [05-domain-local-routing.md](05-domain-local-routing.md) | 3단계 도메인 로컬 서버 DNS 연결: 동작 방식, BE 모델·서비스·Commands·프록시, FE 페이지·UI·체크리스트 |
| [06-proxy-architecture.md](06-proxy-architecture.md) | **프록시 전체 구성 기획안**: 포워드/리버스 포트, 호스트 파일 없이 브라우저·로컬 서버 연동, 트래픽 흐름·설정 전달 |
| [07-proxy-setup-page-feasibility.md](07-proxy-setup-page-feasibility.md) | **「프록시 연결하기」 버튼** → 브라우저에서 SSL 다운로드·리버스 프록시 설정 페이지 자동 오픈 **가능 여부 검토** |
| [08-domains-open-dns-through-proxy.md](08-domains-open-dns-through-proxy.md) | **domains에서 도메인 열 때** 설정의 DNS 서버를 통한 인터넷 창 열기 — 가능 여부 및 구현 방안 |
| [09-api-tooling.md](09-api-tooling.md) | **3단계 API 도구**: 프록시 Request/Response 로깅, Replay, Mock, Schema 기반 문서·Request Form, 테스트 케이스 등록 |
| [10-domain-proxy-integration.md](10-domain-proxy-integration.md) | **도메인–프록시 연동**: 모니터링 도메인과 프록시 라우트 검색·자동완성·양방향 연동 |
| [11-rust-conventions.md](11-rust-conventions.md) | **Rust 코드 컨벤션**: Clippy, 네이밍, Tauri Command payload 규칙 |

## 상위 문서

- [backend-fe-strategy.md](../backend-fe-strategy.md) — 백엔드 분석 및 프론트엔드 라우트 설계 개요
- [ROADMAP.md](../ROADMAP.md) — 전체 기획·구현 로드맵 (1~4단계)
