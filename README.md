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

### [v1.3.0] - 2026-02-11
-   **Auto-update notifications** 🔄
-   **In-app update check**: App checks for updates on startup (3s delay) and shows a notification banner when a new version is available.
-   **Settings page**: "Check for updates" button for manual check.
-   **Signed updates**: Tauri updater plugin with GitHub Releases; requires signing keys (`tauri signer generate`). See "Updater Setup" section.

### [v1.2.1] - 2026-02-11
-   **Proxy Setup & SSL** 🔐
-   **In-app setup page** (`/proxy/setup`): PAC URL, manual proxy, and HTTPS certificate download. "설정 페이지 열기" now navigates in-app instead of opening in browser.
-   **Host-specific certificate**: Shared `HostCertCache` so TLS and download serve the same cert—installing the downloaded cert now correctly trusts the server. Fixed CN (hostname) and validity dates (no more 1975 issue).
-   **Setup HTML extraction**: Proxy setup page moved from inline Rust to `src-tauri/resources/setup.html` for easier maintenance.
-   **Setup page in English**: Both in-app and proxy-served setup pages localized to English.
-   **Window startup**: App starts maximized (`maximized: true` in `tauri.conf.json`).
-   **Removed** `apps/setup` standalone Vite project (consolidated into main app).

### [v1.2.0] - 2026-02-10
-   **Global Settings & Proxy** ⚙️
-   **Settings page** (sidebar entry): DNS server (used for proxy pass-through and domain status checks), full settings Export/Import (JSON: domains, groups, links, proxy routes, DNS).
-   **Proxy**: Optional DNS server for pass-through; when no route matches, hostnames are resolved via the configured DNS. Domain status checks also use the same global DNS.
-   **Domain management**: Domain settings (pencil icon) opens Edit modal: change address (URL) and group in one place. `update_domain_by_id` now takes optional payload `{ url? }`.
-   **Status Logs**: Level filter (All / Info / Warning / Error) to narrow log list.
-   **UI consistency**: Input, Button (incl. `size="icon"`), Textarea, Badge style unified across pages; raw inputs replaced with shared components where applicable.
-   **App identity**: Watchtower tower icon (SVG) applied to sidebar, titlebar, favicon, and window/taskbar (via `tauri icon`). Source: `app-icon.svg`; export to `public/app-icon.svg` for in-app use.

### [v1.1.0] - 2026-02-10
-   **Performance & Structure** 📦
-   Row virtualizer on Domains list page for smooth scrolling with large lists.
-   Row virtualizer on Status page (per-group) with card grid virtualization.
-   Added row spacing between virtualized rows on domains and status pages.
-   Refactored UI into feature modules: `features/dashboard`, `features/domains-list`, `features/domain-groups`, `features/domain-status`.
-   Extracted reusable components: HeroSection, FeatureGrid, SystemStatusCard, VirtualizedDomainList, DomainRow, GroupSelectModal, DomainListEmpty, CreateGroupCard, GroupCard, AssignDomainsModal, VirtualizedGroupSection.

### [v1.0.0] - 2026-02-09
-   **Initial Stable Release** 🚀
-   Implemented Global Loading Screen with interactive cancel functionality.
-   Added full History Logs system with daily file rotation.
-   New Dashboard Hero design and responsive layout.
-   Integrated Husky + lint-staged for robust development workflow.
-   Unified domain management and real-time status UI.

<br />

## 👤 Author
- **Name**: 규연 (Administrator)

---
© 2026 Watchtower Project. Built for performance and reliability.
