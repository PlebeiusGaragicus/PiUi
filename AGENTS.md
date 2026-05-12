# AGENTS.md

Guidance for humans and coding agents working on PiUi.

## `/piui` and Streamlit

- **`extensions/piui.ts`** spawns Streamlit with **`--server.headless false`** so Streamlit can **open the default browser** when the server starts (first launch from Pi).
- A **second** **`/piui`** while the server is already up uses **`open`** (macOS) or **`xdg-open`** (Linux) via **`pi.exec`** instead of spawning again.
- **Do not** flip **`--server.headless`** to **`true`** without an intentional UX change and updates to **README.md** (and this file).

## Interpreter and venv

- Python: **`venv/bin/python`** in the package root when present (created by **`npm postinstall`**), else **`python3`**.
- Pi installs the git clone under **`~/.pi/agent/git/...`**; the venv must exist **there**, not only in a separate dev checkout.

## Lifecycle

- **`session_shutdown`** with **`reason === "quit"`** terminates the tracked Streamlit PID so the port is not left bound after exiting Pi.
