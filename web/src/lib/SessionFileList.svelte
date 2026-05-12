<script lang="ts">
	type FileItem = { relPath: string; label: string };

	type Props = {
		files: FileItem[];
		selectedRelPath: string | null;
		onSelect: (relPath: string) => void;
		onDelete: (relPath: string) => void;
	};
	let { files, selectedRelPath, onSelect, onDelete }: Props = $props();
</script>

<div class="wrap">
	<h2 class="h">Session file</h2>
	{#if files.length === 0}
		<div class="muted">No files in this bucket.</div>
	{:else if files.length === 1}
		<div class="muted">{files[0]!.label}</div>
	{:else}
		<div class="cap">Choose a session file</div>
		<div class="list">
			{#each files as f (f.relPath)}
				<button
					type="button"
					class:primary={f.relPath === selectedRelPath}
					onclick={() => onSelect(f.relPath)}
				>
					{f.label}
				</button>
			{/each}
		</div>
	{/if}

	{#if selectedRelPath}
		<div class="dangerZone">
			<button
				type="button"
				class="danger"
				onclick={() => {
					if (confirm(`Delete session file?\n\n${selectedRelPath}\n\nThis cannot be undone.`)) {
						onDelete(selectedRelPath);
					}
				}}
			>
				Delete selected session
			</button>
		</div>
	{/if}
</div>

<style>
	.wrap {
		padding: 1rem;
		border-bottom: 1px solid var(--border);
	}
	.h {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
	}
	.cap {
		color: var(--muted);
		font-size: 0.85rem;
		margin: 0.35rem 0 0.5rem;
	}
	.muted {
		color: var(--muted);
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
	.dangerZone {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px dashed var(--border);
	}
	.danger {
		border-color: #7a2b2b !important;
		background: #301515 !important;
		color: #ffd6d6 !important;
	}
</style>
