#!/usr/bin/env bash
# Copies the web game from the repo root into the MAUI app's wwwroot/game. Run after changing the game.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/maui/DominionRestored/wwwroot/game"
rm -rf "$DEST"
mkdir -p "$DEST/js"
cp "$ROOT/index.html" "$ROOT/style.css" "$ROOT/icon.svg" "$DEST/"
cp "$ROOT"/js/*.js "$DEST/js/"
cp -R "$ROOT/js/vendor" "$DEST/js/" # Three.js for the 3D view
# the app bundles everything, so drop the PWA manifest link
sed -i.bak '/rel="manifest"/d' "$DEST/index.html" && rm -f "$DEST/index.html.bak"
echo "Synced game into $DEST"
