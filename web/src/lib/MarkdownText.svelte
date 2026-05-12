<script lang="ts">
	import { marked } from "marked";

	type Props = { text: string };
	let { text }: Props = $props();

	const html = $derived(marked.parse(text, { async: false }) as string);
</script>

<div class="md">{@html html}</div>

<style>
	.md :global(p) {
		margin: 0.35em 0;
	}
	.md :global(pre) {
		overflow: auto;
		padding: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
	}
</style>
