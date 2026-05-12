#!/usr/bin/env bash
# Create package-local venv/ and install Python deps. Runs from npm postinstall when Pi installs this package.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v python3 >/dev/null 2>&1; then
	echo "PiUi postinstall: python3 is required on PATH." >&2
	exit 1
fi

if [[ ! -x "$ROOT/venv/bin/python" ]]; then
	python3 -m venv "$ROOT/venv"
fi

"$ROOT/venv/bin/python" -m pip install -r "$ROOT/requirements.txt"
