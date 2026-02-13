---
title: 모니터 기능
description: 도메인 상태 체크, 백그라운드 폴링, 로그, 모니터 설정
keywords: [모니터, 상태체크, HEAD, 폴링, 로그]
when: 모니터 기능 구현·파악 시
---

# 모니터 기능

도메인 상태 감시(HEAD 요청), 백그라운드 체크, 상태 로그, 모니터 설정을 정리합니다.

---

## 1. 개요

등록된 도메인에 대해 HTTP HEAD 요청을 보내 가용성·응답 시간을 감시합니다. Domain 마스터 목록에서 모니터 대상을 등록(링크)하는 구조.

```
Domain (마스터)
    │
    └─ DomainMonitorLink (체크 대상 + 옵션)
           │
           └─ DomainStatusLog (체크 결과)
```

---

## 2. 데이터 모델

| 모델 | 필드 | 역할 |
|------|------|------|
| **DomainMonitorLink** | domain_id, check_enabled, interval_secs | 모니터 체크 대상 + 옵션. `domain_monitor_links.json`에 저장 |
| **DomainStatusLog** | id, domain_id, url, status, level, ok, group, timestamp, latency, errorMessage? | 체크 결과. 최신은 메모리(`last_checks`), 과거는 `logs/{date}.json` |

### 저장 구조

| 데이터 | 위치 |
|--------|------|
| 체크 대상 + 옵션 | `app_data_dir/domain_monitor_links.json` |
| 최신 체크 결과 | 메모리 (`DomainMonitorService.last_checks`) |
| 과거 체크 로그 | `app_data_dir/logs/{YYYY-MM-DD}.json` |

---

## 3. 백그라운드 체크

- `lib.rs` `setup` hook에서 `tauri::async_runtime::spawn`으로 루프 실행
- **120초(2분) 간격**으로 `status_service.check_domains(...)` 호출
- 체크 대상: `check_enabled == true`인 DomainMonitorLink에 해당하는 도메인
- 병렬 체크: 도메인 목록을 동시에 HEAD 요청하여 성능 최적화
- DNS 설정: `ProxySettings.dns_server`를 사용하여 커스텀 DNS 사용 가능

### 체크 흐름

```
[2분 간격 루프]
    │
    ├─ DomainMonitorService.check_domains()
    │   ├─ check_enabled == true인 도메인 필터
    │   ├─ 각 도메인에 HTTP HEAD 요청 (병렬)
    │   ├─ 결과를 DomainStatusLog로 구성
    │   ├─ last_checks (메모리) 업데이트
    │   └─ logs/{date}.json에 추가 저장
    │
    └─ 120초 sleep → 반복
```

---

## 4. Commands

| Command | 설명 | 서비스 |
|---------|------|--------|
| `get_latest_status` | 최신 상태 목록 (메모리에서 조회) | DomainMonitorService |
| `check_domain_status` | 전체 상태 체크 수동 실행 | DomainMonitorService + Domain/Group/Link 서비스 |
| `get_domain_status_logs` | 날짜(YYYY-MM-DD)별 과거 로그 조회 | DomainMonitorService |
| `get_domain_monitor_list` | 모니터 링크 + URL 목록 조회 | DomainMonitorService, DomainService |
| `set_domain_monitor_check_enabled` | 도메인별 체크 활성화/비활성화 | DomainMonitorService |

---

## 5. FE 페이지

| 경로 | 역할 | 사용 Command |
|------|------|-------------|
| `/monitor` | 최신 상태 대시보드, 수동 체크 버튼 | `get_latest_status`, `check_domain_status` |
| `/monitor/logs` | 날짜별 과거 로그 조회 | `get_domain_status_logs` |
| `/monitor/settings` | 도메인별 체크 활성화/비활성화 | `get_domain_monitor_list`, `set_domain_monitor_check_enabled` |

### FE 동작

- `/monitor`: 마운트 시 `get_latest_status` 1회 + **30초 폴링**으로 최신 상태 갱신, "새로고침" 버튼으로 `check_domain_status` 수동 실행
- `/monitor/logs`: 쿼리 파라미터 `date` (YYYY-MM-DD)로 날짜별 조회
- `/monitor/settings`: 도메인 리스트에서 체크 활성화 토글

---

## 6. DomainStatusLog 레벨 판정

| level | 조건 |
|-------|------|
| `success` | HTTP 2xx |
| `warning` | HTTP 3xx, 4xx |
| `error` | HTTP 5xx, 타임아웃, 연결 실패 |

`ok` 필드: `level == "success"`이면 `true`, 그 외 `false`.
