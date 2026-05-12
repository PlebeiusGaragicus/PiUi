# PiUi

Pi package that registers **`/piui`** in [Pi](https://github.com/earendil-works/pi-mono): it starts a **local Node server** in the background so you can browse Pi session files under `~/.pi/agent/sessions/` (recursive `**/*.jsonl`, as described in Pi’s session layout). The UI is a **Svelte 5** app; the server exposes **`/api/*`** for directory listing, transcript shaping, and deletes.

## Requirements

- **Pi** with extension/package support (see Pi docs for your version).
- **Mac or Linux** (Windows is not supported for `/piui` browser integration).
- **Node.js + npm** on the `PATH` used when Pi runs **`npm install`** on this package (see Pi’s package docs).
- **Network access** during **`npm install` / `pi update`** so npm can download dev/build dependencies used by **`postinstall`**.

## Install (Pi)

**Recommended:** install from git so Pi owns a managed clone and runs **`npm install`** there:

```bash
pi install git:github.com/PlebeiusGaragicus/piui
```

Use **`pi install … -l`** for a **project-local** install (writes **`.pi/settings.json`**).

For **`pi install git:…`**, Pi typically places the package under something like **`~/.pi/agent/git/<host>/<path-to-repo>/`** (exact path depends on the URL). Pi runs **`npm install`** in that directory. **`npm install`** triggers **`postinstall`**, which runs **`npm run build`** to create **`dist/piui-server.mjs`** and **`dist/web/`**. Pi supplies **`@earendil-works/pi-coding-agent`** at runtime for the extension. That managed clone—not a separate checkout you only edit by hand—is where **`dist/`** must exist unless you use a path install (see below).

**Filesystem path installs** (**`pi install /absolute/path/to/PiUi`**, **`pi install .`**, etc.) are for **local development** only. Pi registers the package but **does not run `npm install`** for you; you must run **`npm install`** once in the package root so **`postinstall`** can build **`dist/`** — see [Local development](#local-development).

Use **`pi list`** (and Pi docs) to see configured packages and resolve the install path if unsure.

## Local development

Use a **path** install when you are editing PiUi in your own git clone and want Pi to load **`/piui`** from that directory.

1. **Register the package with Pi** (example):

   ```bash
   pi install /absolute/path/to/PiUi
   ```

   Or from inside the repo: **`pi install .`**

2. **Run `npm install` in that same directory** (the package root, next to **`package.json`**). Path installs do **not** run this automatically; without it there is no **`dist/`**, and **`/piui`** will warn or fail.

3. **`npm install`** runs **`postinstall`** → **`scripts/postinstall-build.sh`**, which runs **`npm run build`**.

4. In Pi, run **`/reload`** (or restart Pi) so the extension is picked up.

**Dev (UI + API split):** Vite proxies **`/api`** to the Node server on **`8502`**.

```bash
cd /absolute/path/to/PiUi
npm run dev
```

Then open the Vite URL (typically **`http://127.0.0.1:5173`**). The API process uses **`PIUI_DEV=1`** and listens on **`127.0.0.1:8502`** (see **`package.json`** scripts).

**Server only (after a build):**

```bash
cd /absolute/path/to/PiUi
PIUI_PORT=8502 node dist/piui-server.mjs
```

**Try without persisting** a path (Pi still needs to load the extension; **`npm install`** in that tree applies as above):

```bash
pi -e /absolute/path/to/PiUi
```

## Build (automatic)

You do **not** need to run **`npm run build`** by hand after **`npm install`** succeeds: **`postinstall`** runs it.

If **`npm install --ignore-scripts`** or **`postinstall`** failed, run **`npm install`** again in the **package root** (or **`pi update`** for a **git**-installed package) so **`postinstall`** can finish.

## Use

1. Reload Pi resources if needed: **`/reload`** (or restart Pi).
2. Run **`/piui`** in the Pi TUI.
3. Open the URL from the notification (default **`http://127.0.0.1:8502`**), or use **`/piui`** again to **`open`** / **`xdg-open`** that URL.

**Lifecycle:** When you **quit Pi**, PiUi sends **SIGTERM** to the server process it started so the port is freed. Running **`/piui`** again while the server is **still up** does not start a second server; PiUi **opens the same URL** in your default browser (typically a new tab). Linux needs **`xdg-open`** on `PATH` for that step.

### Port

Set **`PIUI_PORT`** before starting Pi (or in your shell profile) to change the port, for example `8503`. The extension passes it to the server as an environment variable.

## Troubleshooting

| Issue | What to do |
|--------|------------|
| Warning: missing server bundle at …/dist/piui-server.mjs | **`npm install`** did not run or **`postinstall`** failed. For a **path** install, run **`npm install`** once in the package root. For a **git** install, run **`npm install`** there or **`pi update`**. |
| Browser **`ERR_CONNECTION_REFUSED`** | Server never bound (often exited on startup). Pi should show a follow-up **error** with exit code and **stderr**. Wait a few seconds after `/piui` before opening the link. |
| Could not run Node / `ENOENT` | Ensure Pi can execute the same **Node** binary used for extensions (`process.execPath` in the extension). |
| **`npm install` / postinstall errors** | Read the log: missing toolchain, network blocked, etc. Fix and re-run **`npm install`**. |
| Port already in use | Quit Pi (PiUi stops the server on quit) or set **`PIUI_PORT`**. If something else already serves PiUi’s URL, **`/piui`** may open that tab instead of starting a new server. |
| Empty session list | Confirm Pi has created sessions under **`~/.pi/agent/sessions/`** (nested **`*.jsonl`** files). |
| Extension not listed | Confirm **`pi install`** succeeded, run **`/reload`**, and check **`pi list`** / settings **`packages`**. |
