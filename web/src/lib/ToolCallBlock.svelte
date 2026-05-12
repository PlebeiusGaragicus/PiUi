<script lang="ts">
	import type { JsonObject } from "../types.ts";

	type Props = { block: JsonObject };
	let { block }: Props = $props();

	const name = $derived(String(block.name ?? "tool"));
	const tcid = $derived(typeof block.id === "string" ? block.id : "");
</script>

<div class="call">
	<div><strong>Tool call</strong> · <code>{name}</code>{#if tcid} · <code>{tcid}</code>{/if}</div>
	{#if block.arguments !== undefined && block.arguments !== null && typeof block.arguments === "object" && !Array.isArray(block.arguments)}
		<pre class="code">{JSON.stringify(block.arguments, null, 2)}</pre>
	{:else}
		<pre class="code">{JSON.stringify(block, null, 2)}</pre>
	{/if}
</div>

<style>
	.call {
		display: grid;
		gap: 0.35rem;
	}
	.code {
		margin: 0;
		overflow: auto;
		padding: 0.5rem;
		background: #0b0f14;
		border: 1px solid var(--border);
		border-radius: 6px;
	}
</style>
