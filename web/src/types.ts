export type JsonObject = Record<string, unknown>;

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

export type DiscoveryResponse = {
	sessionsRoot: string;
	rootExists: boolean;
	empty: boolean;
	buckets: Array<{ name: string; files: Array<{ relPath: string; label: string }> }>;
};

export type TranscriptResponse = {
	relPath: string;
	parseErrors: number;
	orderingNote: string | null;
	header: JsonObject | null;
	rows: ViewRow[];
	error?: string;
};
