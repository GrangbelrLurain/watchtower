---
description: 3단계 — 도메인(모니터링)과 프록시(로컬 라우팅) 연동 및 검색
---

# 3단계: 도메인–프록시 연동 및 검색

[ROADMAP.md](../ROADMAP.md) 3단계의 **도메인 모니터링**과 **프록시 로컬 라우팅**을 연동하고, 검색 기능으로 연결하는 기획 문서입니다.

**목표**: 모니터링 도메인 목록과 프록시 라우트를 하나의 도메인 풀로 연결하고, 검색·자동완성·양방향 연동으로 중복 입력을 줄이고 일관성을 높인다.

**선행**: [05-domain-local-routing.md](05-domain-local-routing.md) 도메인 로컬 라우팅, [00-project-overview.md](00-project-overview.md) 도메인·그룹 구조.

---

## 0. 배경 및 동기

| 문제 | 연동으로 해결 |
|------|----------------|
| **중복 입력** | 모니터링에 이미 있는 도메인을 프록시에 다시 타이핑 | 모니터링 목록에서 검색·선택 후 프록시에 추가 |
| **일관성** | "이 도메인이 어디에 쓰이는지" 파악 어려움 | 통합 검색으로 한눈에 조회 |
| **워크플로우** | Domains ↔ Proxy 페이지를 오가며 확인 | 검색 결과에서 해당 페이지로 바로 이동 |

---

## 1. 기능 개요

### 1.1 프록시 라우트 추가 시 도메인 검색

- "도메인 추가" 입력란에 **자동완성/검색** 제공.
- 후보: **모니터링 도메인**(domains) + **이미 등록된 프록시 라우트**(local_routes).
- 도메인 URL에서 호스트 추출: `https://api.example.com/v1` → `api.example.com`.

### 1.2 통합 검색

- 사이드바·상단 등에 **도메인 검색** 입력.
- 검색 결과에 다음 정보 표시:
  - 모니터링 목록 여부 (domains)
  - 소속 그룹 (domain_groups)
  - 프록시 라우트 여부 (local_routes)
- 결과 클릭 시 해당 페이지로 이동 (domains, groups, proxy).

### 1.3 양방향 연동

- **Domains 페이지**: 도메인 항목에 "프록시에 추가" 버튼 → target_host, target_port 입력 후 add_local_route 호출.
- **Proxy 페이지**: "모니터링 목록에서 가져오기" 버튼 → domains 중 아직 라우트에 없는 것 선택 후 일괄 추가.

---

## 2. BE 필요 항목

### 2.1 기존 Command 활용

| Command | 용도 |
|---------|------|
| `get_domains` | 모니터링 도메인 목록 (검색 후보, URL → host 추출) |
| `get_local_routes` | 프록시 라우트 목록 (검색 후보, 중복 체크) |
| `add_local_route` | 라우트 추가 (domain, target_host, target_port) |

### 2.2 (선택) 통합 검색용 Command

| Command | 설명 |
|---------|------|
| `search_domains` | query로 domains + local_routes에서 도메인(host) 검색, 각 컨텍스트별 존재 여부 반환 |

- **없어도 가능**: FE에서 `get_domains`, `get_local_routes`를 조합해 클라이언트 검색 구현.
- **있으면 유리**: 대량 데이터 시 서버 필터링, 일관된 검색 로직.

---

## 3. FE 필요 항목

### 3.1 도메인 URL → Host 추출

- `https://api.example.com/path` → `api.example.com`
- `http://sub.example.com` → `sub.example.com`
- Domains의 `url` 필드에서 host 추출 유틸 공유.

### 3.2 프록시 라우트 추가 시 검색/자동완성

| 구분 | 항목 |
|------|------|
| **UI** | Input + Autocomplete/Dropdown (도메인 입력 시 필터링) |
| **데이터** | get_domains + get_local_routes 조합 → host 목록 생성 |
| **선택 시** | 선택된 host를 add_local_route의 domain으로 사용, target_host/target_port는 사용자 입력 |

### 3.3 통합 검색

| 구분 | 항목 |
|------|------|
| **위치** | 사이드바 상단 또는 앱 상단 검색 바 |
| **동작** | 입력 시 domains + local_routes에서 host 매칭 |
| **결과** | 매칭된 host, 모니터링 여부, 그룹, 프록시 라우트 여부 |
| **클릭** | 해당 도메인 상세 또는 해당 페이지(domains / proxy)로 이동 |

### 3.4 양방향 연동

| 구분 | 항목 |
|------|------|
| **Domains** | 도메인 행에 "프록시에 추가" 버튼 → Modal(target_host, target_port) → add_local_route |
| **Proxy** | "모니터링 목록에서 가져오기" 버튼 → Modal(domains 중 미등록 선택) → add_local_route 반복 |

---

## 4. 체크리스트 요약

| 구분 | 항목 |
|------|------|
| **BE** | (선택) search_domains Command |
| **FE** | URL → host 추출 유틸 |
| **FE** | 프록시 라우트 추가 Input에 자동완성 (domains + local_routes) |
| **FE** | 통합 검색 UI (사이드바/상단) |
| **FE** | 검색 결과에 모니터링·그룹·프록시 여부 표시 |
| **FE** | Domains 페이지 "프록시에 추가" 버튼 |
| **FE** | Proxy 페이지 "모니터링 목록에서 가져오기" 버튼 |

---

참고: [ROADMAP.md](../ROADMAP.md) 3단계, [05-domain-local-routing.md](05-domain-local-routing.md), [01-backend-api.md](01-backend-api.md).
