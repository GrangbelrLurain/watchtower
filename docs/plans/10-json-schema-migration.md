---
title: JSON 스키마 버전 및 마이그레이션
description: JSON 저장소에 schema_version 추가, 버전 없으면 v1으로 취급 후 최신으로 마이그레이션
keywords: [json, 스키마, 버전, 마이그레이션]
when: JSON 저장소 구조 변경, 마이그레이션 시
related: [01-backend-api, 09-domain-use-cases]
---

# JSON 스키마 버전 및 마이그레이션

JSON 기반 저장소에 `schema_version`을 추가하고, 버전 정보가 없으면 v1으로 취급한 뒤 최신 버전으로 마이그레이션합니다.

## 1. 규칙

| 규칙 | 설명 |
|------|------|
| **버전 필드** | 모든 JSON 저장소에 `schema_version` 루트 필드 포함 |
| **v1 = 버전 없음** | `schema_version`이 없으면 v1으로 취급 |
| **마이그레이션** | v1 또는 구버전 로드 시 → 최신 버전으로 변환 후 저장 |

## 2. JSON 형식 (v2)

```json
{
  "schema_version": 2,
  "data": [ ... ]
}
```

- `schema_version`: 현재 스키마 버전 번호
- `data`: 실제 데이터 (배열 또는 객체)

## 3. 대상 파일

| 파일 | 데이터 타입 | v1 형식 |
|------|-------------|---------|
| `domains.json` | `Vec<Domain>` | `[{ "id": 1, "url": "..." }]` |
| `groups.json` | `Vec<DomainGroup>` | `[{ "id": 1, "name": "..." }]` |
| `domain_group_links.json` | `Vec<DomainGroupLink>` | `[{ "domain_id": 1, "group_id": 1 }]` |
| `domain_monitor_links.json` | `Vec<DomainMonitorLink>` | `[{ "domainId": 1, "checkEnabled": true, ... }]` |
| `domain_local_routes.json` | `Vec<LocalRoute>` | `[{ "id": 1, "domain": "...", ... }]` |
| `proxy_settings.json` | `ProxySettings` | `{ "dnsServer": null, "proxyPort": 8888, ... }` |

## 4. 로드 흐름

### 4.1 앱 시작 시 (마이그레이션)

```
Tauri setup() 시작
  → app_data_dir 생성
  → migration::run_all(app_data_dir)
      → 각 JSON 파일: 버전 확인
      → version < CURRENT? → migration chain 순차 실행 (1→2→3…)
      → 백업(.bak) 후 저장
  → 서비스 생성 (load_versioned로 로드)
```

### 4.2 서비스 로드 시 (load_versioned)

- 마이그레이션 후 항상 v2+ 형식이므로 VersionedJson 파싱
- v1 fallback: 없으면 raw 파싱 후 v2로 저장 (이중 안전장치)

## 5. 버전 이력

| 버전 | 변경 내용 |
|------|----------|
| 1 | 버전 필드 없음 (기존 형식) |
| 2 | `schema_version` + `data` 래퍼 도입 |

## 6. 구현

### 6.1 실행 시점

- **앱 시작 시** Tauri 메인 로직(서비스 생성) **이전**에 마이그레이션 실행
- `lib.rs` setup() 맨 앞에서 `storage::migration::run_all(&app_data_dir)` 호출

### 6.2 structure별 순차 마이그레이션

- 마이그레이션은 버전별로 정의: 1→2, 2→3, …
- 구버전(v1)에서 최신 버전으로 갈 때 **순서대로** 실행 (1→2 후 2→3)
- 각 structure(domains, groups, links, status, routes, proxy_settings)에 동일한 chain 적용

### 6.3 모듈

| 모듈 | 역할 |
|------|------|
| `storage/migration.rs` | 앱 시작 시 `run_all()` 호출, 각 파일에 migration chain 적용 |
| `storage/versioned.rs` | `load_versioned`, `save_versioned` (서비스에서 사용) |

### 6.4 migration chain 추가

- `migrate_1_to_2`: raw → `{ schema_version: 2, data }` 래퍼
- `migrate_2_to_3`: (추후) v3 구조 변경 시 추가
- `run_all` 내 `migrations` 벡터에 순서대로 push

### 6.5 마이그레이션 전 백업

- `.json.bak` 파일로 복사

### 6.6 파일 경로 마이그레이션

- `domain_status.json` → `domain_monitor_links.json`: 링크 테이블 네이밍 변경 시 run_all에서 migrate_domain_status_to_monitor_links() 호출

---

참고: [01-backend-api.md](01-backend-api.md), [09-domain-use-cases.md](09-domain-use-cases.md)
