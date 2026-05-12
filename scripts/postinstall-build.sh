#!/usr/bin/env bash
# Build PiUi web + server bundle. Runs from npm postinstall when Pi installs this package.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v npm >/dev/null 2>&1; then
	echo "PiUi postinstall: npm is required on PATH." >&2
	exit 1
fi

npm run build
