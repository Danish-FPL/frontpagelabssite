#!/usr/bin/env bash
# commit.sh — stage everything, commit, and push to GitHub. Never deploys.
# Netlify auto-builds are OFF for this repo, so pushing costs nothing and
# changes nothing on the live site. Deploying is ./ship.sh.
#
#   ./commit.sh "what changed"
set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-}"
if [ -z "$MSG" ]; then
  echo "Usage: ./commit.sh \"commit message\"" >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "Refusing to push from '$BRANCH' — switch to main first." >&2
  exit 1
fi

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "Refusing: .env is tracked by git. Untrack it before pushing." >&2
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "$MSG"
fi
git push origin main
echo "Pushed to GitHub. Live site unchanged — run ./ship.sh to deploy."
