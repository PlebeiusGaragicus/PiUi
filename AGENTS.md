# AGENTS.md

Guidance for humans and coding agents working on PiUi.

## `/piui` and the local web server

- **`extensions/piui.ts`** spawns **`node dist/piui-server.mjs`** (same Node as Pi) on **`127.0.0.1`** using **`PIUI_PORT`** (default **`8502`**).
- A **second** **`/piui`** while the server is already up uses **`open`** (macOS) or **`xdg-open`** (Linux) via **`pi.exec`** instead of spawning again.
- The server serves the built **Svelte** UI from **`dist/web`** and JSON APIs under **`/api/*`**.

## Build output

- **`npm install`** runs **`postinstall`** → **`scripts/postinstall-build.sh`**, which runs **`npm run build`** to produce **`dist/piui-server.mjs`** and **`dist/web/`**.
- Pi installs the git clone under **`~/.pi/agent/git/...`**; those **`dist/`** artifacts must exist **there**, not only in a separate dev checkout.

## Lifecycle

- **`session_shutdown`** with **`reason === "quit"`** terminates the tracked server PID so the port is not left bound after exiting Pi.

## Repository layout

- [`package.json`](package.json) — **`scripts.postinstall`** → [`scripts/postinstall-build.sh`](scripts/postinstall-build.sh).
- [`extensions/piui.ts`](extensions/piui.ts) — registers **`/piui`**, spawns or reuses the PiUi server, browser **`open`** / **`xdg-open`** when the URL already responds.
- [`server/`](server/) — Node server: **`main.ts`** (HTTP + static), **`session.ts`** / **`viewModel.ts`** (JSONL + transcript shaping).
- [`web/`](web/) — Svelte 5 + Vite frontend.
