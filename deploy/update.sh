#!/usr/bin/env bash
# Pull the latest version and restart with zero data loss (database migrations are automatic).
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null || true
echo "✓ Updated to $(git rev-parse --short HEAD)"
