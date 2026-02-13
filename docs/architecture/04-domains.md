---
title: 도메인 기능
description: Domain 마스터 목록, 그룹, 모니터, 도메인–프록시 연동, 참조 무결성
keywords: [도메인, 그룹, 모니터, 상태체크, 연동]
when: 도메인 관련 기능 구현·파악 시
---

# 도메인 기능

Domain 마스터 목록, 그룹 관리, 모니터링, 도메인 간 연동을 정리합니다.

---

## 1. Domain 마스터 목록

- **역할**: 앱에 등록된 전체 도메인 풀
- **저장소**: `domains.json`
- **규칙**: Monitor·Proxy·APIs에 추가하려면 Domain에 먼저 있어야 함

---

## 2. 도메인 그룹

- **역할**: 도메인을 용도·프로젝트별로 분류
- **구조**: Domain ↔ DomainGroup (n:n, DomainGroupLink)
- **저장소**: `groups.json`, `domain_group_links.json`

### FE 인터랙션

- **등록 시**: `/domains/regist`에서 그룹 선택 후 일괄 등록 (`regist_domains`에 groupId)
- **목록**: `/domains/dashboard`에서 그룹별 필터, 행별 그룹명 표시
- **그룹 페이지**: `/domains/groups`에서 그룹 카드별 소속 도메인 표시

---

## 3. 도메인 모니터 (상태 체크)

HEAD 요청으로 도메인 상태를 감시합니다. DomainMonitorLink로 체크 대상을 등록하고, 2분 주기 백그라운드 체크로 상태를 수집합니다.

상세: [05-monitor.md](05-monitor.md)

---

## 4. 도메인–프록시 연동

도메인 목록과 프록시 라우트를 연결하여 중복 입력을 줄이고 일관성을 높입니다.

### 기능

| 기능 | 설명 |
|------|------|
| 프록시 라우트 추가 시 도메인 검색 | 도메인 URL에서 host 추출, SearchableInput 자동완성 |
| Domains → "프록시에 추가" | 도메인 행에서 직접 프록시 라우트 추가 |
| Proxy → "도메인에서 가져오기" | 도메인 목록에서 미등록 도메인 선택·일괄 추가 |
| 통합 검색 | 사이드바/상단에서 도메인·그룹·프록시 통합 검색 |

### URL → Host 추출 유틸

- `https://api.example.com/v1` → `api.example.com`
- FE: `shared/utils/url.ts`의 `urlToHost()`, BE: 서비스 내 `url_to_host()`

---

## 5. 참조 무결성

| 동작 | 규칙 |
|------|------|
| Monitor/Proxy/APIs 추가 | domain_id가 Domain에 존재해야 함 |
| Domain 삭제 | 해당 domain_id를 참조하는 그룹 링크, 모니터 링크, API 로깅 링크도 cascade 삭제 |
| Domain만 존재 | Monitor·Proxy·APIs에 없어도 됨 (등록만 해둔 경우 허용) |

**cascade 삭제**: `remove_domains` 커맨드에서 DomainGroupLinkService, DomainMonitorService, ApiLoggingSettingsService의 remove_link 호출.
