# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [v1.4.6] - 2026-03-30

### Added

-   **Persistent Page State Management**: Implemented route-level Jotai stores for all major pages to maintain UI state (search queries, filters, input fields) across navigation.
-   **API Schema Persistence**: Enhanced the API schema explorer to remember selected domains, endpoints, and individual form data per endpoint, surviving app restarts via `atomWithStorage`.
-   **Expanded Filter Persistence**: Migrated monitor and API logs to use `atomWithStorage` for filter settings, ensuring selections persist across app reloads.
-   **Proxy Dashboard Memory**: Port settings and route addition inputs now persist across page changes.

### Changed

-   **State Architecture**: Refactored application state to a modular "route-level store" pattern for better maintainability and performance.

---

## [v1.4.5] - 2026-03-27

### Added

-   **User Profile System**: Integrated a persistent user profile system using Jotai (`atomWithStorage`). Users can now customize their name, role, and avatar theme (gradients).
-   **Onboarding Flow**: Added a premium first-time onboarding modal that greets new users and guides them through account setup and language selection.
-   **Standalone Profile Page**: Created a dedicated `/profile` route for managing personal information and language preferences, providing a focused space for user customization.

### Changed

-   **Sidebar Redesign**:
    -   Removed the top logo section for a minimalist, sophisticated aesthetic.
    -   Replaced hardcoded profile data with dynamic atom-based data.
    -   Decoupled Profile Settings and General Settings click targets to prevent overlapping event issues.
-   **Settings Refinement**: Migrated language preferences from global settings to the Profile page.

### Fixed

-   **A11y (Accessibility)**: Resolved multiple labeling inconsistencies and ensured all inputs on the onboarding and profile pages are correctly associated for screen-reader support.

---

## [v1.4.4] - 2026-03-27

### Changed

-   **Routing Structure**: Migrated file-based routes (`*.tsx`) across `apis`, `domains`, `monitor`, and `proxy` to a folder-based structure (`*/index.tsx`) for better code organization and collocation of localization files.
-   **Localization (i18n)**: Fully decoupled hardcoded UI text in domain feature components (`DomainListEmpty`, `EditDomainModal`, `GroupSelectModal`, `GroupCard`, etc.) by passing translation dictionaries via props. Refined Korean dictionaries for a more natural UX.

### Fixed

-   **Logs UI Layout**: Fixed an issue where grid and flex layouts were completely broken on `/monitor/logs` and `/apis/logs`. The root cause was an overly broad `logs` entry in `.gitignore` that caused Tailwind v4 to abruptly skip scanning any directory named `logs` for utility classes.

---

## [v1.4.3] - 2026-03-26

### Fixed

-   **Proxy Infinite Loop**: Fixed an issue where the `reqwest` client would pick up the OS system proxy (Watchtower itself), causing an infinite request loop. Added `.no_proxy()` to bypass system settings.
-   **Local Route Streaming**: Fixed a bug where local route requests were fully buffered into memory when API logging was disabled. Now uses a fast streaming body path to support SSE and chunked streams properly.
-   **Root Path 404 Error**: Fixed the Axum router configuration to correctly match the root `/` path. Previously, the `/*path` rule failed to match `/`, leading to unexpected 404 errors.
-   **GET Request Body Error**: Fixed a bug where `GET`, `HEAD`, and `OPTIONS` requests were assigned an empty body stream, causing `reqwest` to append a `Transfer-Encoding: chunked` header which was rejected by Next.js/Node servers.
-   **Garbled Text Rendering**: Fixed an issue where compressed responses (like `gzip` or `br`) appeared as garbled text in the browser. The proxy now preserves the `content-encoding` header, allowing the browser to decode it correctly.

---

## [v1.4.2] - 2026-02-27

### Added

-   **Docs**: Aligned architecture design with the new 9-step development roadmap.
    -   Defined new data models: SubPage, TestScenario, ScenarioStep, and MockRule.
    -   Detailed the API Chaining pipeline (variable extraction & template substitution).
    -   Integrated Golden Master (Mocking) interceptor logic into the Proxy architecture.
    -   Specified the Sequential Migration (Migration Chain: v1->v2->v3) strategy.

### Changed

-   **Monitoring**: Expanded monitoring scope to include per-route health checks for sub-pages.
-   **Architecture Models**: Updated project overview diagrams and unified backend command specifications.
-   **UI**: Updated icons across the application.

---

## [v1.4.1] - 2026-02-20

### Added

-   **API Logs System** (`/apis/logs`): Full implementation of request/response logging (Phase 2).
    -   Daily JSONL log rotation with file management.
    -   Logs Dashboard with filtering by Date, Method, Host, and Path.
    -   Detail view for request/response headers and bodies.
-   **API History & Replay**: Schema Viewer now has a "History" button to view log entries for the selected endpoint.
-   **Request Replay**: One-click to populate request headers and body from historical logs into the Schema test form.
-   **API Log Filter**: `get_api_logs` backend command extended with `exact_match` filter support for precise endpoint lookup.

### Changed

-   **Schema UI**: Improved Domain Selector design (Card-based) and overall Schema Viewer layout responsiveness.
-   **UI Refinement**: Fixed button shrinking and text wrapping issues on mobile layouts across Dashboard and Logs pages.
-   **Code Quality**: Fixed `ApiLogEntry` property naming (snake_case) consistency between frontend and backend.
-   **Icons**: Added missing Lucide icons (`Clock`, `X`) to Schema Viewer.

---

## [v1.4.0] - 2026-02-13

### Added

-   **APIs section**: New sidebar section "APIs" with Dashboard, Settings, Schema, and Logs (Logs placeholder).
-   **APIs Dashboard**: Per-domain API logging—register domains, toggle logging/body, set Schema URL, download OpenAPI schema from URL. Cascade delete of API logging links when a domain is removed.
-   **APIs Settings** (`/apis/settings`): Two-panel UI for domain registration/unregistration with group-based sections and search (same pattern as Monitor Settings).
-   **API Schema viewer** (`/apis/schema`): OpenAPI 3.x JSON viewer—select domain, browse tag-grouped endpoints, fill parameters/body, send request (Try-it-out), view response. Custom headers collapsible; compact parameter layout.
-   **Schema URL & download**: `DomainApiLoggingLink` now has `schemaUrl`; backend commands `download_api_schema` and `get_api_schema_content` for fetching and storing schemas under `{app_data}/schemas/{domain_id}.json`.
-   **Send API request**: Backend `send_api_request` command (reqwest, TLS skip, 30s timeout) returns status, headers, body, elapsed time; errors returned as ApiResponse for clear UI feedback.
-   **OpenAPI parser**: Frontend `openapi-parser.ts` for endpoint extraction, `$ref`/`allOf` resolution, and example JSON generation.
-   **Version bump scripts**: `pnpm version:patch`, `version:minor`, `version:major` to sync version across `package.json`, `tauri.conf.json`, and `Cargo.toml`.

### Changed

-   **Proxy always-on**: Proxy auto-starts on app launch; start/stop buttons removed. "Local routing" toggle controls whether traffic is routed to local backends or passed through; port settings (forward + reverse) consolidated in one card.
-   **Proxy auto-start errors**: Persistent error state and banner when proxy fails to start (e.g. port in use); manual retry via dashboard.
-   **Monitor rename**: "Status" renamed to "Monitor"—routes `/status` → `/monitor`, "Status Check Settings" → "Monitor Settings", "Live Status" → "Live Monitor". Backend `DomainStatus` → `DomainMonitorLink`, `domain_status.json` → `domain_monitor_links.json` with migration.
-   **Monitor Settings**: Group-based collapsible UI and search (URL or group name); fixed scroll-to-top bug on checkbox click by moving ListItem out of parent component.
-   **Docs**: `docs/plans/` restructured to `docs/architecture/`; added `docs/TODO.md` for implementation checklist. New/updated docs: 05-monitor (group UI), 07-apis (Dashboard, Settings, Schema viewer), 09-domain-use-cases, 10-json-schema-migration.

### Fixed

-   **HTTPS CONNECT**: Fixed request body stream blocking in `forward_to_backend` (reconstruct request for GET/HEAD/etc. to avoid blocking on TLS-terminated body).
-   **PAC file**: Forward proxy now passes its port to `ProxyState` so `/.watchtower/proxy.pac` is generated correctly.
-   **Certificate download**: Setup page certificate download now uses HTTP proxy port (`http://127.0.0.1:{port}/.watchtower/cert/...`) instead of HTTPS target URL, avoiding chicken-and-egg trust issue.
-   **Schema viewer base URL**: Domain URL already containing scheme (e.g. `https://api.example.com`) no longer double-prefixed as `https://https//...`.

---

## [v1.3.2] - 2026-02-12

### Added

-   **Search domains in proxy**: Added search domains support in proxy feature.
-   **Version display**: App version is now shown on the Home page hero section (from `tauri.conf.json`).
-   **Docs consolidation**: Project docs moved from `.agent/workflows` to `docs/` (Human·Agent shared). Added `.agent/README.md` and `.cursor/README.md` as pointers.
-   **YAML frontmatter**: All docs now have consistent frontmatter (`title`, `description`, `keywords`, `when`, `related`). Keywords unified in Korean.

### Changed

-   **Route restructure**: Split dashboards (`/domains/dashboard`, `/proxy/dashboard`), reorganized status routes (`/status` with index, logs, settings).
-   **Docs structure**: Standardized `related` path format; updated docs/README with document map and directory structure.

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
