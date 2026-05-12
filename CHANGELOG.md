# Changelog

All notable changes to this project are documented in this file.

## [0.1.7] - 2026-05-12

### Changed

- [`streamlit_app/app.py`](streamlit_app/app.py): **Directory** and **session file** pickers use **full-width sidebar and main buttons** (`type="primary"` when selected, `type="secondary"` otherwise) instead of **`st.radio`**, for clearer layout and one-click selection.

### Fixed

- **Double-click to change selection** on directory and session radios (see [#1](https://github.com/PlebeiusGaragicus/PiUi/issues/1)): selection is driven by **`st.session_state`** and stable **`key`s** (`piui_dir_*`, `piui_file_{dir}_*`) without conflicting **`index=`** wiring; changing directory clears the stored file label so the file list stays consistent.

## [0.1.6] - 2026-05-12

### Changed

- [`streamlit_app/app.py`](streamlit_app/app.py): **`st.chat_message` avatars** — user (brain), assistant (robot), tool / bash (computer), per [Streamlit chat_message](https://docs.streamlit.io/develop/api-reference/chat/st.chat_message).
- **Tool calls** shown inline as formatted JSON (no expander); **tool results** (`read`, etc.) rendered as **raw text in `st.code`**, not markdown.
- **Tool call + tool result pairing**: after each assistant message, consecutive spine lines with `role: toolResult` matching `toolCallId` are merged into the **same computer chat bubble** as the corresponding tool call; the transcript loop **skips** consumed lines so orphans still render standalone.

## [0.1.5] - 2026-05-12

### Changed

- [`streamlit_app/app.py`](streamlit_app/app.py): **Redesigned** the Streamlit UI. **Sidebar** lists session directories (Pi cwd buckets under `~/.pi/agent/sessions`) with **`st.radio`** (no dropdown). **Main** lists `.jsonl` files in the selected directory with **`st.radio`**, then shows a **chat-style transcript** (`st.chat_message`) for user and assistant turns, **expanders** for thinking and tool calls, and blocks for **tool results** and other roles. Session ordering follows the **parent/child tree** when possible (latest leaf → root), with file-order fallback. **Removed** all **`st.dataframe`** / table previews.

## [0.1.4] - 2026-05-12

### Added

- **`/piui`**: if Streamlit is already listening on the configured URL, **open the browser** instead of spawning a second server.
- **Port busy** recovery: when Streamlit exits because the port is in use but something responds at that URL, **open the existing server** in the browser when possible.

### Changed

- **`session_shutdown` (`reason: "quit"`)**: **SIGTERM** the detached Streamlit process PiUi spawned so servers do not outlive Pi.

### Documentation

- [`README.md`](README.md): quit lifecycle, second **`/piui`**, browser opener (**`xdg-open`** on Linux).

## [0.1.3] - 2026-05-12

### Changed

- Package-local Python environment directory is **`venv/`** (not **`.venv/`**): [`extensions/piui.ts`](extensions/piui.ts), [`scripts/postinstall-venv.sh`](scripts/postinstall-venv.sh), and [`README.md`](README.md). **`.venv/`** remains in [`.gitignore`](.gitignore) for older checkouts.

## [0.1.2] - 2026-05-12

### Added

- **`npm` `postinstall`**: [`scripts/postinstall-venv.sh`](scripts/postinstall-venv.sh) creates **`.venv`** in the package root (when missing) and runs **`pip install -r requirements.txt`**, so Pi’s post-clone **`npm install`** sets up Python for **`/piui`**.

### Removed

- **`PIUI_PYTHON`** override; interpreter is **`<package>/.venv/bin/python`** when present, else **`python3`**.

### Changed

- [`extensions/piui.ts`](extensions/piui.ts): simplified **`resolvePython`**; **warning** toast when **`.venv`** is missing (hint to **`npm install`** / **`pi update`**).

### Documentation

- [`README.md`](README.md): Pi-managed clone vs dev checkout, **`postinstall`** behavior, **`python3`** + network requirements, troubleshooting without **`PIUI_PYTHON`**.

## [0.1.1] - 2026-05-12

### Fixed

- **`/piui`**: bind Streamlit with **`--server.address 127.0.0.1`** so the URL matches the listener; capture **stderr** and show an **error** toast if the process exits non-zero (e.g. missing `streamlit` module instead of a silent failure with `ERR_CONNECTION_REFUSED` in the browser).

### Documentation

- [`README.md`](README.md): troubleshooting row for **`ERR_CONNECTION_REFUSED`**.

## [0.1.0] - 2026-05-12

### Added

- Pi package manifest (`package.json` with `pi.extensions`) loading [`extensions/piui.ts`](extensions/piui.ts).
- Slash command **`/piui`** that starts Streamlit in the background (detached process) to browse Pi sessions under `~/.pi/agent/sessions/**/*.jsonl`.
- [`streamlit_app/app.py`](streamlit_app/app.py): session discovery, sidebar file picker, metadata table, entry-type / role counts, line preview.
- [`requirements.txt`](requirements.txt) for Python dependencies (Streamlit).

### Changed

- Launcher uses **`python -m streamlit run …`** instead of the `streamlit` CLI on `PATH`, so installs inside a venv work when Pi’s environment does not expose `streamlit`.
- Interpreter resolution: optional env override for Python (removed in v0.1.2), else **`<package>/.venv/bin/python`** if present, else **`python3`**.

### Documentation

- [`README.md`](README.md): install flow for Pi, recommended `.venv` setup, `PIUI_PORT`, troubleshooting for interpreter and missing `streamlit` module.
