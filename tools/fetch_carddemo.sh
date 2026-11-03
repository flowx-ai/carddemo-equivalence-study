#!/usr/bin/env bash
# Alternative to the vendored src/: fetch AWS CardDemo (Apache-2.0) at the pinned commit and copy the batch sources.
# usage: tools/fetch_carddemo.sh [clone-dir]
set -euo pipefail
cd "$(dirname "$0")/.."
C=${1:-carddemo}; PIN=59cc6c2fd7ebd7ef7925cad552a01a4b8b6e4d5e
[ -d "$C/.git" ] || git clone https://github.com/aws-samples/aws-mainframe-modernization-carddemo.git "$C"
git -C "$C" checkout --quiet "$PIN"
echo "CardDemo at $PIN in $C; set CARDDEMO=$C for normalize.py"
