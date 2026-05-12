<script lang="ts">
	import type { JsonObject } from "../types.ts";

	type Props = { message: JsonObject };
	let { message }: Props = $props();

	function isRecord(v: unknown): v is JsonObject {
		return v !== null && typeof v === "object" && !Array.isArray(v);
	}
</script>

<details class="wrap">
	<summary>
		Tool result · {String(message.toolName ?? "tool")}
		{#if message.toolCallId} · {String(message.toolCallId)}{/if}
		{#if message.isError} · error{/if}
	</summary>
	<div class="body">
		{#if typeof message.content === "string"}
			<pre class="code">{message.content}</pre>
		{:else if !Array.isArray(message.content)}
			<pre class="code">{JSON.stringify(message.content, null, 2)}</pre>
		{:else}
			{#each message.content as block}
				{#if !isRecord(block)}
					<pre class="code">{String(block)}</pre>
				{:else if block.type === "text" && typeof block.text === "string"}
					<pre class="code">{block.text}</pre>
				{:else if block.type === "image" && typeof block.data === "string"}
					{@const mime = typeof block.mimeType === "string" ? block.mimeType : "image/png"}
					<img alt="" src={"data:" + mime + ";base64," + block.data} class="img" />
				{:else}
					<pre class="code">{JSON.stringify(block, null, 2)}</pre>
				{/if}
			{/each}
		{/if}
		{#if message.details !== undefined && message.details !== null}
			<details class="nested">
				<summary>Details</summary>
				<pre class="code">{JSON.stringify(message.details, null, 2)}</pre>
			</details>
		{/if}
	</div>
</details>

<style>
	.wrap {
		margin: 0.35rem 0;
	}
	.body {
		margin-top: 0.35rem;
	}
	.code {
		margin: 0.35rem 0;
		overflow: auto;
		padding: 0.5rem;
		background: #0b0f14;
		border: 1px solid var(--border);
		border-radius: 6px;
	}
	.img {
		max-width: min(720px, 100%);
		border-radius: 6px;
	}
	.nested {
		margin-top: 0.5rem;
	}
</style>
