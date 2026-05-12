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

/** Mac/Linux: package .venv/bin/python if present, else python3 on PATH. */
function resolvePython(root: string): string {
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

			const venvPython = join(packageRoot, ".venv", "bin", "python");
			if (!existsSync(venvPython)) {
				ctx.ui.notify(
					`PiUi: no .venv at ${packageRoot}. Run npm install there (or pi update for this package) so postinstall creates .venv.`,
					"warning",
				);
			}

			const python = resolvePython(packageRoot);
			const appPath = join(packageRoot, "streamlit_app", "app.py");
			const port = defaultPort();
			const url = `http://127.0.0.1:${port}`;

			let stderrTail = "";
			const appendStderr = (chunk: string) => {
				stderrTail += chunk;
				if (stderrTail.length > 12_000) {
					stderrTail = stderrTail.slice(-8000);
				}
			};

			const child = spawn(
				python,
				[
					"-m",
					"streamlit",
					"run",
					appPath,
					"--server.headless",
					"true",
					"--server.address",
					"127.0.0.1",
					"--server.port",
					port,
					"--browser.gatherUsageStats",
					"false",
				],
				{
					cwd: packageRoot,
					detached: true,
					stdio: ["ignore", "ignore", "pipe"],
					env: {
						...process.env,
						PIUI_PORT: port,
					},
				},
			);

			child.stderr?.setEncoding("utf8");
			child.stderr?.on("data", appendStderr);

			child.on("exit", (code, _signal) => {
				if (code === 0 || code === null) {
					return;
				}
				const hint = stderrTail.trim().slice(-600) || "(no stderr captured)";
				ctx.ui.notify(
					`PiUi: Streamlit exited with code ${code}. Interpreter: ${python}. Last stderr: ${hint}`,
					"error",
				);
			});

			child.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "ENOENT") {
					ctx.ui.notify(
						`PiUi: could not run Python interpreter "${python}". Install python3 on PATH, or ensure .venv exists (npm install in the PiUi package runs postinstall).`,
						"error",
					);
					return;
				}
				ctx.ui.notify(`Failed to start Streamlit: ${err.message}`, "error");
			});

			child.unref();

			ctx.ui.notify(
				`PiUi: starting Streamlit on ${url} (python: ${python}). Wait a few seconds if the browser shows connection refused.`,
				"info",
			);
		},
	});
}
