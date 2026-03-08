#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DEPLOY_BRANCH="${1:-${WEBUZO_DEPLOY_BRANCH:-main}}"

cd "$APP_DIR"

echo "Deploying Swift Signate from branch: $DEPLOY_BRANCH"

git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build

if [ -n "${WEBUZO_RESTART_COMMAND:-}" ]; then
  echo "Running custom restart command"
  bash -lc "$WEBUZO_RESTART_COMMAND"
else
  echo "Build complete. Restart the app in Webuzo Application Manager if it does not auto-reload."
fi
