<script lang="ts">
	import MarkdownText from "./MarkdownText.svelte";
	import type { JsonObject } from "../types.ts";

	type Props = { content: unknown };
	let { content }: Props = $props();

	function isRecord(v: unknown): v is JsonObject {
		return v !== null && typeof v === "object" && !Array.isArray(v);
	}
</script>

{#if typeof content === "string"}
	<MarkdownText text={content} />
{:else if !Array.isArray(content)}
	<pre class="json">{JSON.stringify(content, null, 2)}</pre>
{:else}
	{#each content as block}
		{#if !isRecord(block)}
			<pre class="text">{String(block)}</pre>
		{:else if block.type === "text" && typeof block.text === "string"}
			<MarkdownText text={block.text} />
		{:else if block.type === "image" && typeof block.data === "string"}
			{@const mime = typeof block.mimeType === "string" ? block.mimeType : "image/png"}
			<img alt="" src={"data:" + mime + ";base64," + block.data} class="img" />
			<div class="muted">{mime}</div>
		{:else}
			<details class="block">
				<summary>Content block</summary>
				<pre class="json">{JSON.stringify(block, null, 2)}</pre>
			</details>
		{/if}
	{/each}
{/if}

<style>
	.text {
		white-space: pre-wrap;
		margin: 0;
	}
	.json {
		overflow: auto;
		margin: 0;
	}
	.img {
		max-width: min(720px, 100%);
		border-radius: 6px;
		border: 1px solid var(--border);
	}
	.muted {
		color: var(--muted);
		font-size: 0.85rem;
		margin-top: 0.25rem;
	}
	.block {
		margin: 0.35rem 0;
	}
</style>
