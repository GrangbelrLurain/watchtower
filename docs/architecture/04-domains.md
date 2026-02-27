---
title: 도메인 및 하위 페이지 기능
description: Domain 마스터 목록, 하위 페이지(Sub-page), 그룹, 모니터, 참조 무결성
keywords: [도메인, 하위페이지, 그룹, 모니터, 상태체크, 연동]
when: 도메인 및 하위 페이지 관련 기능 구현·파악 시
---

# 도메인 및 하위 페이지 기능

Domain 마스터 목록, **하위 페이지(Sub-page)**, 그룹 관리, 모니터링, 도메인 간 연동을 정리합니다.

---

## 1. Domain 마스터 목록

- **역할**: 앱에 등록된 전체 도메인 풀 (Root URL 단위)
- **저장소**: `domains.json`
- **규칙**: Monitor·Proxy·APIs, 하위 페이지 등에 추가하려면 Domain에 먼저 존재해야 함.

---

## 2. 하위 페이지 (Sub-page)

로드맵 3단계의 핵심인 '테스트 시나리오 구성'을 위해 도입된 엔티티입니다.

- **역할**: 특정 도메인 하위에 존재하는 구체적인 라우팅 페이지 (예: `/login`, `/cart`)를 정의.
- **저장소**: `sub_pages.json`
- **구조**: `Domain` 1 : N `SubPage`
- **확장성**: 
  - 특정 하위 페이지에 접속했을 때 발생하는 종속 API 호출 목록을 매핑 (`SubPageApiLink`).
  - 하위 페이지 단위로 테스트 시나리오(`TestScenario`)를 그룹화.

---

## 3. 도메인 그룹

- **역할**: 도메인을 용도·프로젝트별로 분류
- **구조**: Domain ↔ DomainGroup (n:n, DomainGroupLink)
- **저장소**: `groups.json`, `domain_group_links.json`

### FE 인터랙션

- **등록 시**: `/domains/regist`에서 그룹 선택 후 일괄 등록 (`regist_domains`에 groupId)
- **목록**: `/domains/dashboard`에서 그룹별 필터, 행별 그룹명 표시
- **그룹 페이지**: `/domains/groups`에서 그룹 카드별 소속 도메인 표시

---

## 4. 도메인 및 하위 페이지 모니터 (상태 체크)

HTTP HEAD 요청으로 도메인 및 하위 페이지의 상태를 감시합니다. `DomainMonitorLink`로 체크 대상을 등록하고, 2분 주기 백그라운드 체크로 상태를 수집합니다.

- **확장 사항**: 루트 도메인 뿐만 아니라, 등록된 `SubPage`의 경로에 대해서도 HEAD 요청을 보내 개별 라우트의 생존 여부를 모니터링합니다.

상세: [05-monitor.md](05-monitor.md)

---

## 5. 도메인↔프록시 연동

도메인 목록과 프록시 라우트를 연결하여 중복 입력을 줄이고 일관성을 높입니다.

### 기능

| 기능 | 설명 |
|------|------|
| 프록시 라우트 추가 시 도메인 검색 | 도메인 URL에서 host 추출, SearchableInput 자동완성 |
| Domains → "프록시에 추가" | 도메인 행에서 직접 프록시 라우트 추가 |
| Proxy → "도메인에서 가져오기" | 도메인 목록에서 미등록 도메인 선택·일괄 추가 |
| 통합 검색 | 사이드바/상단에서 도메인·그룹·프록시 통합 검색 |

---

## 6. 참조 무결성 (Cascade)

| 동작 | 규칙 |
|------|------|
| 데이터 추가 | domain_id가 Domain에 존재해야 함 |
| Domain 삭제 | 해당 domain_id를 참조하는 그룹 링크, 모니터 링크, API 로깅 링크, **하위 페이지(SubPage)** 전체 cascade 삭제 |
| SubPage 삭제 | 하위 페이지에 종속된 **테스트 시나리오** cascade 삭제 |