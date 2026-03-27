#!/usr/bin/env bash
# Publish all workspace packages to a local Verdaccio instance (dependency order).
# Prerequisite: Verdaccio is running (e.g. npm run registry:local).
# If Nx chose another port (e.g. 4874 when 4873 is busy), use the same URL:
#   NPM_PUBLISH_REGISTRY=http://localhost:4874/ npm run publish:local
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REGISTRY="${NPM_PUBLISH_REGISTRY:-http://localhost:4873/}"

publish_one() {
  local nx_project="$1"
  local pkg_dir="$2"
  echo "==> Build & publish: $nx_project -> $REGISTRY"
  npx nx build "$nx_project"
  (cd "packages/$pkg_dir" && npm publish --registry "$REGISTRY" --access public)
}

publish_one bananajs bananajs
publish_one ddd ddd
publish_one plugin-typeorm plugin-typeorm
publish_one plugin-mongoose plugin-mongoose
publish_one plugin-otel plugin-otel
publish_one plugin-zod plugin-zod
publish_one plugin-websocket plugin-websocket
publish_one adapter-fastify adapter-fastify
publish_one bananajs-cli bananajs-cli

echo "Done. Packages are available at $REGISTRY"
