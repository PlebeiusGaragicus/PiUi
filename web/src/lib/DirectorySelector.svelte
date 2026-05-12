<script lang="ts">
	type Props = {
		dirNames: string[];
		selected: string;
		onSelect: (name: string) => void;
	};
	let { dirNames, selected, onSelect }: Props = $props();
</script>

<div class="wrap">
	<div class="cap">Working directory (Pi cwd bucket)</div>
	<div class="list">
		{#each dirNames as name (name)}
			<button type="button" class:primary={name === selected} onclick={() => onSelect(name)}>
				{name}
			</button>
		{/each}
	</div>
</div>

<style>
	.wrap {
		border-right: 1px solid var(--border);
		padding: 1rem;
		min-height: 100%;
		background: #0c1118;
	}
	.cap {
		color: var(--muted);
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
	}
	.list {
		display: grid;
		gap: 0.35rem;
	}
	button {
		width: 100%;
		text-align: left;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: #121a24;
		color: var(--text);
		padding: 0.55rem 0.65rem;
	}
	button.primary {
		border-color: #4b6cb7;
		background: #1b2a44;
	}
</style>
