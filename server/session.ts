import fs from "node:fs";
import path from "node:path";

import { ROOT_DIR_LABEL, sessionsRoot } from "./paths.ts";

export type JsonObject = Record<string, unknown>;

export function relUnderSessions(absPath: string): string {
	const root = path.resolve(sessionsRoot());
	const rel = path.relative(root, absPath);
	if (rel.startsWith("..") || path.isAbsolute(rel)) {
		return absPath;
	}
	return rel;
}

export function discoverJsonlByDirectory(): Map<string, string[]> {
	const root = path.resolve(sessionsRoot());
	const buckets = new Map<string, string[]>();
	if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
		return buckets;
	}

	function walk(dir: string): void {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const ent of entries) {
			const full = path.join(dir, ent.name);
			if (ent.isDirectory()) {
				walk(full);
			} else if (ent.isFile() && ent.name.endsWith(".jsonl")) {
				const rel = relUnderSessions(full);
				const parts = rel.split(path.sep).filter(Boolean);
				if (parts.length === 0) continue;
				const key = parts.length === 1 ? ROOT_DIR_LABEL : parts[0]!;
				const list = buckets.get(key) ?? [];
				list.push(full);
				buckets.set(key, list);
			}
		}
	}
	walk(root);

	for (const list of buckets.values()) {
		list.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
	}
	return buckets;
}

export function formatSessionFileLabel(absPath: string): string {
	const st = fs.statSync(absPath);
	const mtime = new Date(st.mtimeMs);
	const pad = (n: number) => String(n).padStart(2, "0");
	const stamp = `${mtime.getFullYear()}-${pad(mtime.getMonth() + 1)}-${pad(mtime.getDate())} ${pad(mtime.getHours())}:${pad(mtime.getMinutes())}`;
	const kb = Math.round((st.size / 1024) * 10) / 10;
	return `${path.basename(absPath)} · ${stamp} · ${kb} KiB`;
}

export function loadJsonlObjects(
	filePath: string,
): { rows: Array<{ lineNo: number; obj: JsonObject | null }>; parseErrors: number } {
	const text = fs.readFileSync(filePath, { encoding: "utf8" });
	const rows: Array<{ lineNo: number; obj: JsonObject | null }> = [];
	let parseErrors = 0;
	let lineNo = 0;
	for (const rawLine of text.split(/\r?\n/)) {
		lineNo += 1;
		const line = rawLine.trim();
		if (!line) continue;
		try {
			const obj: unknown = JSON.parse(line);
			if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
				rows.push({ lineNo, obj: obj as JsonObject });
			} else {
				parseErrors += 1;
				rows.push({ lineNo, obj: null });
			}
		} catch {
			parseErrors += 1;
			rows.push({ lineNo, obj: null });
		}
	}
	return { rows, parseErrors };
}

export function entrySortKey(obj: JsonObject): number {
	const ts = obj.timestamp;
	if (typeof ts === "string") {
		const t = Date.parse(ts.replace(/Z$/, "+00:00"));
		if (!Number.isNaN(t)) return t / 1000;
	}
	const msg = obj.message;
	if (msg !== null && typeof msg === "object" && !Array.isArray(msg)) {
		const m = msg as JsonObject;
		const mt = m.timestamp;
		if (typeof mt === "number" && Number.isFinite(mt)) return mt / 1000;
	}
	return 0;
}

export function orderedEntriesForDisplay(
	parsed: Array<{ lineNo: number; obj: JsonObject | null }>,
): { spine: JsonObject[]; note: string | null } {
	const objects = parsed.map((r) => r.obj).filter((o): o is JsonObject => o !== null);

	const byId = new Map<string, JsonObject>();
	for (const obj of objects) {
		if (obj.type === "session") continue;
		const oid = obj.id;
		if (typeof oid === "string" && oid) {
			byId.set(oid, obj);
		}
	}

	const children = new Map<string, string[]>();
	for (const obj of byId.values()) {
		const pid = obj.parentId;
		const id = obj.id;
		if (typeof pid === "string" && byId.has(pid) && typeof id === "string") {
			const arr = children.get(pid) ?? [];
			arr.push(id);
			children.set(pid, arr);
		}
	}

	const leaves = [...byId.keys()].filter((id) => !children.has(id));
	if (leaves.length === 0) {
		return {
			spine: objects.filter((o) => o.type !== "session"),
			note: "No tree ids found; showing entries in file order.",
		};
	}

	const leafId = leaves.reduce((a, b) => (entrySortKey(byId.get(a)!) >= entrySortKey(byId.get(b)!) ? a : b));
	const chain: JsonObject[] = [];
	let cur: JsonObject | undefined = byId.get(leafId);
	const seen = new Set<string>();
	while (cur) {
		const cid = cur.id;
		if (typeof cid === "string") {
			if (seen.has(cid)) break;
			seen.add(cid);
		}
		chain.push(cur);
		const pid = cur.parentId;
		if (typeof pid !== "string" || !byId.has(pid)) break;
		cur = byId.get(pid);
	}
	chain.reverse();
	return {
		spine: chain.filter((e) => e.type !== "session"),
		note: null,
	};
}

export function fallbackEntryOrder(objects: JsonObject[]): JsonObject[] {
	return objects.filter((o) => o.type !== "session");
}

export function extractToolCallIdsFromAssistantMessage(msg: JsonObject): Set<string> {
	const out = new Set<string>();
	const blocks = msg.content;
	if (!Array.isArray(blocks)) return out;
	for (const b of blocks) {
		if (b !== null && typeof b === "object" && !Array.isArray(b)) {
			const block = b as JsonObject;
			if (block.type === "toolCall") {
				const tid = block.id;
				if (typeof tid === "string" && tid) out.add(tid);
			}
		}
	}
	return out;
}

export function collectConsecutiveToolResults(
	spine: JsonObject[],
	assistantIdx: number,
	allowedIds: Set<string>,
): { found: Map<string, JsonObject>; nextIdx: number } {
	const found = new Map<string, JsonObject>();
	let j = assistantIdx + 1;
	const n = spine.length;
	while (j < n) {
		const e = spine[j]!;
		if (e.type !== "message") break;
		const inner = e.message;
		if (inner === null || typeof inner !== "object" || Array.isArray(inner)) break;
		const msg = inner as JsonObject;
		if (msg.role !== "toolResult") break;
		const tcid = msg.toolCallId;
		if (typeof tcid !== "string" || !allowedIds.has(tcid)) break;
		if (found.has(tcid)) break;
		found.set(tcid, e);
		j += 1;
	}
	return { found, nextIdx: j };
}

export function buildSpineForFile(absPath: string): {
	spine: JsonObject[];
	header: JsonObject | null;
	parseErrors: number;
	orderingNote: string | null;
} {
	const { rows, parseErrors } = loadJsonlObjects(absPath);
	const objects = rows.map((r) => r.obj).filter((o): o is JsonObject => o !== null);
	const header =
		objects.length > 0 && objects[0]!.type === "session" ? (objects[0] as JsonObject) : null;

	let { spine, note } = orderedEntriesForDisplay(rows);
	if (spine.length === 0) {
		spine = fallbackEntryOrder(objects.slice(header ? 1 : 0));
	}
	return { spine, header, parseErrors, orderingNote: note };
}
