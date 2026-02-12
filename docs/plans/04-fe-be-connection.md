---
title: FE–백엔드 연결 방식
description: invoke 패턴, ApiResponse 사용, 인자(snake_case), 페이지별 Command 매핑
keywords: [invoke, 타우리, api, 연결, ApiResponse]
when: 새 페이지·Command 연동, invoke 패턴 참조 시
related: [01-backend-api, 02-frontend-routes, conventions/01-typescript-conventions]
---

# FE–백엔드 연결 방식

domains 관련 페이지에서 프론트엔드가 Tauri 백엔드를 호출하는 **공통 패턴**과 **페이지별 Command 매핑**을 정리합니다. 새 페이지나 새 Command 연동 시 이 방식을 따르면 일관성이 유지됩니다.

## 1. 호출 수단

- **패키지**: `@tauri-apps/api/core`의 `invoke`
- **사용 예**: `const response = await invoke<ResponseType>("command_name", { arg1, arg2 });`
- **참고**: [01-backend-api.md](01-backend-api.md)에 등록된 Command 목록 정리됨

## 2. 백엔드 응답 형식 (ApiResponse)

Rust 쪽 `ApiResponse<T>` 구조:

- `success: boolean`
- `message: string`
- `data: T`

FE에서는 다음처럼 사용합니다.

- **성공 여부**: `response.success`
- **페이로드**: `response.data` (목록/단건 등)
- **사용자 메시지**: `response.message` (등록·수정·삭제 후 메시지 등)

```ts
const response = await invoke<{ success: boolean; data: Domain[] }>("get_domains");
if (response.success) {
  setDomains(response.data ?? []);
}
```

## 3. 인자 형식 (payload 객체 단위)

- **모든 Command**: 인자가 있으면 `{ payload: { ... } }` 형태로 전달
- **Payload 필드**: camelCase (BE `#[serde(rename_all = "camelCase")]`와 일치)

```ts
await invokeApi("regist_domains", { payload: { urls, groupId: selectedGroupId ?? undefined } });
await invokeApi("update_domain_by_id", { payload: { id: domain.id, url: domain.url } });
await invokeApi("remove_domains", { payload: { id } });
```

## 4. 공통 패턴 (기존 코드 기준)

| 항목 | 방식 |
|------|------|
| **로딩** | `useState(false)` + 호출 전 `setLoading(true)`, `try/finally`에서 `setLoading(false)` |
| **에러** | `try/catch` + `console.error`, 필요 시 `setMessage` 또는 토스트로 사용자 안내 |
| **목록/데이터 갱신** | mutation(등록·수정·삭제) 후 해당 **fetch 함수 재호출** (예: `fetchDomains()`, `fetchGroups()`) |
| **fetch 함수** | `useCallback`으로 정의, `useEffect`에서 마운트 시 1회 호출. 필요 시 의존 배열에 fetch 포함 |
| **타입** | `invoke<{ success: boolean; data: T }>("...")` 형태로 제네릭 지정. `T`는 `entities/domain/types` 등과 맞춤 |

## 5. 페이지별 사용 Command

| 라우트 | 파일 | 사용 Command | 비고 |
|--------|------|--------------|------|
| `/domains` | `domains/index.tsx` | `get_domains`, `get_groups`, `update_domain_by_id`, `remove_domains`, `clear_all_domains` | 목록 로딩 시 get_domains + get_groups, 변경 후 재조회 |
| `/domains/regist` | `domains/regist/index.tsx` | `get_groups`, `regist_domains` | 그룹 선택 후 일괄 등록, 성공 시 `/domains`로 이동 |
| `/domains/status` | `domains/status/index.tsx` | `get_latest_status`, `check_domain_status` | 초기 + 30초 폴링으로 get_latest_status, 수동 새로고침 시 check_domain_status |
| `/domains/status/logs` | `domains/status/logs.tsx` | `get_domain_status_logs` | 쿼리 인자 `date` (YYYY-MM-DD 문자열) |
| `/domains/groups` | `domains/groups/index.tsx` | `get_groups`, `get_domains`, `create_group`, `delete_group`, `update_group` | 그룹 CRUD + 그룹별 도메인 표시용 get_domains |

## 6. 현재 미연결/특이사항

- **`/` (Home)**: 백엔드 호출 없음. 정적 랜딩 + 링크만 제공.
- **`/domains/groups`의 수정(Edit)**: UI에 Pencil 버튼만 있고, 그룹 이름 수정 플로우(모달·인라인 편집)는 `update_group` 호출과 아직 연결되지 않았을 수 있음. 연결 시 위 패턴대로 `update_group` 호출 후 `fetchGroups()` 재호출 권장.
- **import_domains**: FE에서 직접 호출하는 UI는 없음. (JSON 임포트는 regist 페이지의 파일 업로드로 URL만 파싱 후 `regist_domains` 사용.)

## 7. 새 페이지/기능 연동 시 체크리스트

1. Command 이름·인자: [01-backend-api.md](01-backend-api.md)와 `lib.rs`의 `invoke_handler` 확인.
2. 인자: snake_case, optional은 `undefined` 또는 `null`로 전달.
3. 응답: `response.success` 확인 후 `response.data` 사용, 실패 시 에러 처리.
4. mutation 후: 목록/상태 갱신을 위해 해당 fetch 재호출.
5. 타입: `entities/domain/types`와 BE 모델 필드 맞춤 (camelCase는 DomainStatus 등 직렬화 규칙에 따름).

이 문서는 기존 domains 관련 코드를 파악한 뒤 정리한 것이므로, 새 Command 추가 시 [01-backend-api.md](01-backend-api.md)와 이 문서를 함께 업데이트하는 것을 권장합니다.
