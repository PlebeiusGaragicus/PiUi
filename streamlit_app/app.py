"""Browse Pi agent session JSONL files under ~/.pi/agent/sessions."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import streamlit as st

SESSIONS_ROOT = Path.home() / ".pi/agent/sessions"


def discover_jsonl_files() -> list[Path]:
    if not SESSIONS_ROOT.is_dir():
        return []
    found = list(SESSIONS_ROOT.rglob("*.jsonl"))
    found.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return found


def rel_under_sessions(path: Path) -> str:
    try:
        return str(path.relative_to(SESSIONS_ROOT))
    except ValueError:
        return str(path)


def summarize_file(path: Path) -> tuple[list[dict], Counter[str], Counter[str], int]:
    """Returns rows for preview table, type counts, role counts, parse_errors."""
    preview_rows: list[dict] = []
    types: Counter[str] = Counter()
    roles: Counter[str] = Counter()
    parse_errors = 0

    with path.open(encoding="utf-8", errors="replace") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                parse_errors += 1
                if len(preview_rows) < 200:
                    preview_rows.append(
                        {
                            "line": line_no,
                            "kind": "parse_error",
                            "detail": line[:200],
                        }
                    )
                continue

            if isinstance(obj, dict):
                t = obj.get("type")
                if t is not None:
                    types[str(t)] += 1
                msg = obj.get("message")
                if isinstance(msg, dict) and "role" in msg:
                    roles[str(msg["role"])] += 1

            if len(preview_rows) < 200:
                kind = obj.get("type") if isinstance(obj, dict) else type(obj).__name__
                preview_rows.append({"line": line_no, "kind": kind, "detail": json.dumps(obj)[:500]})

    return preview_rows, types, roles, parse_errors


def main() -> None:
    st.set_page_config(page_title="PiUi", layout="wide")
    st.title("PiUi")
    st.caption(f"Sessions under `{SESSIONS_ROOT}`")

    files = discover_jsonl_files()

    if not SESSIONS_ROOT.is_dir():
        st.warning(
            f"Directory does not exist yet: `{SESSIONS_ROOT}`. "
            "Run Pi to create sessions, then refresh this page."
        )
        return

    if not files:
        st.info("No `.jsonl` session files found. Use Pi in a project to generate sessions.")
        return

    rows_meta = []
    for p in files:
        stt = p.stat()
        rows_meta.append(
            {
                "relative_path": rel_under_sessions(p),
                "mtime": datetime.fromtimestamp(stt.st_mtime).isoformat(timespec="seconds"),
                "size_kb": round(stt.st_size / 1024, 2),
                "_path": p,
            }
        )

    st.sidebar.header("Session files")
    labels = [r["relative_path"] for r in rows_meta]
    choice = st.sidebar.selectbox("Select a session", options=labels, index=0)
    chosen = next(r for r in rows_meta if r["relative_path"] == choice)
    path: Path = chosen["_path"]

    st.subheader("All sessions")
    st.dataframe(
        [{k: v for k, v in r.items() if k != "_path"} for r in rows_meta],
        use_container_width=True,
        hide_index=True,
    )

    st.divider()
    st.subheader(f"Selected: `{choice}`")

    preview_rows, types, roles, parse_errors = summarize_file(path)

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Preview rows (max 200)", len(preview_rows))
    with c2:
        st.metric("JSON parse errors (in file)", parse_errors)
    with c3:
        st.metric("Distinct entry types", len(types))

    if types:
        st.write("**Entry `type` counts**")
        st.json(dict(types.most_common()))
    if roles:
        st.write("**Message `role` counts** (when present)")
        st.json(dict(roles.most_common()))

    st.write("**First lines (preview)**")
    st.dataframe(preview_rows, use_container_width=True, hide_index=True)


main()
