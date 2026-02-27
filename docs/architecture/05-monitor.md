---
title: 모니터 기능
description: 도메인 상태 체크, 백그라운드 폴링, 로그, 모니터 설정 (하위 페이지 포함)
keywords: [모니터, 상태체크, HEAD, 폴링, 로그, 하위페이지]
when: 모니터 기능 구현·파악 시
---

# 모니터 기능

도메인 및 하위 페이지의 상태 감시(HEAD 요청), 백그라운드 체크, 상태 로그, 모니터 설정을 정리합니다.

---

## 1. 개요

등록된 도메인 및 **하위 페이지(SubPage)**에 대해 HTTP HEAD 요청을 보내 가용성·응답 시간을 감시합니다. 

```
Domain (마스터)
    │
    ├─ DomainMonitorLink (루트 도메인 체크 대상)
    │      │
    │      └─ DomainStatusLog
    │
    └─ SubPage (하위 라우트: 예 /login)
           │
           ├─ SubPageMonitorLink (하위 페이지 체크 대상)
           │      │
           │      └─ DomainStatusLog
           │
           └─ TestScenario (별도 실행/검증)
```

---

## 2. 데이터 모델

| 모델 | 필드 | 역할 |
|------|------|------|
| **DomainMonitorLink** | domain_id, check_enabled, interval_secs | 루트 도메인 모니터 체크 대상 |
| **SubPageMonitorLink** | sub_page_id, check_enabled, interval_secs | **[추가]** 하위 페이지 모니터 체크 대상 |
| **DomainStatusLog** | id, domain_id, sub_page_id (opt), url, status, level, ok, group, timestamp, latency, errorMessage? | 체크 결과 |

### 저장 구조

| 데이터 | 위치 |
|--------|------|
| 체크 대상 | `domain_monitor_links.json`, `sub_page_monitor_links.json` |
| 최신 체크 결과 | 메모리 (`DomainMonitorService.last_checks`) |
| 과거 체크 로그 | `logs/{YYYY-MM-DD}.json` |

---

## 3. 백그라운드 체크 흐름

- `setup` hook에서 120초(2분) 간격으로 루프 실행.
- 체크 대상은 `DomainMonitorLink`와 `SubPageMonitorLink` 중 `check_enabled == true`인 항목들을 종합.
- 대상 URL 목록을 추출 (Domain은 루트 URL, SubPage는 `Domain.url + SubPage.path`).
- 모든 타겟에 대해 병렬로 `HEAD` 요청 전송.
- 결과를 하나의 `DomainStatusLog` 리스트로 모아 메모리 및 파일에 저장.

---

## 4. Commands

| Command | 설명 | 서비스 |
|---------|------|--------|
| `get_latest_status` | 최신 상태 목록 (메모리에서 조회) | DomainMonitorService |
| `check_domain_status` | 전체 상태 체크 수동 실행 | DomainMonitorService + Domain/Group/Link 서비스 |
| `get_domain_status_logs` | 날짜(YYYY-MM-DD)별 과거 로그 조회 | DomainMonitorService |
| `get_domain_monitor_list` | 모니터 링크 + URL 목록 조회 | DomainMonitorService, DomainService |
| `set_domain_monitor_check_enabled` | 도메인별 체크 활성화/비활성화 | DomainMonitorService |
| `set_sub_page_monitor_check_enabled`| **[추가]** 하위 페이지별 체크 활성화/비활성화 | SubPageMonitorService |

---

## 5. FE 페이지

| 경로 | 역할 | 사용 Command |
|------|------|-------------|
| `/monitor` | 최신 상태 대시보드, 수동 체크 버튼 | `get_latest_status`, `check_domain_status` |
| `/monitor/logs` | 날짜별 과거 로그 조회 | `get_domain_status_logs` |
| `/monitor/settings` | 도메인/하위 페이지별 체크 활성화/비활성화 | `get_domain_monitor_list`, `set_domain_monitor_check_enabled`, `set_sub_page_monitor_check_enabled` |

### FE 동작

- `/monitor`: 마운트 시 `get_latest_status` 1회 + **30초 폴링**으로 최신 상태 갱신, "새로고침" 버튼으로 `check_domain_status` 수동 실행. 그룹별 섹션으로 결과 표시, 검색·레벨 필터 제공
- `/monitor/logs`: 쿼리 파라미터 `date` (YYYY-MM-DD)로 날짜별 조회, 검색·레벨 필터 제공
- `/monitor/settings`: 도메인 리스트에서 체크 활성화 토글. **그룹별 UI** + **검색** 기능 포함 (아래 §5-1 참고)

---

## 6. DomainStatusLog 레벨 판정

| level | 조건 |
|-------|------|
| `success` | HTTP 2xx |
| `warning` | HTTP 3xx, 4xx |
| `error` | HTTP 5xx, 타임아웃, 연결 실패 |

`ok` 필드: `level == "success"`이면 `true`, 그 외 `false`.

---

## 5-1. Monitor Settings 그룹별 UI + 검색

### 개요

`/monitor/settings` 페이지에서 도메인이 많아질 경우 관리가 어려움. 그룹별 분류 표시와 검색 기능을 추가하여 UX 개선. (향후 하위 페이지도 도메인 하위에 트리 형태로 표시 예정)

### 추가 데이터 fetch

기존 `get_domain_monitor_list` 외에 `get_groups`, `get_domain_group_links`를 함께 호출하여 `domainId → groupName[]` 매핑을 생성. 그룹 미지정 도메인은 "Default" 그룹으로 표시.

### UI 구조

```
[검색 Input: URL 또는 그룹명으로 필터링]

[체크할 대상 (N)]                [체크 안할 대상 (M)]
  ▼ Production (5)                ▼ Staging (3)
    ? api.example.com               ? staging.example.com
      └─ /login (SubPage)
    ? web.example.com               ...
    ...                           ▼ Default (5)
  ▼ Staging (10)                    ? test.example.com
    ? staging.example.com           ...
    ...
```

### 기능 요약

| 기능 | 설명 |
|------|------|
| 검색 | URL 또는 그룹명 포함 여부로 필터링 |
| 그룹별 섹션 | 각 패널(체크할/안할) 내부에서 그룹별로 도메인 묶어 표시 |
| 하위 트리 | 도메인 하위에 등록된 SubPage 목록 표시 및 개별 토글 |
| 그룹 단위 선택 | 그룹 헤더 체크박스로 해당 그룹 내 전체 도메인 선택/해제 |
| 전체 선택 | 기존 "전체 선택" 버튼 유지 |