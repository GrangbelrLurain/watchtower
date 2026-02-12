---
title: Backend & Frontend Strategy
description: Watchtower 백엔드 분석 및 프론트엔드 구현 계획
keywords: [백엔드, 프론트엔드, 러스트, 타우리, 라우트, api]
when: BE/FE 설계 개요, 라우트 전략 파악 시
related: [plans/02-frontend-routes, plans/01-backend-api]
---

# 🛸 Watchtower Backend & Frontend Strategy

이 문서는 `src-tauri`의 핵심 로직 분석 결과와 그에 따른 프론트엔드 라우트 설계를 기록합니다.

## 1. Rust Backend 분석 (src-tauri)
이 앱은 도메인 모니터링 및 관리를 위한 핵심 커맨드를 갖추고 있습니다.

### 주요 데이터 모델
- **Domain**: `id`, `url`, `group_id` (Option)
- **ApiResponse<T>**: `success`, `message`, `data` 구조의 일관된 응답 포맷.

### 가용한 Tauri Commands
- `regist_domains`: 도메인 일괄 등록
- `get_domains`: 전체 도메인 목록 조회
- `get_domain_by_id`: 상세 조회
- `update_domain_by_id`: 정보 수정
- `remove_domains`: 도메인 삭제
- `check_apis`: (구현 중) API 상태 체크 엔드포인트

## 2. 프론트엔드 구현 계획 (src/routes/)
백엔드 기능을 사용자에게 제공하기 위한 TanStack Router 기반의 뷰 설계입니다.

### Route 설계
1. **`/` (Dashboard)**: 전체 도메인 상태 요약 및 모니터링 현황판.
2. **`/domains` (Domain List)**: 등록된 도메인 관리 (수정, 삭제, 필터링).
3. **`/domains/add` (Add Domain)**: 신규 URL 일괄 등록 UI.
4. **`/domains/$id` (Domain Detail)**: 개별 도메인 상태 상세 정보.
5. **`/settings` (Settings)**: 알림 및 체크 주기 설정.

## 3. 핵심 기능 요구사항
- **일괄 등록**: 긴 URL 리스트를 한 번에 처리하는 UI/UX.
- **실시간성**: Tauri 커맨드를 주기적으로 호출하거나 이벤트를 수신하여 실시간 상태 반영.
- **그룹화**: 도메인을 서비스나 목적별로 그룹화하여 관리.

---
마지막 업데이트: 2026-02-09
