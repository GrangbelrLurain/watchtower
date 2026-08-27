<div align="center">

<img src="./public/logo-animated.svg" alt="Horizon Gateway Logo" width="100%" />

# Horizon Gateway

Free local MITM, API mock, and domain health in one desktop app.  
Personal and commercial use. Your AI agent can drive it with `hgc`.

<p align="center">
  <a href="https://github.com/delete-horizon/horizon-gateway/releases"><strong>Download</strong></a> ·
  <a href="https://gateway.delete-horizon.com"><strong>Website</strong></a> ·
  <a href="./README.ko.md"><strong>한국어 문서 (Korean)</strong></a>
</p>

[![Release](https://img.shields.io/github/v/release/delete-horizon/horizon-gateway?style=flat-square&color=blue)](https://github.com/delete-horizon/horizon-gateway/releases)
[![License](https://img.shields.io/badge/license-Free%20for%20Personal%20%26%20Commercial%20Use-green?style=flat-square)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)](#installation)
[![Built with](https://img.shields.io/badge/built%20with-Rust%20%2B%20Tauri%202%20%2B%20React%2019-orange?style=flat-square)](https://tauri.app)

</div>

---

<div align="center">
  <img src="./docs/images/gateway-proxy-routes.png" alt="Horizon Gateway Local MITM Proxy & Dynamic Routing" width="90%" />
</div>

---

## Why Horizon Gateway?

Modern frontend and backend engineering requires running multiple disconnected utilities simultaneously:
- Charles or Proxyman for HTTPS packet inspection
- Mockoon or Postman for API mocking
- Ngrok or Cloudflare Tunnels for mobile and remote debugging
- Browser developer tools and documentation sheets for UI/UX guidelines and domain health tracking

Horizon Gateway consolidates your local development network and debugging toolchain into a single, native desktop application.

- **Native Performance**: Built with Rust and Tauri 2, delivering a lightweight ~16MB Windows installer footprint and negligible memory usage compared to Electron-based alternatives.
- **AI Agent-Ready**: Includes a dedicated console CLI (`hgc`) designed for direct integration with AI coding assistants like Cursor, Gemini CLI, Claude Code, and Windsurf.
- **Zero-Friction Configuration**: Switch proxy routes, mock endpoints, and inspect client applications with a single click.

---

## Screenshots

<div align="center">
  <p><strong>OpenAPI & Mocking Rule Editor</strong></p>
  <img src="./docs/images/gateway-mock-editor.png" alt="OpenAPI & API Mocking Rule Editor" width="85%" />
  <br/><br/>
  <p><strong>hgc AI Agent CLI with Cursor</strong></p>
  <img src="./docs/images/gateway-hgc-cursor.png" alt="hgc Agent CLI with Cursor" width="85%" />
</div>

---

## Core Features

### 1. High-Performance Local MITM Proxy & Dynamic Routing
- Built-in HTTPS decryption proxy powered by Hyper and Tokio.
- **Dynamic Local Routing**: Redirect live domain traffic (`*.example.com`) directly to local development ports (`localhost:3000`) or static build directories without modifying `/etc/hosts` or DNS settings.
- Automatic PAC script generation with customizable TLS bypass lists for enterprise communication tools (Teams, Slack, Zoom, SSO).

### 2. OpenAPI Explorer & Scenario-Based Mocking
- Visual OpenAPI schema inspection and parameter tree exploration.
- Define flexible mock rules (status codes, synthetic latency, custom JSON payloads, and dynamic response headers) to build frontends before backend implementation is complete.

### 3. Domain Health & Live Observability
- Real-time latency tracking, HTTP status monitoring, and SSL certificate validation across development, staging, and production environments.
- Logical domain grouping with instant health status indicators.

### 4. AI Agent Integration (`hgc` CLI)
- Manage proxy routes, mock rules, and domain records directly from the terminal.
- Install native agent skills via `hgc init --project` to grant AI coding assistants (Cursor, Claude, Gemini, Windsurf, Copilot) automated environment awareness.

### 5. Mobile Debugging & Secure Tunneling
- **ADB Port Forwarding**: Automatically route connected Android device traffic through the local proxy.
- **Secure Tunneling**: Expose local proxy environments over Tailscale or Cloudflare tunnels for remote QA and cross-device validation. *(Note: iOS USB debugging is unsupported; use Android ADB or network tunnels)*.

### 6. Live Capture & UI/UX Policy Inspector
- Inject an interactive inspector overlay into monitored web applications.
- Visually select DOM elements, pin interactive notes, and associate UI/UX design policies with rich Markdown support.
- Live theme synchronization using DaisyUI 5 tokens.

---

## Installation

Download the prebuilt binaries from the [GitHub Releases](https://github.com/delete-horizon/horizon-gateway/releases) page:

| Operating System | Package | Architecture |
|---|---|---|
| Windows | `.exe` / `.msi` | x64 (~16MB installer) |
| macOS | `.dmg` | Universal (Apple Silicon & Intel) |
| Linux | `.AppImage` / `.deb` / `.rpm` | x64 |

---

## Quick Start

1. **Start the Proxy**: Launch Horizon Gateway and toggle the local proxy switch in the sidebar.
2. **Install Root CA**: Navigate to **Settings -> Root CA -> Export & Install** to enable HTTPS decryption.
3. **Add a Route**: Under **Proxy -> Routes**, specify a target domain pattern (e.g. `api.example.dev`) and map it to `http://localhost:3000`.
4. **Mock an API**: Under **APIs -> Mocking**, configure a rule for any endpoint (e.g. `/user/profile`) and test your frontend immediately.

---

## AI Agent Integration

Horizon Gateway includes `hgc`, a fast console CLI that operates without administrative privilege requirements.

```bash
# Initialize AI agent skills in the current project
hgc init --project

# List all available internal commands
hgc list

# Inspect command usage and schemas
hgc help get_domains

# Execute a command directly
hgc run get_domains '{}'
```

---

## Tech Stack

- **Desktop Shell**: Tauri 2, Rust, Tokio, Hyper, Axum
- **Frontend UI**: React 19, Vite 7, TanStack Router, Jotai, Tailwind CSS 4, DaisyUI 5
- **Tooling**: TypeScript 5.8, Biome, pnpm

---

## License & Notice

- **Free for Personal and Commercial Use**: Core desktop features and CLI are completely free to use. Source code is not open; download the official installer.
- **Author**: 규연 (kyuyeon)
- **Contact**: `hello@delete-horizon.com`
- **Changelog**: See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.
