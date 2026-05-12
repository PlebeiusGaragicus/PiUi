import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import {
	assertPathInsideSessions,
	requireJsonlRel,
	ROOT_DIR_LABEL,
	safeJoinUnderRoot,
	sessionsRoot,
} from "./paths.ts";
import { buildSpineForFile, discoverJsonlByDirectory, formatSessionFileLabel } from "./session.ts";
import { buildTranscriptPayload } from "./viewModel.ts";

function packageRootFromEntry(): string {
	const here = path.dirname(fileURLToPath(import.meta.url));
	if (here.endsWith(`${path.sep}server`)) {
		return path.dirname(here);
	}
	if (here.endsWith(`${path.sep}dist`)) {
		return path.dirname(here);
	}
	return here;
}

const packageRoot = packageRootFromEntry();
const staticRoot = path.join(packageRoot, "dist", "web");

function defaultPort(): number {
	const n = Number.parseInt(process.env.PIUI_PORT ?? "8502", 10);
	return Number.isFinite(n) && n > 0 && n < 65536 ? n : 8502;
}

function toPosixRel(absFile: string): string {
	const root = path.resolve(sessionsRoot());
	return path.relative(root, absFile).split(path.sep).join("/");
}

const app = new Hono();

app.get("/api/health", (c) =>
	c.json({
		ok: true,
		sessionsRoot: sessionsRoot(),
	}),
);

app.get("/api/discovery", (c) => {
	const root = path.resolve(sessionsRoot());
	const rootExists = fs.existsSync(root) && fs.statSync(root).isDirectory();
	const raw = discoverJsonlByDirectory();
	const dirNames = [...raw.keys()].sort((a, b) => {
		const aRoot = a === ROOT_DIR_LABEL ? 0 : 1;
		const bRoot = b === ROOT_DIR_LABEL ? 0 : 1;
		if (aRoot !== bRoot) return aRoot - bRoot;
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});
	const buckets = dirNames.map((name) => {
		const files = (raw.get(name) ?? []).map((abs) => ({
			relPath: toPosixRel(abs),
			label: formatSessionFileLabel(abs),
		}));
		return { name, files };
	});
	return c.json({
		sessionsRoot: root,
		rootExists,
		empty: buckets.length === 0 || buckets.every((b) => b.files.length === 0),
		buckets,
	});
});

app.get("/api/transcript", (c) => {
	const rel = c.req.query("relPath") ?? "";
	try {
		requireJsonlRel(rel);
		const abs = safeJoinUnderRoot(sessionsRoot(), rel);
		const real = assertPathInsideSessions(abs);
		const spineData = buildSpineForFile(real);
		const payload = buildTranscriptPayload(spineData);
		return c.json({
			relPath: rel,
			...payload,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return c.json({ error: msg }, 400);
	}
});

app.delete("/api/session", async (c) => {
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid JSON body" }, 400);
	}
	if (body === null || typeof body !== "object" || Array.isArray(body)) {
		return c.json({ error: "expected object body" }, 400);
	}
	const relPath = (body as { relPath?: unknown }).relPath;
	if (typeof relPath !== "string") {
		return c.json({ error: "relPath string required" }, 400);
	}
	try {
		requireJsonlRel(relPath);
		const abs = safeJoinUnderRoot(sessionsRoot(), relPath);
		const real = assertPathInsideSessions(abs);
		fs.unlinkSync(real);
		return c.json({ ok: true, deleted: toPosixRel(real) });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return c.json({ error: msg }, 400);
	}
});

const devApiOnly = process.env.PIUI_DEV === "1";

if (!devApiOnly) {
	app.use(
		"/*",
		serveStatic({
			root: staticRoot,
		}),
	);
}

app.notFound((c) => {
	if (c.req.path.startsWith("/api")) {
		return c.json({ error: "not_found" }, 404);
	}
	if (devApiOnly) {
		return c.body("PiUi API (dev). Use Vite dev server for UI.", 404);
	}
	try {
		const html = fs.readFileSync(path.join(staticRoot, "index.html"), "utf8");
		return c.html(html);
	} catch {
		return c.text("PiUi: run npm run build in the package root (missing dist/web).", 503);
	}
});

const port = defaultPort();

serve({
	fetch: app.fetch,
	hostname: "127.0.0.1",
	port,
});

// eslint-disable-next-line no-console
console.error(`PiUi server listening on http://127.0.0.1:${port}`);
