import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
	collectConsecutiveToolResults,
	extractToolCallIdsFromAssistantMessage,
	loadJsonlObjects,
	orderedEntriesForDisplay,
} from "./session.ts";
import { buildViewRows } from "./viewModel.ts";

describe("session domain", () => {
	test("loadJsonlObjects parses lines and counts errors", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "piui-"));
		const f = path.join(dir, "t.jsonl");
		fs.writeFileSync(
			f,
			['{"type":"session","id":"s1"}', "not json", '{"type":"message","id":"m1"}', ""].join("\n"),
			"utf8",
		);
		const { rows, parseErrors } = loadJsonlObjects(f);
		assert.equal(parseErrors, 1);
		assert.equal(rows.filter((r) => r.obj !== null).length, 2);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	test("orderedEntriesForDisplay walks parent chain", () => {
		const parsed = [
			{ lineNo: 1, obj: { type: "session", id: "s" } as Record<string, unknown> },
			{ lineNo: 2, obj: { type: "message", id: "a", parentId: "root", timestamp: "2020-01-01T00:00:00Z" } },
			{ lineNo: 3, obj: { type: "message", id: "b", parentId: "a", timestamp: "2020-01-02T00:00:00Z" } },
		].map((r) => ({
			lineNo: r.lineNo,
			obj: r.obj as Record<string, unknown> | null,
		}));
		const { spine, note } = orderedEntriesForDisplay(parsed);
		assert.equal(note, null);
		assert.deepEqual(
			spine.map((e) => e.id),
			["a", "b"],
		);
	});

	test("collectConsecutiveToolResults pairs consecutive tool results", () => {
		const spine: Record<string, unknown>[] = [
			{
				type: "message",
				message: {
					role: "assistant",
					content: [{ type: "toolCall", id: "t1", name: "x", arguments: {} }],
				},
			},
			{
				type: "message",
				message: { role: "toolResult", toolCallId: "t1", toolName: "x", content: "ok" },
			},
			{ type: "message", message: { role: "user", content: "hi" } },
		];
		const allowed = extractToolCallIdsFromAssistantMessage(
			spine[0]!.message as Record<string, unknown>,
		);
		const { found, nextIdx } = collectConsecutiveToolResults(spine as never, 0, allowed);
		assert.equal(found.size, 1);
		assert(found.has("t1"));
		assert.equal(nextIdx, 2);
	});

	test("buildViewRows emits assistant row with paired tool results", () => {
		const spine: Record<string, unknown>[] = [
			{
				type: "message",
				message: {
					role: "assistant",
					content: [{ type: "toolCall", id: "t1", name: "x", arguments: {} }],
				},
			},
			{
				type: "message",
				message: { role: "toolResult", toolCallId: "t1", toolName: "x", content: "ok" },
			},
		];
		const rows = buildViewRows(spine as never);
		assert.equal(rows.length, 1);
		assert.equal(rows[0]!.kind, "assistant");
		if (rows[0]!.kind === "assistant") {
			assert(rows[0]!.pairedToolResults);
			assert.ok(rows[0]!.pairedToolResults!.t1);
		}
	});
});
