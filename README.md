# PiUi

Pi package that registers **`/piui`** in [Pi](https://github.com/earendil-works/pi-mono): it starts a **Streamlit** app in the background so you can browse Pi session files under `~/.pi/agent/sessions/` (recursive `**/*.jsonl`, as described in Pi’s session layout).

## Requirements

- **Pi** with extension/package support (see Pi docs for your version).
- **Mac or Linux**, **`python3`** on the `PATH` used when Pi runs **`npm install`** on this package (see Pi’s package docs).
- **Network access** during **`npm install` / `pi update`** so **`pip install -r requirements.txt`** can run inside the package **`postinstall`** hook.

PiUi runs **`python -m streamlit`**, not the `streamlit` executable on Pi’s `PATH`.

## Install (Pi)

**Recommended:** install from git so Pi owns a managed clone and runs **`npm install`** there:

```bash
pi install git:github.com/PlebeiusGaragicus/piui
```

Use **`pi install … -l`** for a **project-local** install (writes **`.pi/settings.json`**).

For **`pi install git:…`**, Pi typically places the package under something like **`~/.pi/agent/git/<host>/<path-to-repo>/`** (exact path depends on the URL). Pi runs **`npm install`** in that directory. **`npm install`** triggers **`postinstall`**, which creates **`venv/`** next to **`package.json`** and installs **`requirements.txt`**. Pi supplies **`@earendil-works/pi-coding-agent`** at runtime for the extension. That managed clone—not a separate checkout you only edit by hand—is where **`venv/`** must exist unless you use a path install (see below).

**Filesystem path installs** (**`pi install /absolute/path/to/PiUi`**, **`pi install .`**, etc.) are for **local development** only. Pi registers the package but **does not run `npm install`** for you; you must run it once in the package root so **`postinstall`** creates **`venv/`** — see [Local development](#local-development).

Use **`pi list`** (and Pi docs) to see configured packages and resolve the install path if unsure.

## Local development

Use a **path** install when you are editing PiUi in your own git clone and want Pi to load **`/piui`** from that directory.

1. **Register the package with Pi** (example):

   ```bash
   pi install /absolute/path/to/PiUi
   ```

   Or from inside the repo: **`pi install .`**

2. **Run `npm install` in that same directory** (the package root, next to **`package.json`**). Path installs do **not** run this automatically; without it there is no **`venv/`**, no Streamlit in the expected place, and **`/piui`** will warn or fail.

3. **`npm install`** runs **`postinstall`** → **`scripts/postinstall-venv.sh`**, which creates **`venv/`** and uses **`pip`** to install **`requirements.txt`**.

4. In Pi, run **`/reload`** (or restart Pi) so the extension is picked up.

**Optional — Streamlit only (no Pi):** after **`venv/`** exists, you can iterate on the Python UI without **`/piui`**:

```bash
cd /absolute/path/to/PiUi
./venv/bin/python -m streamlit run streamlit_app/app.py \
  --server.headless false --server.address 127.0.0.1 --server.port 8502 \
  --browser.gatherUsageStats false
```

**Try without persisting** a path (Pi still needs to load the extension; **`npm install`** in that tree applies as above):

```bash
pi -e /absolute/path/to/PiUi
```

## Python / venv (automatic)

You do **not** need to create **`venv/`** by hand once **`npm install`** has run successfully: **`postinstall`** creates it and installs Python deps.

If you use **`npm install --ignore-scripts`** or **`postinstall`** failed, run **`npm install`** again in the **package root** (or **`pi update`** for a **git**-installed package) so **`postinstall`** can finish. After a **path** install, running **`npm install`** manually is **required** the first time — see [Local development](#local-development).

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
| Warning: no venv at … | **`npm install`** did not run or **`postinstall`** failed. For a **path** install, run **`npm install`** once in the package root (Pi does not run it for you). For a **git** install, run **`npm install`** there or **`pi update`**; ensure **`python3`** is on PATH and the machine has network for **pip**. |
| Browser **`ERR_CONNECTION_REFUSED`** | Streamlit never bound (often exited on startup). Pi should show a follow-up **error** with exit code and **stderr**. Wait a few seconds after `/piui` before opening the link. |
| Could not run Python interpreter / `ENOENT` | Install **`python3`** where Pi/npm can see it, or fix **`venv`** with **`npm install`** in the package root. |
| **`npm install` / postinstall errors** | Read the log: missing **`python3`**, pip/network blocked, or **`requirements.txt`** issue. Fix and re-run **`npm install`** in the Pi-managed clone. |
| Nothing opens / no stderr toast | Run **`<package>/venv/bin/python -m pip show streamlit`** from a terminal using the same paths. |
| Port already in use | Often a leftover Streamlit before this change; quit Pi (PiUi now stops Streamlit on quit) or set **`PIUI_PORT`**. If something else is already serving PiUi’s URL, **`/piui`** may open that tab instead of starting a new server. |
| Empty session list | Confirm Pi has created sessions under **`~/.pi/agent/sessions/`** (nested **`*.jsonl`** files). |
| Extension not listed | Confirm **`pi install`** succeeded, run **`/reload`**, and check **`pi list`** / settings **`packages`**. |
