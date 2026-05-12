<script lang="ts">
	import AssistantMessage from "./AssistantMessage.svelte";
	import MarkdownText from "./MarkdownText.svelte";
	import ToolResultBody from "./ToolResultBody.svelte";
	import UserContent from "./UserContent.svelte";
	import type { ViewRow } from "../types.ts";

	type Props = { row: ViewRow };
	let { row }: Props = $props();
</script>

{#if row.kind === "user"}
	<div class="row user">
		<div class="avatar" aria-hidden="true">🧑🏻‍💻</div>
		<div class="body">
			<UserContent content={row.content} />
		</div>
	</div>
{:else if row.kind === "assistant"}
	<div class="row assistant">
		<div class="avatar" aria-hidden="true">🧠</div>
		<div class="body">
			<AssistantMessage message={row.message} pairedToolResults={row.pairedToolResults} />
		</div>
	</div>
{:else if row.kind === "toolResult"}
	<div class="row tool">
		<div class="avatar" aria-hidden="true">💻</div>
		<div class="body">
			<ToolResultBody message={row.message} />
		</div>
	</div>
{:else if row.kind === "bash"}
	<div class="row tool">
		<div class="avatar" aria-hidden="true">💻</div>
		<div class="body">
			<div class="bubble tool">
				<strong>Bash</strong>
				<code>{String(row.message.command ?? "")}</code>
				{#if typeof row.message.output === "string" && row.message.output.trim()}
					<details>
						<summary>Output</summary>
						<pre class="code">{row.message.output}</pre>
					</details>
				{/if}
				{#if row.message.exitCode !== undefined && row.message.exitCode !== null}
					<div class="muted">exit {String(row.message.exitCode)}</div>
				{/if}
			</div>
		</div>
	</div>
{:else if row.kind === "custom"}
	<div class="row assistant">
		<div class="avatar" aria-hidden="true">🧠</div>
		<div class="body">
			<div class="bubble assistant">
				<div class="muted">Extension · {String(row.message.customType ?? "custom")}</div>
				<UserContent content={row.message.content} />
			</div>
		</div>
	</div>
{:else if row.kind === "summary"}
	<div class="row assistant">
		<div class="avatar" aria-hidden="true">🧠</div>
		<div class="body">
			<div class="bubble assistant">
				{#if typeof row.message.summary === "string"}
					<MarkdownText text={row.message.summary} />
				{:else}
					<pre class="code">{JSON.stringify(row.message, null, 2)}</pre>
				{/if}
			</div>
		</div>
	</div>
{:else if row.kind === "unknown_role"}
	<div class="row assistant">
		<div class="avatar" aria-hidden="true">🧠</div>
		<div class="body">
			<div class="bubble assistant">
				<div class="muted">role: {String(row.role)}</div>
				<pre class="code">{JSON.stringify(row.message, null, 2)}</pre>
			</div>
		</div>
	</div>
{:else if row.kind === "malformed_message"}
	<div class="row assistant">
		<div class="avatar" aria-hidden="true">🧠</div>
		<div class="body">
			<div class="bubble assistant">
				<div class="muted">Malformed message entry</div>
				<pre class="code">{JSON.stringify(row.entry, null, 2)}</pre>
			</div>
		</div>
	</div>
{:else if row.kind === "custom_message"}
	<div class="row assistant">
		<div class="avatar" aria-hidden="true">🧠</div>
		<div class="body">
			<div class="bubble assistant">
				<div class="muted">Extension message · {String(row.entry.customType ?? "custom_message")}</div>
				<UserContent content={row.entry.content} />
			</div>
		</div>
	</div>
{:else if row.kind === "raw_entry"}
	<div class="row raw">
		<div class="body">
			<div class="muted">Entry · {String(row.entry.type ?? "?")}</div>
			<details>
				<summary>Raw entry</summary>
				<pre class="code">{JSON.stringify(row.entry, null, 2)}</pre>
			</details>
		</div>
	</div>
{/if}

<style>
	.row {
		display: grid;
		grid-template-columns: 44px 1fr;
		gap: 0.65rem;
		align-items: start;
		margin: 0.35rem 0;
	}
	.row.raw {
		grid-template-columns: 1fr;
	}
	.avatar {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: #121922;
		font-size: 1.15rem;
	}
	.body {
		min-width: 0;
	}
	.bubble {
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 10px;
		padding: 0.65rem 0.85rem;
		max-width: min(960px, 100%);
	}
	.bubble.tool {
		border-color: #3a4a66;
	}
	.muted {
		color: var(--muted);
		font-size: 0.85rem;
		margin-bottom: 0.35rem;
	}
	.code {
		margin: 0.35rem 0 0;
		overflow: auto;
		padding: 0.5rem;
		background: #0b0f14;
		border: 1px solid var(--border);
		border-radius: 6px;
	}
</style>
