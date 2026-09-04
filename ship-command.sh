#!/usr/bin/env bash
# ship-command.sh — deploy the internal Growth Command board to Cloudflare
# Pages. Free, like ./ship.sh.
#
#   ./ship-command.sh
#
# This is a SECOND Pages project, separate from the marketing site on purpose:
#
#   marketing   https://frontpagelabs.pages.dev          ./ship.sh
#   command     https://frontpagelabs-command.pages.dev  ./ship-command.sh
#
# Separate origins mean the internal board cannot leak onto the public site
# through a stray route, a shared cookie, or a caching rule. It also lets the
# board keep the same URL shape as the laptop server (/, /login, /api/*), so
# dashboard/public/*.html is copied over byte-for-byte instead of forked.
#
# What ships is the committed board: the sample CRM records plus the real site
# audit. The Airtable-backed store, the Claude drafting and the research
# endpoints stay on the laptop — they hold in-memory job state and an API key
# that spends money, neither of which belongs on a public address.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="frontpagelabs-command"

# Fails closed rather than shipping a board anyone can open: the middleware
# 503s the whole project when this is unset, but catching it here is friendlier
# than discovering it in a browser.
if ! wrangler pages secret list --project-name "$PROJECT" 2>/dev/null | grep -q FPL_DASH_PIN; then
  echo "FPL_DASH_PIN is not set on the '$PROJECT' project." >&2
  echo "Set it first, or the deployed board answers 503 to everything:" >&2
  echo "  wrangler pages secret put FPL_DASH_PIN --project-name $PROJECT" >&2
  exit 1
fi

PUB=$(node command/build.mjs)

ok=0
for attempt in 1 2 3; do
  if wrangler pages deploy "$PUB/site" --cwd "$PUB" --project-name "$PROJECT" --branch main --commit-dirty=true; then
    ok=1; break
  fi
  echo ""
  echo "Upload failed (attempt $attempt/3) — retrying; already-uploaded files are skipped."
  sleep 3
done

if [ "$ok" -ne 1 ]; then
  echo "Cloudflare upload failed 3 times. Re-run ./ship-command.sh; it resumes." >&2
  exit 1
fi

echo ""
echo "Growth Command is live at https://$PROJECT.pages.dev"
echo "Sign in with the FPL_DASH_PIN secret set on that project."
