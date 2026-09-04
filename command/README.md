# Growth Command, hosted

The internal board, reachable from a phone: **https://frontpagelabs-command.pages.dev**

Sign in with the `FPL_DASH_PIN` secret set on the Cloudflare project. Deploy
with `./ship-command.sh` from the repo root. It is free, like `./ship.sh`.

## Why this is a second Pages project

The marketing site and this board are separate Cloudflare projects on purpose:

| project | URL | deployed by |
| --- | --- | --- |
| `frontpagelabs` | https://frontpagelabs.pages.dev | `./ship.sh` |
| `frontpagelabs-command` | https://frontpagelabs-command.pages.dev | `./ship-command.sh` |

Separate origins mean the board cannot surface on the public site through a
stray route, a shared cookie or a caching rule. It also lets this copy keep the
same URL shape as the laptop server (`/`, `/login`, `/api/*`), so
`dashboard/public/*.html` is copied over byte-for-byte rather than forked and
kept in sync by hand.

## What is live, and what is not

The hosted copy is a **read-only snapshot**, rebuilt each time you deploy.
`build.mjs` runs the dashboard's own library code on the laptop and freezes the
resulting payload into a module the Worker hands straight back. Running the
real `shape()`, `buildToday()` and `SEQUENCES` rather than reimplementing them
is what keeps the payload matching a front end that is still being worked on.

Live: the whole board UI, the sample CRM records, and the real site-audit log.

Not live, deliberately:

- **Airtable.** Real prospects stay on the laptop. Publishing a prospect list
  is a decision to make on purpose, not a side effect of wanting the board on a
  phone. Nothing here holds an Airtable key.
- **Claude drafting and research.** These spend money per call and hold batch
  job state in memory. Cloudflare spreads requests across isolates, so the job
  state would not survive anyway, and an endpoint that bills you does not
  belong on a public address.
- **Writes.** Stage changes, touches and notes go through the laptop.

The header badges say `Local file` and `Drafting off` on this copy, which is
the truth about it.

## Security

A four-digit PIN is fine on a laptop behind a LAN and is not fine on an
address anyone can reach. So, compared with `dashboard/server.mjs`:

- **No default secret.** The laptop falls back to `2468` to stay runnable out
  of the box. Here, a missing, too-short, or still-`2468` `FPL_DASH_PIN` takes
  the entire project to a 503. A public board with a known password is worse
  than no board.
- **PBKDF2, 100,000 iterations** over the submitted PIN, so each guess costs
  real work instead of a string compare. That is the ceiling the Workers
  runtime allows; asking for more throws at request time, and
  `wrangler pages dev` does not enforce the cap, so it only shows up once
  deployed. Do not raise it.
- **Tokens expire.** The cookie carries its own expiry and dies on a clock,
  rather than living until the PIN changes.
- `noindex`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and
  `Cache-Control: no-store` on everything.

Rotate the passphrase with:

```
wrangler pages secret put FPL_DASH_PIN --project-name frontpagelabs-command
```

Rotating it invalidates every outstanding cookie, which is the intended
behaviour.

## Layout

```
command/
  build.mjs            assembles .command-build/ (gitignored)
  shared/auth.js       PBKDF2 + HMAC cookie, shared by the functions
  functions/
    _middleware.js     the gate: 503 on a bad secret, redirect when signed out
    api/login.js       POST, sets the cookie
    api/logout.js      POST, clears it
    api/staff.js       pre-auth, fills the name field on the login page
    api/data.js        the frozen board payload
```

`shared/` sits outside `functions/` so Pages does not route it; esbuild bundles
it at deploy time.
