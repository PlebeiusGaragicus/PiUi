<script lang="ts">
	import DirectorySelector from "./lib/DirectorySelector.svelte";
	import SessionFileList from "./lib/SessionFileList.svelte";
	import TranscriptView from "./lib/TranscriptView.svelte";
	import type { DiscoveryResponse, TranscriptResponse } from "./types.ts";

	let discovery = $state<DiscoveryResponse | null>(null);
	let discoveryError = $state<string | null>(null);

	let selectedBucket = $state<string | null>(null);
	let selectedRelPath = $state<string | null>(null);

	let transcript = $state<TranscriptResponse | null>(null);
	let transcriptLoading = $state(false);
	let transcriptError = $state<string | null>(null);

	async function loadDiscovery() {
		discoveryError = null;
		try {
			const res = await fetch("/api/discovery");
			if (!res.ok) {
				discoveryError = `Discovery failed (${res.status})`;
				return;
			}
			discovery = (await res.json()) as DiscoveryResponse;
			if (!discovery.rootExists) {
				return;
			}
			const names = discovery.buckets.map((b) => b.name);
			if (names.length === 0) return;
			if (!selectedBucket || !names.includes(selectedBucket)) {
				selectedBucket = names[0]!;
			}
			const files = discovery.buckets.find((b) => b.name === selectedBucket)?.files ?? [];
			if (files.length === 0) {
				selectedRelPath = null;
				return;
			}
			if (!selectedRelPath || !files.some((f) => f.relPath === selectedRelPath)) {
				selectedRelPath = files[0]!.relPath;
			}
		} catch (e) {
			discoveryError = e instanceof Error ? e.message : String(e);
		}
	}

	async function loadTranscript(rel: string) {
		transcriptLoading = true;
		transcriptError = null;
		transcript = null;
		try {
			const qs = new URLSearchParams({ relPath: rel });
			const res = await fetch(`/api/transcript?${qs.toString()}`);
			const json = (await res.json()) as TranscriptResponse;
			if (!res.ok) {
				transcriptError = json.error ?? `Transcript failed (${res.status})`;
				transcriptLoading = false;
				return;
			}
			transcript = json;
		} catch (e) {
			transcriptError = e instanceof Error ? e.message : String(e);
		} finally {
			transcriptLoading = false;
		}
	}

	$effect(() => {
		void loadDiscovery();
	});

	$effect(() => {
		const rel = selectedRelPath;
		if (!rel) return;
		void loadTranscript(rel);
	});

	const dirNames = $derived(discovery?.buckets.map((b) => b.name) ?? []);
	const filesForBucket = $derived(
		discovery && selectedBucket
			? (discovery.buckets.find((b) => b.name === selectedBucket)?.files ?? [])
			: [],
	);
</script>

<div class="app">
	<header class="top">
		<div>
			<div class="title">PiUi</div>
			<div class="sub">
				Sessions under <code>{discovery?.sessionsRoot ?? "…"}</code>
			</div>
		</div>
		<button type="button" class="ghost" onclick={() => loadDiscovery()}>Refresh</button>
	</header>

	{#if discoveryError}
		<div class="banner err">{discoveryError}</div>
	{/if}

	{#if discovery && !discovery.rootExists}
		<div class="banner warn">
			Directory does not exist yet. Run Pi to create sessions, then refresh.
		</div>
	{:else if discovery?.empty}
		<div class="banner info">No <code>.jsonl</code> session files found. Use Pi in a project to generate sessions.</div>
	{:else if discovery}
		<div class="layout">
			<aside class="aside">
				<DirectorySelector
					dirNames={dirNames}
					selected={selectedBucket ?? dirNames[0]!}
					onSelect={(name) => {
						selectedBucket = name;
						const files = discovery!.buckets.find((b) => b.name === name)?.files ?? [];
						selectedRelPath = files[0]?.relPath ?? null;
					}}
				/>
			</aside>
			<main class="main">
				<SessionFileList
					files={filesForBucket}
					{selectedRelPath}
					onSelect={(rel) => {
						selectedRelPath = rel;
					}}
					onDelete={async (rel) => {
						const res = await fetch("/api/session", {
							method: "DELETE",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ relPath: rel }),
						});
						const json = (await res.json()) as { error?: string };
						if (!res.ok) {
							alert(json.error ?? `Delete failed (${res.status})`);
							return;
						}
						if (selectedRelPath === rel) {
							selectedRelPath = null;
							transcript = null;
						}
						await loadDiscovery();
					}}
				/>

				<section class="tx">
					<h2 class="h">Transcript</h2>
					<TranscriptView data={transcript} loading={transcriptLoading} error={transcriptError} />
				</section>
			</main>
		</div>
	{/if}
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1rem 0.75rem;
		border-bottom: 1px solid var(--border);
		background: #0c1118;
	}
	.title {
		font-size: 1.35rem;
		font-weight: 650;
	}
	.sub {
		color: var(--muted);
		font-size: 0.9rem;
		margin-top: 0.25rem;
	}
	.sub code {
		color: var(--text);
	}
	.ghost {
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text);
		border-radius: 8px;
		padding: 0.45rem 0.65rem;
	}
	.banner {
		margin: 1rem;
		padding: 0.75rem 0.85rem;
		border-radius: 10px;
		border: 1px solid var(--border);
	}
	.banner.err {
		border-color: #7a2b2b;
		background: #301515;
		color: #ffd6d6;
	}
	.banner.warn {
		border-color: #6a5420;
		background: #2a2210;
		color: #ffe6b0;
	}
	.banner.info {
		color: var(--muted);
	}
	.layout {
		flex: 1;
		display: grid;
		grid-template-columns: minmax(240px, 320px) 1fr;
		min-height: 0;
	}
	.aside {
		min-height: 0;
		overflow: auto;
	}
	.main {
		min-width: 0;
		overflow: auto;
	}
	.tx {
		padding: 1rem;
	}
	.h {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
	}
</style>
