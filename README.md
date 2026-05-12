# PiUi

Pi package that registers **`/piui`** in [Pi](https://github.com/earendil-works/pi-mono): it starts a **Streamlit** app in the background so you can browse Pi session files under `~/.pi/agent/sessions/` (recursive `**/*.jsonl`, as described in Pi’s session layout).

## Requirements

- **Pi** with extension/package support (see Pi docs for your version).
- **Mac or Linux**, **`python3`** on the `PATH` used when Pi runs **`npm install`** on this package (see Pi’s package docs).
- **Network access** during **`npm install` / `pi update`** so **`pip install -r requirements.txt`** can run inside the package **`postinstall`** hook.

PiUi runs **`python -m streamlit`**, not the `streamlit` executable on Pi’s `PATH`.

## Install (Pi)

From a clone of this repo:

```bash
cd PiUi
pi install .
```

Or from git (example):

```bash
pi install git:github.com/PlebeiusGaragicus/piui
```

Use `pi install … -l` for a **project-local** install (writes `.pi/settings.json`).

`pi install` runs **`npm install`** in the cloned package. **`npm install`** triggers **`postinstall`**, which creates **`venv/`** next to `package.json` in **that** directory and installs **`requirements.txt`** into it. Pi supplies `@earendil-works/pi-coding-agent` at runtime for the extension.

### Which directory is that?

- **`pi install git:…`**: Pi clones under something like **`~/.pi/agent/git/<host>/<path-to-repo>/`** (exact path depends on the URL). That clone—not necessarily your separate dev checkout—is where **`venv`** must exist.
- **`pi install /absolute/path/to/PiUi`**: that path **is** the package root; **`postinstall`** writes **`venv/`** there.

Use **`pi list`** (and Pi docs) to see configured packages and resolve the install path if unsure.

To try without persisting:

```bash
pi -e /absolute/path/to/PiUi
```

## Python / venv (automatic)

You do **not** need to create **`venv`** by hand for the Pi-managed install: **`postinstall`** does it when **`npm install`** runs.

If you use **`npm install --ignore-scripts`** or postinstall failed, run **`npm install`** again in the **package root** (or **`pi update`** for this package) so **`postinstall`** can finish.

## Use

1. Reload Pi resources if needed: **`/reload`** (or restart Pi).
2. Run **`/piui`** in the Pi TUI.
3. Open the URL from the notification (default **`http://127.0.0.1:8502`**), unless PiUi already opened your browser (see below).

**Streamlit UI:** PiUi starts Streamlit with **`--server.headless false`** on purpose so Streamlit can **open your default browser** when the server comes up (first **`/piui`** after a fresh start). Do not change that flag to **`true`** in the extension unless you redesign UX (e.g. always rely on **`open`** / **`xdg-open`** and document it).

**Lifecycle:** When you **quit Pi**, PiUi sends **SIGTERM** to the Streamlit process it started so the port is freed. Running **`/piui`** again while Streamlit is **still up** does not start a second server; PiUi **opens the same URL** in your default browser (typically a new tab). Linux needs **`xdg-open`** on `PATH` for that step.

### Port

Set **`PIUI_PORT`** before starting Pi (or in your shell profile) to change the port, for example `8503`. The extension passes it to Streamlit as `--server.port`.

## Troubleshooting

| Issue | What to do |
|--------|------------|
| Warning: no venv at … | **`npm install`** did not run or **`postinstall`** failed. In that package directory run **`npm install`**, or **`pi update`** for the package; ensure **`python3`** is on PATH for that process and the machine has network for **pip**. |
| Browser **`ERR_CONNECTION_REFUSED`** | Streamlit never bound (often exited on startup). Pi should show a follow-up **error** with exit code and **stderr**. Wait a few seconds after `/piui` before opening the link. |
| Could not run Python interpreter / `ENOENT` | Install **`python3`** where Pi/npm can see it, or fix **`venv`** with **`npm install`** in the package root. |
| **`npm install` / postinstall errors** | Read the log: missing **`python3`**, pip/network blocked, or **`requirements.txt`** issue. Fix and re-run **`npm install`** in the Pi-managed clone. |
| Nothing opens / no stderr toast | Run **`<package>/venv/bin/python -m pip show streamlit`** from a terminal using the same paths. |
| Port already in use | Often a leftover Streamlit before this change; quit Pi (PiUi now stops Streamlit on quit) or set **`PIUI_PORT`**. If something else is already serving PiUi’s URL, **`/piui`** may open that tab instead of starting a new server. |
| Empty session list | Confirm Pi has created sessions under **`~/.pi/agent/sessions/`** (nested **`*.jsonl`** files). |
| Extension not listed | Confirm **`pi install`** succeeded, run **`/reload`**, and check **`pi list`** / settings **`packages`**. |

## Layout

- [`AGENTS.md`](AGENTS.md) — conventions for contributors / agents (including Streamlit **headless** flag).
- [`package.json`](package.json) — **`scripts.postinstall`** → [`scripts/postinstall-venv.sh`](scripts/postinstall-venv.sh).
- [`extensions/piui.ts`](extensions/piui.ts) — registers **`/piui`**, spawn or reuse Streamlit, stop on Pi **quit**, open browser via **`open`** / **`xdg-open`** when the server is already listening.
- [`streamlit_app/app.py`](streamlit_app/app.py) — lists and previews session JSONL files.

## License

MIT
