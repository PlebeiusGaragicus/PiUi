/**
 * PiUi — register /piui to launch the Streamlit session browser in the background.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const extFile = fileURLToPath(import.meta.url);
const extensionsDir = dirname(extFile);
const packageRoot = dirname(extensionsDir);

function defaultPort(): string {
	const n = Number.parseInt(process.env.PIUI_PORT ?? "8502", 10);
	return Number.isFinite(n) && n > 0 && n < 65536 ? String(n) : "8502";
}

/** Mac/Linux: PIUI_PYTHON, else package .venv/bin/python if present, else python3 on PATH. */
function resolvePython(root: string): string {
	const fromEnv = process.env.PIUI_PYTHON?.trim();
	if (fromEnv) {
		return fromEnv;
	}
	const venvPython = join(root, ".venv", "bin", "python");
	if (existsSync(venvPython)) {
		return venvPython;
	}
	return "python3";
}

export default function piuiExtension(pi: ExtensionAPI) {
	pi.registerCommand("piui", {
		description: "Open Streamlit UI to browse Pi session files under ~/.pi/agent/sessions",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				return;
			}

			const python = resolvePython(packageRoot);
			const appPath = join(packageRoot, "streamlit_app", "app.py");
			const port = defaultPort();
			const url = `http://127.0.0.1:${port}`;

			const child = spawn(
				python,
				[
					"-m",
					"streamlit",
					"run",
					appPath,
					"--server.headless",
					"true",
					"--server.port",
					port,
					"--browser.gatherUsageStats",
					"false",
				],
				{
					cwd: packageRoot,
					detached: true,
					stdio: "ignore",
					env: {
						...process.env,
						PIUI_PORT: port,
					},
				},
			);

			child.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "ENOENT") {
					ctx.ui.notify(
						`PiUi: could not run Python interpreter "${python}". Install python3, set PIUI_PYTHON to your venv's python, or add .venv under the PiUi package.`,
						"error",
					);
					return;
				}
				ctx.ui.notify(`Failed to start Streamlit: ${err.message}`, "error");
			});

			child.unref();

			ctx.ui.notify(`PiUi: starting Streamlit on ${url} (port from PIUI_PORT, default 8502)`, "info");
		},
	});
}
