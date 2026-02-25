# Style and Conventions

## Code Style
- **Linting & Formatting**: Enforced by Biome (`biome check --write`) and TypeScript (`tsc --noEmit`).
- **Rust Lints**: Use `clippy` with some exceptions allowed in `Cargo.toml` (e.g., `module_name_repetitions`, `unused_async`, `needless_pass_by_value`, `unnecessary_wraps`).
- **Imports**: Avoid `default` imports unless absolutely necessary.
- **Naming**: Use descriptive variable and function names.
- **Comments**: Keep comments concise and relevant.

## Versioning
- **Semantic Versioning**: Follows SemVer 2.0.0.
- **Format**: `vX.Y.Z` (e.g., v1.4.1).
- **Tagging**: Git tags must match the version in `package.json`, `Cargo.toml`, and `tauri.conf.json`.

## Pre-commit Hooks
- **Husky**: Runs `biome check --write` and `tsc --noEmit` before every commit.
- **Check Failure**: If checks fail, the commit is blocked.

## Structure
- **Entities**: Business logic (e.g., `src/entities/domain`).
- **Features**: Feature modules (e.g., `src/features/dashboard`).
- **Routes**: TanStack Router definitions (e.g., `src/routes/monitor`).
- **Shared**: Shared utilities and UI components (e.g., `src/shared/ui`).
