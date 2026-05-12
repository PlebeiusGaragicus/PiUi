# PiUi feature inventory

This document tracks parity between the legacy Streamlit UI (`streamlit_app/app.py`, removed) and the current **Svelte + Node** implementation.

## Session discovery

- [x] Recursive discovery of `*.jsonl` under `~/.pi/agent/sessions`
- [x] Grouping by first path segment (“Pi cwd bucket”), with `(sessions root)` for top-level files
- [x] Per-file metadata label (mtime, size in KiB)
- [x] Sorting files by mtime (newest first)

## Transcript / ordering

- [x] JSONL parsing with per-line error counting
- [x] Tree ordering along `parentId` / `id` graph (leaf with latest timestamp, walk to root, chronological)
- [x] Fallback ordering when the tree cannot be derived
- [x] Session header (`type: session`) shown in an expandable “Session metadata” panel

## Message rendering

- [x] User messages (`role: user`) including string content and structured content blocks (`text`, `image`, other as JSON)
- [x] Assistant messages (`role: assistant`) including `text`, `thinking`, `toolCall`, and unknown blocks
- [x] Tool call / tool result pairing for consecutive `toolResult` messages after an assistant turn (same behavior as the Python reference)
- [x] Standalone `toolResult` messages
- [x] `bashExecution` (command, output expander, exit code)
- [x] `custom` messages (`customType` + shared content renderer)
- [x] `branchSummary` / `compactionSummary`
- [x] Unknown roles (fallback JSON)
- [x] Malformed `message` entries
- [x] `custom_message` entries
- [x] Non-message entries (`Entry · type` + raw JSON expander)

## Mutations

- [x] Delete selected `.jsonl` via API (`DELETE /api/session`) with path hardening under the sessions root

## Not in scope (current)

- [ ] Live tail / SSE for actively growing JSONL files (Streamlit UI also did not truly live-update)
