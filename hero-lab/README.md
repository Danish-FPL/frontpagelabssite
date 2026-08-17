# Hero Lab

A local tool for building FrontPage Labs landing pages visually — headline,
proof lines, CTA, offer, price, what's-included — on the **real page**, at any
viewport, without a code round-trip per edit.

```bash
npm run hero-lab        # → http://localhost:3007/
```

It starts the Astro dev server for you if it isn't already running.

## The idea

The preview is not a mock. The frame holds the actual Astro page, proxied
same-origin, and the lab writes your edits straight into its DOM. So what you
tune is what ships.

- **A is the home page** (🔒 locked) — the live hero, and the baseline every
  landing page inherits from. Edit it in `src/data/hero.ts`, not here.
- **Every other page is a landing page.** ＋ New page duplicates the one you're
  on and gives it a slug; it goes live at `/lp/<slug>` on save.
- Pages store **only what they change**. A field left alone is `null` and
  follows the home page — change the home hero and every page that never
  overrode that field follows along. The cyan dot on a section means "this
  page overrides something in here".
- **Hold ⇄ (or Space)** to flash back to the home baseline for a before/after.
- **Compare** shows every page side by side.

## Saving

**💾 Save & build** writes `data/variants.json`. That file is what
`src/data/landing.ts` reads, so saving *is* publishing — the page exists at
`/lp/<slug>` the moment the save lands, and Astro reloads the frame itself.

`data/variants.json` is tracked in git. Commit it like any other content
change:

```bash
git add hero-lab/data/variants.json && git commit -m "landing: <what changed>"
```

`data/defaults.json` holds the fallbacks for fields the home page has no
equivalent for (the offer block, meta tags). Both the lab and the Astro build
read it, so the preview and the built page can't disagree.

## Copy formatting

Copy fields take a small markdown subset, rendered identically by the lab and
by the build (`src/data/rich.ts`):

| You type | You get |
| --- | --- |
| `**80+ clients**` | bold |
| `*carefully*` | italic |
| `~FrontPage?~` | the cyan brand accent |

Select words and hit **B** / **I** / **◆** rather than typing the markers.

## Guardrails

The panel measures the real rendered layout as you type and warns when:

- a headline line overflows the viewport or wraps (the display type is 14vw —
  about nine characters per line)
- the CTA falls below the fold at the current viewport
- there are more than three proof lines, or a line runs long
- the page has no price, so the price block is hidden

## Phone preview

The server binds `0.0.0.0` and prints a LAN URL. After saving, open
`http://<that-ip>:3007/preview/<page-id>` on a phone on the same Wi-Fi for a
real-Safari render with a pill switcher between pages.

## Screenshots

📸 renders the current viewport to `exports/` (gitignored). It needs
puppeteer, which this repo does not install — `npm i -D puppeteer` if you want
it, otherwise the button reports that and nothing else breaks.

## What the lab is allowed to touch

Hero, offer block, showcase picks, closing line, and page meta. The proof
section (testimonials) and the site chrome are template-level and live in
code — `src/pages/lp/[slug].astro`.

The `data-fpl-*` attributes in `src/components/LandingHero.astro` and
`src/pages/lp/[slug].astro` are the contract this tool reads and writes
through. Rename one and the lab stops seeing that field.

## Isolation

`hero-lab/` sits outside `src/` and `public/`, so Astro never serves it and it
can't be published with the site. It is local-only tooling, same as
`dashboard/`.

Nothing here was copied out of the Chicagoland Auto Fair repo and that repo was
not modified. The idea — a locked live baseline, delta-only variants, a real
page in the frame — is the same, because it works; the code, the field set and
the publish path are this project's.
