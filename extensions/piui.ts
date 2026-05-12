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

/** PID of the detached Streamlit we spawned (for SIGTERM on Pi quit). */
let streamlitPid: number | undefined;

function defaultPort(): string {
	const n = Number.parseInt(process.env.PIUI_PORT ?? "8502", 10);
	return Number.isFinite(n) && n > 0 && n < 65536 ? String(n) : "8502";
}

/** Mac/Linux: package venv/bin/python if present, else python3 on PATH. */
function resolvePython(root: string): string {
	const venvPython = join(root, "venv", "bin", "python");
	if (existsSync(venvPython)) {
		return venvPython;
	}
	return "python3";
}

function killTrackedStreamlit(): void {
	if (streamlitPid === undefined) {
		return;
	}
	const pid = streamlitPid;
	streamlitPid = undefined;
	if (process.platform === "win32") {
		return;
	}
	try {
		process.kill(-pid, "SIGTERM");
	} catch {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// ignore ESRCH / EPERM
		}
	}
}

async function probeStreamlit(url: string): Promise<boolean> {
	try {
		const res = await fetch(url, {
			method: "GET",
			redirect: "manual",
			signal: AbortSignal.timeout(2000),
		});
		return res.status >= 200 && res.status < 400;
	} catch {
		return false;
	}
}

async function openUrlInBrowser(pi: ExtensionAPI, url: string): Promise<void> {
	if (process.platform === "win32") {
		return;
	}
	const cmd = process.platform === "darwin" ? "open" : "xdg-open";
	await pi.exec(cmd, [url], { cwd: packageRoot, timeout: 15_000 });
}

export default function piuiExtension(pi: ExtensionAPI) {
	pi.on("session_shutdown", (event) => {
		if (event.reason !== "quit") {
			return;
		}
		killTrackedStreamlit();
	});

	pi.registerCommand("piui", {
		description: "Open Streamlit UI to browse Pi session files under ~/.pi/agent/sessions",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				return;
			}

			const venvPython = join(packageRoot, "venv", "bin", "python");
			if (!existsSync(venvPython)) {
				ctx.ui.notify(
					`PiUi: no venv at ${packageRoot}. Run npm install there (or pi update for this package) so postinstall creates the venv directory.`,
					"warning",
				);
			}

			const python = resolvePython(packageRoot);
			const appPath = join(packageRoot, "streamlit_app", "app.py");
			const port = defaultPort();
			const url = `http://127.0.0.1:${port}`;

			if (await probeStreamlit(url)) {
				try {
					await openUrlInBrowser(pi, url);
					ctx.ui.notify(`PiUi: server already running at ${url}; opened in browser.`, "info");
				} catch (err) {
					ctx.ui.notify(`PiUi: server is up at ${url} but could not open browser: ${String(err)}`, "warning");
				}
				return;
			}

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
					// Keep headless false: Streamlit opens the default browser when the server starts.
					// Do not switch to true here without updating README + AGENTS.md (repeat /piui uses open/xdg-open instead).
					"--server.headless",
					"false",
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

			const spawnedPid = child.pid;
			if (spawnedPid !== undefined) {
				streamlitPid = spawnedPid;
			}

			child.stderr?.setEncoding("utf8");
			child.stderr?.on("data", appendStderr);

			child.on("exit", (code, _signal) => {
				if (spawnedPid !== undefined && streamlitPid === spawnedPid) {
					streamlitPid = undefined;
				}
				if (code === 0 || code === null) {
					return;
				}
				const hint = stderrTail.trim().slice(-600) || "(no stderr captured)";
				const portBusy =
					/Port\s+\d+\s+is\s+not\s+available/i.test(stderrTail) || /Address already in use/i.test(stderrTail);

				if (portBusy) {
					void (async () => {
						if (await probeStreamlit(url)) {
							try {
								await openUrlInBrowser(pi, url);
								ctx.ui.notify(`PiUi: port busy; opened existing server at ${url}.`, "info");
							} catch {
								ctx.ui.notify(
									`PiUi: Streamlit exited (${code}). Port in use — try ${url} in a browser or set PIUI_PORT. ${hint}`,
									"error",
								);
							}
							return;
						}
						ctx.ui.notify(
							`PiUi: Streamlit exited with code ${code}. Interpreter: ${python}. Last stderr: ${hint}`,
							"error",
						);
					})();
					return;
				}

				ctx.ui.notify(
					`PiUi: Streamlit exited with code ${code}. Interpreter: ${python}. Last stderr: ${hint}`,
					"error",
				);
			});

			child.on("error", (err: NodeJS.ErrnoException) => {
				if (spawnedPid !== undefined && streamlitPid === spawnedPid) {
					streamlitPid = undefined;
				}
				if (err.code === "ENOENT") {
					ctx.ui.notify(
						`PiUi: could not run Python interpreter "${python}". Install python3 on PATH, or ensure venv/ exists (npm install in the PiUi package runs postinstall).`,
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
