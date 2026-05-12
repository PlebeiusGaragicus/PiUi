/**
 * PiUi — register /piui to launch the local PiUi web server (Svelte UI + API) in the background.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const extFile = fileURLToPath(import.meta.url);
const extensionsDir = dirname(extFile);
const packageRoot = dirname(extensionsDir);

/** PID of the detached PiUi server we spawned (for SIGTERM on Pi quit). */
let serverPid: number | undefined;

function defaultPort(): string {
	const n = Number.parseInt(process.env.PIUI_PORT ?? "8502", 10);
	return Number.isFinite(n) && n > 0 && n < 65536 ? String(n) : "8502";
}

function serverEntry(root: string): string {
	return join(root, "dist", "piui-server.mjs");
}

function killTrackedServer(): void {
	if (serverPid === undefined) {
		return;
	}
	const pid = serverPid;
	serverPid = undefined;
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

async function probeServer(url: string): Promise<boolean> {
	try {
		const res = await fetch(new URL("/api/health", url).href, {
			method: "GET",
			redirect: "manual",
			signal: AbortSignal.timeout(2000),
		});
		return res.ok;
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
		killTrackedServer();
	});

	pi.registerCommand("piui", {
		description: "Open PiUi web UI to browse Pi session files under ~/.pi/agent/sessions",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				return;
			}

			const entry = serverEntry(packageRoot);
			if (!existsSync(entry)) {
				ctx.ui.notify(
					`PiUi: missing server bundle at ${entry}. Run npm install (or npm run build) in ${packageRoot} so postinstall can build dist/.`,
					"warning",
				);
			}

			const port = defaultPort();
			const url = `http://127.0.0.1:${port}`;

			if (await probeServer(url)) {
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
				process.execPath,
				[entry],
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
				serverPid = spawnedPid;
			}

			child.stderr?.setEncoding("utf8");
			child.stderr?.on("data", appendStderr);

			child.on("exit", (code, _signal) => {
				if (spawnedPid !== undefined && serverPid === spawnedPid) {
					serverPid = undefined;
				}
				if (code === 0 || code === null) {
					return;
				}
				const hint = stderrTail.trim().slice(-600) || "(no stderr captured)";
				const portBusy =
					/EADDRINUSE/i.test(stderrTail) ||
					/address already in use/i.test(stderrTail) ||
					/Port\s+\d+\s+is\s+not\s+available/i.test(stderrTail);

				if (portBusy) {
					void (async () => {
						if (await probeServer(url)) {
							try {
								await openUrlInBrowser(pi, url);
								ctx.ui.notify(`PiUi: port busy; opened existing server at ${url}.`, "info");
							} catch {
								ctx.ui.notify(
									`PiUi: server exited (${code}). Port in use — try ${url} in a browser or set PIUI_PORT. ${hint}`,
									"error",
								);
							}
							return;
						}
						ctx.ui.notify(
							`PiUi: server exited with code ${code}. Node: ${process.execPath}. Last stderr: ${hint}`,
							"error",
						);
					})();
					return;
				}

				ctx.ui.notify(`PiUi: server exited with code ${code}. Node: ${process.execPath}. Last stderr: ${hint}`, "error");
			});

			child.on("error", (err: NodeJS.ErrnoException) => {
				if (spawnedPid !== undefined && serverPid === spawnedPid) {
					serverPid = undefined;
				}
				if (err.code === "ENOENT") {
					ctx.ui.notify(
						`PiUi: could not run Node at "${process.execPath}". Ensure Node is available to Pi.`,
						"error",
					);
					return;
				}
				ctx.ui.notify(`Failed to start PiUi server: ${err.message}`, "error");
			});

			child.unref();

			ctx.ui.notify(
				`PiUi: starting web UI on ${url}. Wait a few seconds if the browser shows connection refused.`,
				"info",
			);
		},
	});
}
