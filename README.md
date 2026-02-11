# 📡 Watchtower

**Watchtower** is a premium, high-performance domain and service monitoring desktop application built with **Tauri**, **Rust**, and **React**. It provides real-time health checks, latency analytics, and historical logging for your digital infrastructure.

<br />

## ✨ Key Features

-   **Real-time Monitoring**: Instant HTTP/HTTPS status probes with sub-millisecond precision.
-   **Premium UI/UX**: Stunning interface with glassmorphism, smooth animations, and a sleek dark/light design.
-   **Historical Logs**: Detailed daily logs stored locally in NDJSON format for long-term analysis.
-   **Global Loading System**: Seamless navigation and data synchronization with interactive cancelation.
-   **Smart Grouping**: Organize your domains into functional groups for easier management.
-   **High Performance**: Minimal resource footprint thanks to the Rust backend and Tauri bridge.

<br />

## 🛠 Tech Stack

-   **Backend**: [Rust](https://www.rust-lang.org/) + [Tauri v2](https://tauri.app/)
-   **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Routing**: [TanStack Router](https://tanstack.com/router)
-   **Tooling**: [Biome](https://biomejs.dev/) (Lint/Format), [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged)
-   **Package Manager**: [pnpm](https://pnpm.io/)

<br />

## 🚀 Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/installation)

### Development
```bash
# Install dependencies
pnpm install

# Run the app in development mode
pnpm tauri dev
```

### Build (Release)
```bash
# Generate production installer
pnpm tauri build
```

### Updater Setup (for auto-update notifications)

The app checks for updates on startup and shows a notification banner when a new version is available.

**To enable signed updates** (required for release builds):

1. Generate signing keys:
   ```bash
   pnpm tauri signer generate -w ~/.tauri/watchtower.key
   ```
2. Replace `PLACEHOLDER_RUN_tauri_signer_generate` in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` with the **content** of `~/.tauri/watchtower.key.pub`
3. For GitHub Actions: add `TAURI_SIGNING_PRIVATE_KEY` repository secret with the **content** of `~/.tauri/watchtower.key` (or the file path)

<br />

## 🛡 Development Workflow

This project enforces strict code quality standards before every commit:

1.  **packageManager**: Fixed to `pnpm` to ensure consistent dependency resolution.
2.  **Git Hooks**: Managed by Husky.
    -   **Pre-commit**: Automatically runs `biome check --write` (Lint/Fix) and `tsc --noEmit` (Type Check).
    -   **Commit Blocker**: Commits will fail if there are any linting errors or type mismatches.

<br />

## 📋 Release History

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

<br />

## 👤 Author
- **Name**: 규연 (Administrator)

---
© 2026 Watchtower Project. Built for performance and reliability.
