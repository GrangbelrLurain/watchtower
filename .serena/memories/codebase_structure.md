# Codebase Structure

## Directory Layout
- `src-tauri`: Rust backend source code.
  - `src/main.rs`: Entry point.
  - `Cargo.toml`: Rust dependencies and configuration.
  - `tauri.conf.json`: Tauri configuration.
- `src`: Frontend source code.
  - `entities`: Business logic (e.g., `domain`, `api-test`).
  - `features`: Feature modules (e.g., `dashboard`, `domain-monitor`).
  - `routes`: TanStack Router definitions (`routes/apis`, `routes/domains`, etc.).
  - `shared`: Shared utilities and UI components (`api`, `lib`, `ui`, `utils`).
  - `main.tsx`: Entry point.
  - `vite-env.d.ts`: Vite environment types.
  - `routeTree.gen.ts`: Generated routing file.

## Key Files
- `README.md`: Project documentation.
- `package.json`: NPM package metadata and scripts.
- `pnpm-lock.yaml`: Exact versions of dependencies.
- `tsconfig.json`: TypeScript compiler options.
- `vite.config.ts`: Vite configuration.
- `biome.json`: Biome configuration (Lint/Format).
- `CHANGELOG.md`: Release notes.
