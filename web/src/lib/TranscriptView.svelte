<script lang="ts">
	import MessageRenderer from "./MessageRenderer.svelte";
	import type { TranscriptResponse } from "../types.ts";

	type Props = {
		data: TranscriptResponse | null;
		loading: boolean;
		error: string | null;
	};
	let { data, loading, error }: Props = $props();
</script>

{#if loading}
	<div class="hint">Loading transcript…</div>
{:else if error}
	<div class="err">{error}</div>
{:else if data?.error}
	<div class="err">{data.error}</div>
{:else if data}
	{#if data.parseErrors > 0}
		<div class="warn">{data.parseErrors} line(s) could not be parsed as JSON.</div>
	{/if}
	{#if data.orderingNote}
		<div class="hint">{data.orderingNote}</div>
	{/if}
	{#if data.header}
		<details class="hdr">
			<summary>Session metadata</summary>
			<pre class="code">{JSON.stringify(data.header, null, 2)}</pre>
		</details>
	{/if}
	<div class="feed">
		{#each data.rows as row, i (`${data.relPath}:${i}`)}
			<MessageRenderer {row} />
		{/each}
	</div>
{/if}

<style>
	.hint {
		color: var(--muted);
	}
	.err {
		color: var(--danger);
		white-space: pre-wrap;
	}
	.warn {
		color: #ffb020;
		margin: 0.35rem 0;
	}
	.hdr {
		margin: 0.5rem 0 1rem;
	}
	.code {
		overflow: auto;
		padding: 0.75rem;
		background: #0b0f14;
		border: 1px solid var(--border);
		border-radius: 8px;
	}
	.feed {
		margin-top: 0.75rem;
	}
</style>
