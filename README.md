# PiUi

Pi package that registers **`/piui`** in [Pi](https://github.com/earendil-works/pi-mono): it starts a **Streamlit** app in the background so you can browse Pi session files under `~/.pi/agent/sessions/` (recursive `**/*.jsonl`, as described in Pi’s session layout).

## Requirements

- **Pi** with extension/package support (see Pi docs for your version).
- **Python 3.10+** on Mac or Linux, with **Streamlit** installed **into the interpreter PiUi chooses** (see below). PiUi runs `python -m streamlit`, not the `streamlit` shell script on `PATH`.

## Install (Pi)

From a clone of this repo:

```bash
# git clone
cd PiUi
pi install .
```

Or from git (example):

```bash
pi install git:github.com/PlebeiusGaragicus/piui
```

Use `pi install … -l` for a **project-local** install (writes `.pi/settings.json`).

`pi install` runs **`npm install`** in the cloned package. This repo keeps npm `dependencies` empty; Pi supplies `@earendil-works/pi-coding-agent` at runtime for the extension.

To try without persisting:

```bash
pi -e /absolute/path/to/PiUi
```

## Install (Python)

**Recommended:** create a venv **inside the PiUi package** so `/piui` picks it automatically (no need for `streamlit` on Pi’s `PATH`):

```bash
cd /path/to/PiUi
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Or with uv:

```bash
cd /path/to/PiUi
uv venv .venv
uv pip install -r requirements.txt --python .venv/bin/python
```

If you skip `.venv`, PiUi falls back to **`python3`** on the process `PATH`; install Streamlit there, e.g. `python3 -m pip install -r requirements.txt`.

### Override interpreter

Set **`PIUI_PYTHON`** to an absolute path (e.g. `/path/to/venv/bin/python`) **before starting Pi**, when Streamlit is installed in another environment.

## Use

1. Reload Pi resources if needed: **`/reload`** (or restart Pi).
2. Run **`/piui`** in the Pi TUI.
3. Open the URL from the notification (default **`http://127.0.0.1:8502`**).

### Port

Set **`PIUI_PORT`** before starting Pi (or in your shell profile) to change the port, for example `8503`. The extension passes it to Streamlit as `--server.port`.

## Troubleshooting

| Issue | What to do |
|--------|------------|
| Could not run Python interpreter / `ENOENT` | Ensure `python3` exists for Pi’s process, or set **`PIUI_PYTHON`**, or add **`.venv/bin/python`** under the PiUi package. |
| Nothing opens / page fails (no Pi error) | Streamlit may have exited immediately (e.g. **`ModuleNotFoundError: streamlit`**). Install deps with **the same** interpreter: `"$PIUI_PYTHON" -m pip install -r requirements.txt` or `.venv/bin/python -m pip install -r requirements.txt` in the PiUi directory. |
| Port already in use | Set `PIUI_PORT` to a free port and run `/piui` again. |
| Empty session list | Confirm Pi has created sessions under `~/.pi/agent/sessions/` (nested `*.jsonl` files). |
| Extension not listed | Confirm `pi install` succeeded, run `/reload`, and check `pi list` / settings `packages` include this package. |

## Layout

- `extensions/piui.ts` — registers `/piui`, spawns detached `python -m streamlit run …`.
- `streamlit_app/app.py` — lists and previews session JSONL files.

## License

MIT
