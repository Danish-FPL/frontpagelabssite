#!/usr/bin/env bash
# deploy.sh — build the Astro site and deploy it to Netlify (production).
# THE ONLY STEP THAT COSTS CREDITS.
#
#   ./deploy.sh      # asks before deploying
#   ./deploy.sh -y   # skips the prompt (for when you've already confirmed)
#
# Netlify is the paid production host. For everyday previewing use ./ship.sh,
# which deploys the same build to Cloudflare Pages for free and leaves this
# site untouched.
#
# The ladder, cheapest first:
#   ./commit.sh "msg"   commit + push to GitHub          free
#   ./ship.sh           push + deploy to Cloudflare      free      <- everyday
#   ./deploy.sh         deploy to Netlify (production)   credits
#
# Auto-builds from GitHub are stopped on the Netlify site, so ./commit.sh
# pushes never touch production.
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

echo "Deployed to Netlify: https://frontpagelabs.netlify.app"
echo "Cloudflare (https://frontpagelabs.pages.dev) is UNCHANGED — ./ship.sh moves that."
