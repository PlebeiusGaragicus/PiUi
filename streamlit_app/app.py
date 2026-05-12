"""Browse Pi agent session JSONL files under ~/.pi/agent/sessions."""

from __future__ import annotations

import base64
import json
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

import streamlit as st

SESSIONS_ROOT = Path.home() / ".pi/agent/sessions"
ROOT_DIR_LABEL = "(sessions root)"

# st.chat_message(..., avatar=…) — see https://docs.streamlit.io/develop/api-reference/chat/st.chat_message
_CHAT_AVATAR_USER = "🧠"
_CHAT_AVATAR_ASSISTANT = "🤖"
_CHAT_AVATAR_TOOL = "💻"


def rel_under_sessions(path: Path) -> str:
    try:
        return str(path.relative_to(SESSIONS_ROOT))
    except ValueError:
        return str(path)


def discover_jsonl_by_directory() -> dict[str, list[Path]]:
    """Group *.jsonl paths by first segment under SESSIONS_ROOT (Pi cwd bucket)."""
    if not SESSIONS_ROOT.is_dir():
        return {}
    buckets: dict[str, list[Path]] = {}
    for p in SESSIONS_ROOT.rglob("*.jsonl"):
        rel = Path(rel_under_sessions(p))
        parts = rel.parts
        if not parts:
            continue
        key = ROOT_DIR_LABEL if len(parts) == 1 else parts[0]
        buckets.setdefault(key, []).append(p)
    for paths in buckets.values():
        paths.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    return buckets


def format_file_radio_label(p: Path) -> str:
    stt = p.stat()
    mtime = datetime.fromtimestamp(stt.st_mtime).strftime("%Y-%m-%d %H:%M")
    kb = round(stt.st_size / 1024, 1)
    return f"{p.name} · {mtime} · {kb} KiB"


def load_jsonl_objects(path: Path) -> tuple[list[tuple[int, dict[str, Any] | None]], int]:
    """Return (line_no, parsed_obj or None on error), parse_error_count."""
    rows: list[tuple[int, dict[str, Any] | None]] = []
    errors = 0
    with path.open(encoding="utf-8", errors="replace") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                errors += 1
                rows.append((line_no, None))
                continue
            if isinstance(obj, dict):
                rows.append((line_no, obj))
            else:
                errors += 1
                rows.append((line_no, None))
    return rows, errors


def entry_sort_key(obj: dict[str, Any]) -> float:
    """Prefer entry ISO timestamp; else message ms timestamp."""
    ts = obj.get("timestamp")
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
        except ValueError:
            pass
    msg = obj.get("message")
    if isinstance(msg, dict):
        mt = msg.get("timestamp")
        if isinstance(mt, (int, float)):
            return float(mt) / 1000.0
    return 0.0


def ordered_entries_for_display(
    parsed: list[tuple[int, dict[str, Any] | None]],
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Order session entries along Pi's parent/child tree: pick the leaf with the latest
    timestamp, walk parentId to root, reverse to chronological. If that fails, use
    file order for dict lines only (message-focused fallback).
    """
    objects = [o for _, o in parsed if isinstance(o, dict)]
    # Exclude session header from id graph — it has an id but is not a tree node.
    by_id: dict[str, dict[str, Any]] = {}
    for obj in objects:
        if obj.get("type") == "session":
            continue
        oid = obj.get("id")
        if isinstance(oid, str) and oid:
            by_id[oid] = obj

    children: dict[str, list[str]] = {}
    for obj in by_id.values():
        pid = obj.get("parentId")
        if isinstance(pid, str) and pid in by_id:
            children.setdefault(pid, []).append(str(obj["id"]))

    leaves = [oid for oid in by_id if oid not in children]
    if not leaves:
        return (
            [o for o in objects if o.get("type") != "session"],
            "No tree ids found; showing entries in file order.",
        )

    leaf_id = max(leaves, key=lambda i: entry_sort_key(by_id[i]))
    chain: list[dict[str, Any]] = []
    cur: dict[str, Any] | None = by_id.get(leaf_id)
    seen: set[str] = set()
    while cur is not None:
        cid = cur.get("id")
        if isinstance(cid, str):
            if cid in seen:
                break
            seen.add(cid)
        chain.append(cur)
        pid = cur.get("parentId")
        if not isinstance(pid, str) or pid not in by_id:
            break
        cur = by_id[pid]
    chain.reverse()
    # Drop session header line from spine if it slipped in (normally no parentId loop)
    chain = [e for e in chain if e.get("type") != "session"]
    return chain, None


def fallback_entry_order(objects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [o for o in objects if o.get("type") != "session"]


def render_user_content(content: Any) -> None:
    if isinstance(content, str):
        st.markdown(content)
        return
    if not isinstance(content, list):
        st.json(content)
        return
    for block in content:
        if not isinstance(block, dict):
            st.text(str(block))
            continue
        bt = block.get("type")
        if bt == "text" and isinstance(block.get("text"), str):
            st.markdown(block["text"])
        elif bt == "image" and isinstance(block.get("data"), str):
            mime = block.get("mimeType") or "image/png"
            try:
                raw = base64.b64decode(block["data"], validate=False)
                st.image(BytesIO(raw), caption=mime)
            except (ValueError, OSError):
                st.caption("(image decode failed)")
        else:
            with st.expander("Content block", expanded=False):
                st.json(block)


def render_tool_result_content(content: Any) -> None:
    """Show tool output as raw text in code blocks (no markdown / st.write)."""
    if isinstance(content, str):
        st.code(content, language="text")
        return
    if not isinstance(content, list):
        st.code(
            json.dumps(content, indent=2, ensure_ascii=False),
            language="json",
        )
        return
    for block in content:
        if not isinstance(block, dict):
            st.code(str(block), language="text")
            continue
        bt = block.get("type")
        if bt == "text" and isinstance(block.get("text"), str):
            st.code(block["text"], language="text")
        elif bt == "image" and isinstance(block.get("data"), str):
            mime = block.get("mimeType") or "image/png"
            try:
                raw = base64.b64decode(block["data"], validate=False)
                st.image(BytesIO(raw), caption=mime)
            except (ValueError, OSError):
                st.caption("(image decode failed)")
        else:
            st.code(
                json.dumps(block, indent=2, ensure_ascii=False),
                language="json",
            )


def render_tool_call_block(block: dict[str, Any]) -> None:
    """Single toolCall block (caller wraps in st.chat_message with tool avatar)."""
    name = block.get("name") or "tool"
    tcid = block.get("id") or ""
    st.markdown(f"**Tool call** · `{name}`" + (f" · `{tcid}`" if tcid else ""))
    args = block.get("arguments")
    if isinstance(args, dict):
        st.code(
            json.dumps(args, indent=2, ensure_ascii=False),
            language="json",
        )
    else:
        st.code(
            json.dumps(block, indent=2, ensure_ascii=False),
            language="json",
        )


def render_assistant_message_blocks(msg: dict[str, Any]) -> None:
    """Assistant turns: robot avatar; each toolCall gets its own message with computer avatar."""
    meta_bits: list[str] = []
    if isinstance(msg.get("model"), str):
        meta_bits.append(msg["model"])
    sr = msg.get("stopReason")
    if sr is not None:
        meta_bits.append(f"stop: {sr}")
    meta_line = " · ".join(meta_bits) if meta_bits else None
    meta_shown = False

    def maybe_caption() -> None:
        nonlocal meta_shown
        if meta_line and not meta_shown:
            st.caption(meta_line)
            meta_shown = True

    blocks = msg.get("content")
    if not isinstance(blocks, list):
        with st.chat_message("assistant", avatar=_CHAT_AVATAR_ASSISTANT):
            maybe_caption()
            st.markdown(str(blocks))
        return

    i = 0
    n = len(blocks)
    while i < n:
        b = blocks[i]
        if isinstance(b, dict) and b.get("type") == "toolCall":
            with st.chat_message("assistant", avatar=_CHAT_AVATAR_TOOL):
                maybe_caption()
                render_tool_call_block(b)
            i += 1
            continue

        with st.chat_message("assistant", avatar=_CHAT_AVATAR_ASSISTANT):
            maybe_caption()
            while i < n:
                b2 = blocks[i]
                if isinstance(b2, dict) and b2.get("type") == "toolCall":
                    break
                if not isinstance(b2, dict):
                    st.text(str(b2))
                    i += 1
                    continue
                bt = b2.get("type")
                if bt == "text" and isinstance(b2.get("text"), str):
                    st.markdown(b2["text"])
                elif bt == "thinking" and isinstance(b2.get("thinking"), str):
                    with st.expander("Thinking", expanded=False):
                        st.markdown(b2["thinking"])
                else:
                    with st.expander(f"Block ({bt})", expanded=False):
                        st.json(b2)
                i += 1


def render_message_entry(entry: dict[str, Any]) -> None:
    msg = entry.get("message")
    if not isinstance(msg, dict):
        with st.chat_message("assistant", avatar=_CHAT_AVATAR_ASSISTANT):
            st.caption("Malformed message entry")
            st.json(entry)
        return

    role = msg.get("role")

    if role == "user":
        with st.chat_message("user", avatar=_CHAT_AVATAR_USER):
            render_user_content(msg.get("content"))
        return

    if role == "assistant":
        render_assistant_message_blocks(msg)
        return

    if role == "toolResult":
        with st.chat_message("assistant", avatar=_CHAT_AVATAR_TOOL):
            err = msg.get("isError")
            title = msg.get("toolName") or "tool"
            tid = msg.get("toolCallId") or ""
            bits = [title]
            if tid:
                bits.append(tid)
            if err:
                bits.append("error")
            expander_label = "Tool result · " + " · ".join(bits)
            with st.expander(expander_label, expanded=False):
                render_tool_result_content(msg.get("content"))
                details = msg.get("details")
                if details is not None:
                    with st.expander("Details", expanded=False):
                        st.json(details)
        return

    if role == "bashExecution":
        with st.chat_message("assistant", avatar=_CHAT_AVATAR_TOOL):
            cmd = msg.get("command") or ""
            st.markdown(f"**Bash** `{cmd}`")
            out = msg.get("output")
            if isinstance(out, str) and out.strip():
                with st.expander("Output", expanded=False):
                    st.code(out, language="text")
            ec = msg.get("exitCode")
            if ec is not None:
                st.caption(f"exit {ec}")
        return

    if role == "custom":
        with st.chat_message("assistant", avatar=_CHAT_AVATAR_ASSISTANT):
            ct = msg.get("customType") or "custom"
            st.caption(f"Extension · {ct}")
            render_user_content(msg.get("content"))
        return

    if role in ("branchSummary", "compactionSummary"):
        with st.chat_message("assistant", avatar=_CHAT_AVATAR_ASSISTANT):
            summary = msg.get("summary")
            if isinstance(summary, str):
                st.markdown(summary)
            else:
                st.json(msg)
        return

    with st.chat_message("assistant", avatar=_CHAT_AVATAR_ASSISTANT):
        st.caption(f"role: {role}")
        st.json(msg)


def render_non_message_entry(entry: dict[str, Any]) -> None:
    et = entry.get("type", "?")
    st.caption(f"Entry · {et}")
    with st.expander("Raw entry", expanded=False):
        st.json(entry)


def render_session_header(header: dict[str, Any]) -> None:
    with st.expander("Session metadata", expanded=False):
        st.json(header)


def render_transcript(path: Path) -> None:
    parsed, parse_errors = load_jsonl_objects(path)
    if parse_errors:
        st.warning(f"{parse_errors} line(s) could not be parsed as JSON.")

    objects = [o for _, o in parsed if isinstance(o, dict)]
    header = objects[0] if objects and objects[0].get("type") == "session" else None
    if header:
        render_session_header(header)

    spine, note = ordered_entries_for_display(parsed)
    if note:
        st.caption(note)

    if not spine:
        spine = fallback_entry_order(objects[1:] if header else objects)

    for entry in spine:
        et = entry.get("type")
        if et == "message":
            render_message_entry(entry)
        elif et == "custom_message":
            with st.chat_message("assistant", avatar=_CHAT_AVATAR_ASSISTANT):
                ct = entry.get("customType") or "custom_message"
                st.caption(f"Extension message · {ct}")
                render_user_content(entry.get("content"))
        else:
            render_non_message_entry(entry)


def main() -> None:
    st.set_page_config(page_title="PiUi", layout="wide")
    st.title("PiUi")
    st.caption(f"Sessions under `{SESSIONS_ROOT}`")

    if not SESSIONS_ROOT.is_dir():
        st.warning(
            f"Directory does not exist yet: `{SESSIONS_ROOT}`. "
            "Run Pi to create sessions, then refresh this page."
        )
        return

    buckets = discover_jsonl_by_directory()
    if not buckets:
        st.info("No `.jsonl` session files found. Use Pi in a project to generate sessions.")
        return

    dir_names = sorted(buckets.keys(), key=lambda k: (k != ROOT_DIR_LABEL, k.lower()))

    if "piui_dir" not in st.session_state or st.session_state["piui_dir"] not in buckets:
        st.session_state["piui_dir"] = dir_names[0]

    st.sidebar.header("Directory")
    dir_choice = st.sidebar.radio(
        "Working directory (Pi cwd bucket)",
        options=dir_names,
        index=dir_names.index(st.session_state["piui_dir"]),
        label_visibility="collapsed",
    )
    st.session_state["piui_dir"] = dir_choice

    files = buckets[dir_choice]
    labels = [format_file_radio_label(p) for p in files]
    label_to_path = dict(zip(labels, files))

    if st.session_state.get("_piui_dir_last") != dir_choice:
        st.session_state["_piui_dir_last"] = dir_choice
        st.session_state.pop("piui_file_label", None)

    st.subheader("Session file")
    if len(labels) == 1:
        chosen_label = labels[0]
        st.caption(chosen_label)
    else:
        default_label = st.session_state.get("piui_file_label", labels[0])
        if default_label not in label_to_path:
            default_label = labels[0]
        idx = labels.index(default_label)
        chosen_label = st.radio(
            "Open a session",
            options=labels,
            index=idx,
            label_visibility="collapsed",
        )
    st.session_state["piui_file_label"] = chosen_label
    selected_path = label_to_path[chosen_label]

    st.divider()
    st.subheader("Transcript")
    render_transcript(selected_path)


main()
