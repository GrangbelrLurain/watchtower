# Suggested Commands for Watchtower Development

## Development
- **Install Dependencies**: `pnpm install`
- **Run Development App**: `pnpm tauri dev`
  - Starts the Tauri app with hot-reloading for the frontend.
- **Run Preview**: `pnpm preview`
  - Previews the build output locally.

## Build & Release
- **Build Production Installer**: `pnpm tauri build`
  - Generates the production installer for the current OS.
- **Bump Version**:
  - `pnpm version:patch` (e.g., 1.3.2 -> 1.3.3)
  - `pnpm version:minor` (e.g., 1.3.2 -> 1.4.0)
  - `pnpm version:major` (e.g., 1.3.2 -> 2.0.0)
  - **Note**: Version bumping must be followed by `git` commands as instructed by the script.

## Quality Assurance
- **Lint & Format**: `pnpm format`
  - Runs `biome check --write` to fix linting and formatting issues.
- **Unsafe Format**: `pnpm format:f`
  - Runs `biome check --write --unsafe` (use with caution).
- **Type Check**: `pnpm type-check`
  - Runs `tsc --noEmit` to verify TypeScript types.
- **Rust Lint**: `pnpm clippy`
  - Runs `cargo clippy` in the `src-tauri` directory.
- **Pre-commit Hooks**: Husky automatically runs `biome check --write` and `tsc --noEmit` on staged files.

## Utilities
- **List Files (Windows)**: `Get-ChildItem` (or `ls`, `dir`)
- **Find String (Windows)**: `Select-String` (or `grep` equivalent)
- **Change Directory**: `Set-Location` (or `cd`)
