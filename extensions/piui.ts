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

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
 * Poll /api/health until it succeeds, the child exits non-zero, or timeout.
 * If the child crashed but something else is already listening, still returns true when probe succeeds.
 */
async function waitForServerListening(
	url: string,
	child: ReturnType<typeof spawn>,
	timeoutMs: number,
	intervalMs: number,
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const code = child.exitCode;
		if (code !== null && code !== 0) {
			return await probeServer(url);
		}
		if (await probeServer(url)) {
			return true;
		}
		await delay(intervalMs);
	}
	return await probeServer(url);
}

async function openUrlInBrowser(pi: ExtensionAPI, url: string): Promise<void> {
	if (process.platform === "win32") {
		return;
	}
	const cmd = process.platform === "darwin" ? "open" : "xdg-open";
	await pi.exec(cmd, [url], { cwd: packageRoot, timeout: 15_000 });
}

/** Always try to open a browser tab; toast on success or browser-launch failure. */
async function openPiUiTab(
	pi: ExtensionAPI,
	ctx: {
		ui: { notify: (message: string, type?: "error" | "info" | "warning") => void };
	},
	url: string,
): Promise<void> {
	try {
		await openUrlInBrowser(pi, url);
		ctx.ui.notify(`PiUi: opened ${url}`, "info");
	} catch (err) {
		ctx.ui.notify(`PiUi: could not open browser for ${url}: ${String(err)}`, "warning");
	}
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
				await openPiUiTab(pi, ctx, url);
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
					// Main handler polls /api/health and opens the tab (existing server or retry).
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

			ctx.ui.notify(`PiUi: starting web UI on ${url}…`, "info");

			await waitForServerListening(url, child, 25_000, 200);
			await openPiUiTab(pi, ctx, url);
		},
	});
}
