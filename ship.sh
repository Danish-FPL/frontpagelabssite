#!/usr/bin/env bash
# ship.sh — commit, push, and deploy to Cloudflare Pages. The everyday command,
# and it is FREE: Cloudflare Pages deploys are unlimited and cost nothing.
# Use it as often as you like.
#
#   ./ship.sh                    # commits with a timestamp message, then ships
#   ./ship.sh "tighten spacing"  # commits with your message, then ships
#
# The ladder, cheapest first:
#   ./commit.sh "msg"   commit + push to GitHub          free
#   ./ship.sh           push + deploy to Cloudflare      free      <- everyday
#   ./deploy.sh         deploy to Netlify (production)   credits
#
# Preview lives at https://frontpagelabs.pages.dev. Netlify
# (https://frontpagelabs.netlify.app) is production and only moves when you
# run ./deploy.sh.
#
# Commit and push happen BEFORE the upload, so a failed deploy still leaves
# the work safe on GitHub.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="frontpagelabs"

MSG="${1:-}"
if [ -z "$MSG" ]; then
  MSG="Ship $(date '+%Y-%m-%d %H:%M')"
fi
./commit.sh "$MSG"
echo ""

echo "Building…"
npm run build

# Cloudflare reads _headers from the publish root and does not serve the file
# itself. These mirror the [[headers]] blocks in netlify.toml so the two hosts
# behave the same.
#
# The noindex is not optional here: frontpagelabs.com is still on Webflow, and
# a third indexable copy of the same site is a duplicate-content problem.
# DELETE the X-Robots-Tag block when the real domain is pointed at a host.
cat > dist/_headers <<'HDR'
/*
  X-Robots-Tag: noindex, nofollow
  X-Frame-Options: SAMEORIGIN
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=604800
HDR

# Without a 404.html, Pages serves index.html with a 200 for every unmatched
# path, so a typo'd URL silently looks like the home page. Astro builds one at
# dist/404.html only if src/pages/404.astro exists; warn rather than guess.
if [ ! -f dist/404.html ]; then
  echo "Note: no dist/404.html — unmatched paths will fall back to the home page."
fi

# functions/ sits at the repo root and carries the /api/lead endpoint, the
# Cloudflare twin of netlify/functions/submit-lead.mjs. Wrangler picks it up
# from the working directory, which is why this runs from the repo root.
ok=0
for attempt in 1 2 3; do
  if wrangler pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true; then
    ok=1; break
  fi
  echo ""
  echo "Upload failed (attempt $attempt/3) — retrying; already-uploaded files are skipped."
  sleep 3
done

if [ "$ok" -ne 1 ]; then
  echo ""
  echo "Cloudflare upload failed 3 times. Your work IS committed and pushed to"
  echo "GitHub — nothing is lost. Re-run ./ship.sh; it resumes from what landed."
  exit 1
fi

echo ""
echo "Shipped free to https://frontpagelabs.pages.dev"
echo "Netlify (https://frontpagelabs.netlify.app) is UNCHANGED — ./deploy.sh moves that."
