# Changelog

All notable changes to this project are documented in this file.

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
