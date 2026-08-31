---
name: ship
description: How this site saves work and deploys. Push/commit never deploys; deploying is a separate explicit step.
---

# Release workflow

Netlify auto-builds from GitHub are **stopped** for this site (`stop_builds: true`
on site `frontpagelabs`, id `507edb9e-f40e-4982-9d1c-06f291b5196d`). GitHub is
storage; the CLI is the deploy.

| command | commit | push | deploy | cost |
|---|---|---|---|---|
| `./commit.sh "msg"` | ✓ | ✓ | — | free |
| `./ship.sh` | — | — | ✓ | credits |

- **Never deploy unless the user explicitly asks.** When they say "commit",
  "push", or "save", run `./commit.sh` only.
- `./ship.sh` runs `npm run build` and `netlify deploy --prod --dir dist` from
  the repo root (so `netlify.toml` resolves and `netlify/functions` deploy).
  It prompts before spending credits; `-y` skips the prompt and is required
  when stdin is not a terminal.
- `commit.sh` refuses to push from any branch but `main`, and refuses if
  `.env` is ever tracked.
- Deploy only from `dist/` — never `--dir .`.
