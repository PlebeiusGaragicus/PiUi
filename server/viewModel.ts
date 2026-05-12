import type { JsonObject } from "./session.ts";
import {
	collectConsecutiveToolResults,
	extractToolCallIdsFromAssistantMessage,
} from "./session.ts";

export type ViewRow =
	| { kind: "user"; content: unknown }
	| {
			kind: "assistant";
			message: JsonObject;
			pairedToolResults: Record<string, JsonObject> | null;
	  }
	| { kind: "toolResult"; message: JsonObject }
	| { kind: "bash"; message: JsonObject }
	| { kind: "custom"; message: JsonObject }
	| { kind: "summary"; message: JsonObject; summaryRole: "branchSummary" | "compactionSummary" }
	| { kind: "unknown_role"; message: JsonObject; role: unknown }
	| { kind: "malformed_message"; entry: JsonObject }
	| { kind: "custom_message"; entry: JsonObject }
	| { kind: "raw_entry"; entry: JsonObject };

function isRecord(v: unknown): v is JsonObject {
	return v !== null && typeof v === "object" && !Array.isArray(v);
}

function messageEntryToViewRow(
	entry: JsonObject,
	pairedToolResults: Map<string, JsonObject> | null,
): ViewRow {
	const msg = entry.message;
	if (!isRecord(msg)) {
		return { kind: "malformed_message", entry };
	}
	const role = msg.role;
	if (role === "user") {
		return { kind: "user", content: msg.content };
	}
	if (role === "assistant") {
		const paired =
			pairedToolResults === null
				? null
				: Object.fromEntries(pairedToolResults);
		return { kind: "assistant", message: msg, pairedToolResults: paired };
	}
	if (role === "toolResult") {
		return { kind: "toolResult", message: msg };
	}
	if (role === "bashExecution") {
		return { kind: "bash", message: msg };
	}
	if (role === "custom") {
		return { kind: "custom", message: msg };
	}
	if (role === "branchSummary" || role === "compactionSummary") {
		return { kind: "summary", message: msg, summaryRole: role };
	}
	return { kind: "unknown_role", message: msg, role };
}

export function buildViewRows(spine: JsonObject[]): ViewRow[] {
	const rows: ViewRow[] = [];
	let idx = 0;
	while (idx < spine.length) {
		const entry = spine[idx]!;
		const et = entry.type;
		if (et === "message") {
			const inner = entry.message;
			if (isRecord(inner) && inner.role === "assistant") {
				const allowed = extractToolCallIdsFromAssistantMessage(inner);
				if (allowed.size > 0) {
					const { found, nextIdx } = collectConsecutiveToolResults(spine, idx, allowed);
					rows.push(
						messageEntryToViewRow(entry, found),
					);
					idx = nextIdx;
				} else {
					rows.push(messageEntryToViewRow(entry, null));
					idx += 1;
				}
			} else {
				rows.push(messageEntryToViewRow(entry, null));
				idx += 1;
			}
		} else if (et === "custom_message") {
			rows.push({ kind: "custom_message", entry });
			idx += 1;
		} else {
			rows.push({ kind: "raw_entry", entry });
			idx += 1;
		}
	}
	return rows;
}

export function buildTranscriptPayload(input: {
	spine: JsonObject[];
	header: JsonObject | null;
	parseErrors: number;
	orderingNote: string | null;
}): {
	parseErrors: number;
	orderingNote: string | null;
	header: JsonObject | null;
	rows: ViewRow[];
} {
	return {
		parseErrors: input.parseErrors,
		orderingNote: input.orderingNote,
		header: input.header,
		rows: buildViewRows(input.spine),
	};
}
