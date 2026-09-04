## Release workflow — two hosts, one of them free

The site is served from two places on purpose. Cloudflare Pages
(https://frontpagelabs.pages.dev) is the free everyday preview; Netlify
(https://frontpagelabs.netlify.app) is the paid production host. Netlify
auto-builds from GitHub are STOPPED (`stop_builds` on site `frontpagelabs`), so
GitHub is storage and every deploy is explicit. See
`.claude/skills/ship/SKILL.md`.

- `./commit.sh "msg"` — stage, commit, push to main. Free, never deploys.
- `./ship.sh ["msg"]` — commit + push + `npm run build` +
  `wrangler pages deploy dist`. FREE and unlimited; this is the everyday
  command and the right answer to "let me see it".
- `./deploy.sh` — `npm run build` + `netlify deploy --prod --dir dist`. Spends
  credits; prompts first (`-y` to skip). Never run unless explicitly asked.

`/api/lead` exists twice on purpose: `netlify/functions/submit-lead.mjs` for
Netlify and `functions/api/lead.js` for Cloudflare. They are twins and differ
only in how each runtime passes env vars. Change one and change the other.

## The internal board is a THIRD deployment

`./ship-command.sh` publishes `dashboard/` to its own Cloudflare project at
https://frontpagelabs-command.pages.dev — separate from the marketing site so
the two can never bleed into each other. It is free. What ships is a read-only
snapshot built by `command/build.mjs`, which runs the dashboard's own library
code on the laptop and freezes the payload; Airtable, Claude drafting and all
writes stay local, and no key reaches the edge. Auth there has no default
secret and 503s the project if `FPL_DASH_PIN` is unset. See
`command/README.md`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Landing pages and the Hero Lab

`/lp/*` landing pages are content, not code. They render from
`hero-lab/data/variants.json` through `src/data/landing.ts` and the single
template `src/pages/lp/[slug].astro`. To add or change one, prefer
`npm run hero-lab` (see [hero-lab/README.md](hero-lab/README.md)) over editing
the JSON by hand.

Two contracts to respect when touching hero or landing markup:

- The `data-fpl-*` attributes in `src/components/LandingHero.astro` and
  `src/pages/lp/[slug].astro` are how the lab reads and writes the page.
  Keep them, including the hidden `[data-fpl-template]` clone sources (Astro
  scopes styles per component, so the lab grows lists by cloning real nodes)
  and `[data-fpl-mirror]` on the headline's back face — the flip panel holds
  each headline twice and the lab writes to both.
- The copy markdown subset (`**bold**`, `*italic*`, `~cyan~`) is implemented
  twice on purpose: `src/data/rich.ts` for the build, `hero-lab/injector.js`
  for the live preview. A marker added to one must be added to the other.

The home hero lives in `src/data/hero.ts` and is the baseline every landing
page inherits from — changing it changes every page that hasn't overridden
that field.

## Lead forms → Airtable

Every form on the site (audit questionnaire, offer landings, service
landings, `/contact`) posts JSON to `/api/lead`, served by
`netlify/functions/submit-lead.mjs`, which writes one row per lead to an
Airtable "Leads" table with a `Source` column. Netlify Forms is NOT used —
don't add `data-netlify` to anything.

- The classic forms are wired by the shared `src/scripts/lead-form.js`
  (intercept submit → POST → button becomes the success state). The audit
  questionnaire posts fire-and-forget from its own state machine because the
  Calendly reveal must never wait on the write.
- Field-name → Airtable-column mapping lives in ONE place: the `COLUMNS` map
  in `submit-lead.mjs`. A new form field needs an entry there and a matching
  column in Airtable; unknown fields are silently dropped.
- Env vars: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_LEADS_TABLE`
  (see `.env.example`; set them in the Netlify dashboard for production).
  **Until they're set, the endpoint runs in placeholder mode** — visitors see
  success, the function logs the lead, nothing is stored.
- Functions don't run under `astro dev` — use `netlify dev` (or deploy) to
  exercise `/api/lead` for real; under `astro dev` the POST 404s and the
  forms' error path shows.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
