# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v1.3.2] - 2026-02-11

### Added

-   **Search domains in proxy**: Added search domains support in proxy feature.
-   **Version display**: App version is now shown on the Home page hero section (from `tauri.conf.json`).

### Changed

-   **Route restructure**: Split dashboards (`/domains/dashboard`, `/proxy/dashboard`), reorganized status routes (`/status` with index, logs, settings).

---

## [v1.3.1] - 2026-02-11

### Fixed

-   **Pubkey alignment**: Fixed updater public key to match the signing key used in CI. In-app update install and verification now work correctly (resolves "signature was created with a different key" error).

---

## [v1.3.0] - 2026-02-11

### Added

-   **Auto-update notifications**: App checks for updates on startup (3s delay) and shows a notification banner when a new version is available.
-   **Settings page**: "Check for updates" button for manual check.
-   **Signed updates**: Tauri updater plugin with GitHub Releases; requires signing keys. See "Updater Setup" in README.

---

## [v1.2.1] - 2026-02-11

### Added

-   **In-app setup page** (`/proxy/setup`): PAC URL, manual proxy, and HTTPS certificate download. "설정 페이지 열기" now navigates in-app instead of opening in browser.
-   **Host-specific certificate**: Shared `HostCertCache` so TLS and download serve the same cert—installing the downloaded cert now correctly trusts the server. Fixed CN (hostname) and validity dates (no more 1975 issue).
-   **Setup page in English**: Both in-app and proxy-served setup pages localized to English.
-   **Window startup**: App starts maximized (`maximized: true` in `tauri.conf.json`).

### Changed

-   **Setup HTML extraction**: Proxy setup page moved from inline Rust to `src-tauri/resources/setup.html` for easier maintenance.

### Removed

-   **Standalone setup app**: `apps/setup` Vite project removed (consolidated into main app).

---

## [v1.2.0] - 2026-02-10

### Added

-   **Settings page** (sidebar entry): DNS server (used for proxy pass-through and domain status checks), full settings Export/Import (JSON: domains, groups, links, proxy routes, DNS).
-   **Proxy**: Optional DNS server for pass-through; when no route matches, hostnames are resolved via the configured DNS. Domain status checks also use the same global DNS.
-   **Domain management**: Domain settings (pencil icon) opens Edit modal: change address (URL) and group in one place.
-   **Status Logs**: Level filter (All / Info / Warning / Error) to narrow log list.
-   **App identity**: Watchtower tower icon (SVG) applied to sidebar, titlebar, favicon, and window/taskbar.

### Changed

-   **UI consistency**: Input, Button (incl. `size="icon"`), Textarea, Badge style unified across pages; raw inputs replaced with shared components where applicable.
-   **API**: `update_domain_by_id` now takes optional payload `{ url? }`.

---

## [v1.1.0] - 2026-02-10

### Added

-   Row virtualizer on Domains list page for smooth scrolling with large lists.
-   Row virtualizer on Status page (per-group) with card grid virtualization.
-   Row spacing between virtualized rows on domains and status pages.

### Changed

-   **Refactored UI** into feature modules: `features/dashboard`, `features/domains-list`, `features/domain-groups`, `features/domain-status`.
-   Extracted reusable components: HeroSection, FeatureGrid, SystemStatusCard, VirtualizedDomainList, DomainRow, GroupSelectModal, DomainListEmpty, CreateGroupCard, GroupCard, AssignDomainsModal, VirtualizedGroupSection.

---

## [v1.0.0] - 2026-02-09

### Added

-   **Initial Stable Release** 🚀
-   Global Loading Screen with interactive cancel functionality.
-   Full History Logs system with daily file rotation.
-   Dashboard Hero design and responsive layout.
-   Husky + lint-staged for development workflow.
-   Unified domain management and real-time status UI.
