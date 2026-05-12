<script lang="ts">
	import MarkdownText from "./MarkdownText.svelte";
	import ToolCallBlock from "./ToolCallBlock.svelte";
	import ToolResultBody from "./ToolResultBody.svelte";
	import type { JsonObject } from "../types.ts";

	type Props = {
		message: JsonObject;
		pairedToolResults: Record<string, JsonObject> | null;
	};
	let { message, pairedToolResults }: Props = $props();

	function isRecord(v: unknown): v is JsonObject {
		return v !== null && typeof v === "object" && !Array.isArray(v);
	}

	const metaLine = $derived.by(() => {
		const bits: string[] = [];
		if (typeof message.model === "string") bits.push(message.model);
		if (message.stopReason !== undefined && message.stopReason !== null) {
			bits.push(`stop: ${String(message.stopReason)}`);
		}
		return bits.length ? bits.join(" · ") : null;
	});

	type SegTool = { kind: "tool"; block: JsonObject };
	type SegAssistant = { kind: "assistant"; pieces: unknown[] };
	type Seg = SegTool | SegAssistant;

	const segments = $derived.by(() => {
		const out: Seg[] = [];
		const blocks = message.content;
		if (!Array.isArray(blocks)) return out;
		let i = 0;
		const n = blocks.length;
		while (i < n) {
			const b = blocks[i];
			if (isRecord(b) && b.type === "toolCall") {
				out.push({ kind: "tool", block: b });
				i += 1;
				continue;
			}
			const pieces: unknown[] = [];
			while (i < n) {
				const b2 = blocks[i];
				if (isRecord(b2) && b2.type === "toolCall") break;
				pieces.push(b2);
				i += 1;
			}
			if (pieces.length) out.push({ kind: "assistant", pieces });
		}
		return out;
	});
</script>

{#if !Array.isArray(message.content)}
	<div class="bubble assistant">
		{#if metaLine}<div class="meta">{metaLine}</div>{/if}
		<MarkdownText text={String(message.content)} />
	</div>
{:else}
	{#if metaLine}<div class="meta top">{metaLine}</div>{/if}
	{#each segments as seg, sidx (sidx)}
		{#if seg.kind === "tool"}
			<div class="bubble tool">
				<ToolCallBlock block={seg.block} />
				{#if typeof seg.block.id === "string" && seg.block.id && pairedToolResults}
					{#if pairedToolResults[seg.block.id]}
						{@const entry = pairedToolResults[seg.block.id]}
						{@const inner = entry.message}
						{#if isRecord(inner)}
							<ToolResultBody message={inner} />
						{/if}
					{:else}
						<div class="muted">No matching tool result in this spine segment</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="bubble assistant">
				{#each seg.pieces as piece, pidx (pidx)}
					{#if !isRecord(piece)}
						<pre class="plain">{String(piece)}</pre>
					{:else if piece.type === "text" && typeof piece.text === "string"}
						<MarkdownText text={piece.text} />
					{:else if piece.type === "thinking" && typeof piece.thinking === "string"}
						<details class="sub">
							<summary>Thinking</summary>
							<MarkdownText text={piece.thinking} />
						</details>
					{:else}
						<details class="sub">
							<summary>Block ({String(piece.type)})</summary>
							<pre class="plain">{JSON.stringify(piece, null, 2)}</pre>
						</details>
					{/if}
				{/each}
			</div>
		{/if}
	{/each}
{/if}

<style>
	.bubble {
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 10px;
		padding: 0.65rem 0.85rem;
		margin: 0.5rem 0;
		max-width: min(960px, 100%);
	}
	.bubble.tool {
		border-color: #3a4a66;
	}
	.meta {
		color: var(--muted);
		font-size: 0.85rem;
		margin-bottom: 0.35rem;
	}
	.meta.top {
		margin: 0 0 0.35rem;
	}
	.plain {
		margin: 0.35rem 0;
		white-space: pre-wrap;
	}
	.muted {
		color: var(--muted);
		font-size: 0.85rem;
		margin-top: 0.35rem;
	}
	.sub {
		margin: 0.35rem 0;
	}
</style>
