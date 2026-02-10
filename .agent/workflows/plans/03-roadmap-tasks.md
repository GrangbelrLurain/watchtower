---
description: Watchtower 로드맵 단계별 구체 태스크
---

# 로드맵 태스크 구체화

[ROADMAP.md](../ROADMAP.md) 1~4단계를 구현 관점에서 구체 태스크로 정리합니다.

## 1단계: 웹사이트 스테이터스 체크 (진행 중)

### 완료된 항목 (참고용 코드 위치)

- **기본 HTTP HEAD 요청, Latency 측정**: `DomainStatusService` (domain_status_service.rs) — 도메인별 요청·응답 시간 저장.
- **JSON 기반 영구 저장·임포트/익스포트**: `DomainService` — domains.json 읽기/쓰기, `import_domains`, `clear_all_domains` command.
- **도메인 병렬 체크**: `DomainStatusService::check_domains` — 비동기 병렬 처리.

### 미완료 — FE: 상세 점검 확장

- [ ] 하위 페이지에 대한 재귀적/선택적 요청 및 상태 점검 (BE: 새 API 또는 기존 status 확장, FE: UI로 URL/깊이 선택).
- [ ] LCP 등 성능 지표 측정 및 시각화 (BE: 메트릭 수집 여부, FE: 차트/대시보드).

### 미완료 — BE: API 단위 테스트

- [ ] 특정 엔드포인트 시나리오 기반 API 유효성 테스트 (예: `check_apis` command 구현 또는 별도 테스트 모듈).

참고: [ROADMAP.md](../ROADMAP.md) 1단계.

---

## 2단계: 외부 네트워크 프록시 및 로컬 연결

- **디바이스 연결 브릿지**: iOS/Android Webview에서 localhost 접근 — BE/FE: 로컬 서버 노출·연결 플로우. 선행: 로컬에서 동작하는 서비스 확보.
- **로컬 SSL 인증서**: CA·인증서 자동 생성/설정 — 주로 BE/시스템 설정. 선행: 디바이스 브릿지 또는 로컬 서버 결정.

참고: [ROADMAP.md](../ROADMAP.md) 2단계.

---

## 3단계: 도메인 프록시 및 트래픽 변조

### 도메인 로컬 서버 DNS 연결 (도메인 로컬 라우팅)

**상세 필요 항목**: [05-domain-local-routing.md](05-domain-local-routing.md) 참고.

- **BE — 데이터·저장소**
  - [ ] `DomainLocalRoute`(또는 `LocalRoute`) 모델: domain, target_host, target_port, enabled.
  - [ ] 저장소: `domain_local_routes.json` (또는 `local_routes.json`).
- **BE — 서비스**
  - [ ] DomainLocalRouteService: CRUD, JSON 읽기/쓰기.
  - [ ] 로컬 HTTP 리버스 프록시: Host 기반 라우팅, 등록된 도메인 → 로컬(host:port) 프록시.
- **BE — Commands**
  - [ ] get_local_routes, add_local_route, update_local_route, remove_local_route, set_local_route_enabled.
  - [ ] get_proxy_status, start_local_proxy, stop_local_proxy.
- **BE — 권한·환경**
  - [ ] 로컬 리스닝 권한, 포트 설정(기본 예: 8888), 충돌 시 처리.
- **FE — 페이지·UI**
  - [ ] 로컬 라우팅 설정 페이지(`/proxy`): 라우트 목록, CRUD, 활성화 토글.
  - [ ] 프록시 기동/중지·상태 표시, "프록시 사용 방법" 안내 패널.
- **FE — 연동**
  - [ ] LocalRoute 엔티티 타입, invoke 패턴( snake_case, ApiResponse)으로 위 Commands 연동.
- **(선택·2차)** hosts 파일 편집/복원, 경로별 Mock 응답.

### 그 외 3단계 항목

- **로그 및 데이터 수집**: 이벤트 로그·방문 데이터 수집/분석 — BE: 수집 파이프라인, FE: 조회/시각화.
- **인증·네트워크 제어**: 세션/토큰 변조, Throttling — BE: 프록시 레이어 확장.

선행: 2단계 로컬 연결 확보 후 프록시 트래픽 경로에 연결.

참고: [ROADMAP.md](../ROADMAP.md) 3단계.

---

## 4단계: Playwright 통합 및 자동화

- **E2E 테스트 인프라**: 앱 내 Playwright 실행·리포트 — BE: 스크립트 실행 환경, FE: 실행 UI·결과 표시.
- **레코딩·재현**: 사용자 활동 레코딩/재생, API 호출·응답 기록 — BE/FE 협업.
- **비주얼 테스트**: 스냅샷·Diff — FE 표시, BE 저장/비교.
- **멀티 디바이스**: 해상도·브라우저 환경 자동화 — 인프라·설정 레이어.

참고: [ROADMAP.md](../ROADMAP.md) 4단계.
