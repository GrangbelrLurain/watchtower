---
title: Rust 코드 컨벤션
description: Rust 코드 스타일, Clippy 설정, Tauri Command 규칙
keywords: [러스트, Clippy, 타우리, 커맨드, 컨벤션]
when: Rust 코드 작성, Command 추가 시
related: [plans/01-backend-api, 01-typescript-conventions]
---

# Rust 코드 컨벤션

## Lint 설정

- **Clippy**: `cargo clippy` 또는 `pnpm clippy`로 실행
- **설정**: `src-tauri/Cargo.toml`의 `[lints]` 섹션
- **CI**: `clippy` 실행을 빌드 전단계에 추가 권장

## 코딩 스타일

| 항목 | 규칙 |
|------|------|
| **네이밍** | snake_case (함수, 변수, 모듈), PascalCase (타입, enum) |
| **에러** | `Result<T, String>` 또는 커스텀 에러 타입. `unwrap()`는 피하고 `?` 활용 |
| **직렬화** | FE 연동 필드는 `#[serde(rename_all = "camelCase")]` 사용 |
| **문서화** | pub 함수·타입은 `///` doc comment 권장 |

## Tauri Command 규칙

| 항목 | 규칙 |
|------|------|
| **인자 형식** | 인자가 있는 Command는 단일 `payload` 객체로 받음 |
| **Payload 구조** | `#[derive(serde::Deserialize)]` + `#[serde(rename_all = "camelCase")]` |
| **FE 전달** | `invokeApi("cmd", { payload: { ... } })` 형태 |

## 모델·서비스

- **Join 테이블**: `*_link` 접미사 통일 (예: `domain_group_links.json`)
- **서비스**: 상태 변하는 작업은 `mut` lock, 읽기 전용은 `clone` 반환
