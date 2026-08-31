#!/usr/bin/env bash
# ship.sh — build the Astro site and deploy it to Netlify (production).
# This is the ONLY way this site deploys: auto-builds from GitHub are stopped
# on the Netlify site, so ./commit.sh pushes never touch production.
#
#   ./ship.sh        # asks before deploying
#   ./ship.sh -y     # skips the prompt (for when you've already confirmed)
set -euo pipefail
cd "$(dirname "$0")"

SITE_ID="507edb9e-f40e-4982-9d1c-06f291b5196d"   # frontpagelabs.netlify.app

SKIP_PROMPT=false
if [ "${1:-}" = "-y" ]; then
  SKIP_PROMPT=true
fi

# Deploys spend Netlify credits — never fire from a non-interactive pipe
# unless -y was passed deliberately.
if [ "$SKIP_PROMPT" = false ]; then
  if [ ! -t 0 ]; then
    echo "Refusing to deploy: stdin is not a terminal. Re-run with -y to confirm." >&2
    exit 1
  fi
  printf "Deploy to https://frontpagelabs.netlify.app (production)? [y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Aborted. Nothing deployed."; exit 0 ;;
  esac
fi

echo "Building…"
npm run build

# Run from the repo root so netlify.toml resolves and functions deploy.
# dist/ is Astro's build output only — docs, scripts and tooling never ship.
echo "Deploying…"
netlify deploy --prod --dir dist --site "$SITE_ID" --skip-functions-cache

echo "Shipped: https://frontpagelabs.netlify.app"
