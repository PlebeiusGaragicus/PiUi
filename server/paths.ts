import { homedir } from "node:os";
import path from "node:path";
import { realpathSync } from "node:fs";

export const ROOT_DIR_LABEL = "(sessions root)";

export function sessionsRoot(): string {
	return path.join(homedir(), ".pi", "agent", "sessions");
}

/** Normalize rel path; reject escapes. Returns absolute path (not necessarily existing). */
export function safeJoinUnderRoot(root: string, rel: string): string {
	const trimmed = rel.trim();
	if (!trimmed) {
		throw new Error("empty path");
	}
	if (path.isAbsolute(trimmed)) {
		throw new Error("absolute path not allowed");
	}
	const normalized = path.normalize(trimmed);
	if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
		throw new Error("path escapes root");
	}
	const abs = path.resolve(root, normalized);
	const rootResolved = path.resolve(root);
	const prefix = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
	if (abs !== rootResolved && !abs.startsWith(prefix)) {
		throw new Error("path escapes root");
	}
	return abs;
}

/** Resolve real path and ensure it stays under sessions root. */
export function assertPathInsideSessions(absPath: string): string {
	const root = path.resolve(sessionsRoot());
	let realRoot: string;
	let realTarget: string;
	try {
		realRoot = realpathSync(root);
	} catch {
		throw new Error("sessions root does not exist");
	}
	try {
		realTarget = realpathSync(absPath);
	} catch {
		throw new Error("path not found");
	}
	const prefix = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;
	if (realTarget !== realRoot && !realTarget.startsWith(prefix)) {
		throw new Error("path escapes sessions directory");
	}
	return realTarget;
}

export function requireJsonlRel(rel: string): void {
	const base = path.basename(rel);
	if (!base.endsWith(".jsonl")) {
		throw new Error("only .jsonl session files are allowed");
	}
}
