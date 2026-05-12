# PiUi

Pi package that registers **`/piui`** in [Pi](https://github.com/earendil-works/pi-mono): it starts a **Streamlit** app in the background so you can browse Pi session files under `~/.pi/agent/sessions/` (recursive `**/*.jsonl`, as described in Pi’s session layout).

## Requirements

- **Pi** with extension/package support (see Pi docs for your version).
- **Python 3.10+** with **Streamlit** installed in the environment that provides the `streamlit` CLI (the same one Pi will find on `PATH` when you run `/piui`).

## Install (Pi)

From a clone of this repo:

```bash
pi install /absolute/path/to/PiUi
```

Or from git (example):

```bash
pi install git:github.com/your-org/piui
```

Use `pi install … -l` for a **project-local** install (writes `.pi/settings.json`).

`pi install` runs **`npm install`** in the cloned package. This repo keeps npm `dependencies` empty; Pi supplies `@earendil-works/pi-coding-agent` at runtime for the extension.

To try without persisting:

```bash
pi -e /absolute/path/to/PiUi
```

## Install (Python)

In any environment where you want the `streamlit` command available to Pi:

```bash
cd /path/to/PiUi
pip install -r requirements.txt
```

Or with uv:

```bash
uv pip install -r requirements.txt
```

## Use

1. Reload Pi resources if needed: **`/reload`** (or restart Pi).
2. Run **`/piui`** in the Pi TUI.
3. Open the URL from the notification (default **`http://127.0.0.1:8502`**).

### Port

Set **`PIUI_PORT`** before starting Pi (or in your shell profile) to change the port, for example `8503`. The extension passes it to Streamlit as `--server.port`.

## Troubleshooting

| Issue | What to do |
|--------|------------|
| Notification says Streamlit could not start / `ENOENT` | Install Python deps so `streamlit` is on `PATH` in the same environment you use to launch Pi. |
| Port already in use | Set `PIUI_PORT` to a free port and run `/piui` again. |
| Empty session list | Confirm Pi has created sessions under `~/.pi/agent/sessions/` (nested `*.jsonl` files). |
| Extension not listed | Confirm `pi install` succeeded, run `/reload`, and check `pi list` / settings `packages` include this package. |

## Layout

- `extensions/piui.ts` — registers `/piui`, spawns detached `streamlit run …`.
- `streamlit_app/app.py` — lists and previews session JSONL files.

## License

MIT
