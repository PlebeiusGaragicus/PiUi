# Changelog

All notable changes to this project are documented in this file.

## [0.1.0] - 2026-05-12

### Added

- Pi package manifest (`package.json` with `pi.extensions`) loading [`extensions/piui.ts`](extensions/piui.ts).
- Slash command **`/piui`** that starts Streamlit in the background (detached process) to browse Pi sessions under `~/.pi/agent/sessions/**/*.jsonl`.
- [`streamlit_app/app.py`](streamlit_app/app.py): session discovery, sidebar file picker, metadata table, entry-type / role counts, line preview.
- [`requirements.txt`](requirements.txt) for Python dependencies (Streamlit).

### Changed

- Launcher uses **`python -m streamlit run …`** instead of the `streamlit` CLI on `PATH`, so installs inside a venv work when Pi’s environment does not expose `streamlit`.
- Interpreter resolution (first match wins): **`PIUI_PYTHON`**, else **`<package>/.venv/bin/python`** if present, else **`python3`**.

### Documentation

- [`README.md`](README.md): install flow for Pi, recommended `.venv` setup, `PIUI_PYTHON` and `PIUI_PORT`, troubleshooting for interpreter and missing `streamlit` module.
