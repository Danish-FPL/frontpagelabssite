---
name: ship
description: How this site saves work and deploys. Two hosts — Cloudflare Pages is the free everyday preview, Netlify is the paid production host. Push never deploys.
---

# Release workflow

This site is served from two places on purpose:

| host | URL | moved by | cost |
|---|---|---|---|
| Cloudflare Pages | https://frontpagelabs.pages.dev | `./ship.sh` | free |
| Netlify (production) | https://frontpagelabs.netlify.app | `./deploy.sh` | credits |

Netlify auto-builds from GitHub are **stopped** (`stop_builds: true` on site
`frontpagelabs`, id `507edb9e-f40e-4982-9d1c-06f291b5196d`). GitHub is storage;
the CLI is the deploy.

| command | commit | push | deploys to | cost |
|---|---|---|---|---|
| `./commit.sh "msg"` | ✓ | ✓ | — | free |
| `./ship.sh ["msg"]` | ✓ | ✓ | Cloudflare (marketing) | free |
| `./ship-command.sh` | — | — | Cloudflare (internal board) | free |
| `./deploy.sh` | — | — | Netlify | credits |

- **Never run `./deploy.sh` unless the user explicitly asks.** It is the only
  command that spends money. It prompts first; `-y` skips the prompt and is
  required when stdin is not a terminal.
- `./ship.sh` is free and unlimited, so it is the right answer to "let me see
  it" or "put it up for me to look at". It commits and pushes BEFORE uploading,
  so a failed deploy still leaves the work on GitHub, and it retries the upload
  three times because this Mac's uplink drops.
- Both hosts serve `/api/lead`. Netlify runs `netlify/functions/submit-lead.mjs`;
  Cloudflare runs `functions/api/lead.js`. They are deliberate twins and differ
  only in how the runtime passes environment variables (`process.env` vs an
  `env` argument). **Change one and change the other**, or the preview's forms
  stop matching production's.
- Cloudflare secrets are set on the Pages project, not in the repo:
  `wrangler pages secret put AIRTABLE_API_KEY --project-name frontpagelabs`
  (same for `AIRTABLE_BASE_ID` and `AIRTABLE_LEADS_TABLE`). All three are set.
- `ship.sh` writes `dist/_headers` at deploy time to mirror the `[[headers]]`
  blocks in `netlify.toml`, including the `noindex` both previews need while
  frontpagelabs.com is still on Webflow.
- `commit.sh` refuses to push from any branch but `main`, and refuses if
  `.env` is ever tracked.
- Deploy only from `dist/` — never `--dir .`.
- `./ship-command.sh` publishes the internal board to a SEPARATE Pages project,
  `frontpagelabs-command`. It is free. It ships a read-only snapshot built by
  `command/build.mjs`; Airtable, drafting and writes stay on the laptop, and no
  credential reaches the edge. It refuses to deploy when `FPL_DASH_PIN` is
  unset on that project. Read `command/README.md` before changing any of it,
  especially the PBKDF2 iteration count, which is pinned at the Workers
  maximum.
