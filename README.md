# FrontPage Labs — Site

An Astro rebuild of frontpagelabs.com, replacing the current Webflow site.

## Why this exists

The live site is built in Webflow. This repo is the code-owned replacement: same
design, same copy, same assets — but versioned, editable, and free of Webflow's
publishing model.

## Fidelity approach

The rebuild was derived from the **published Webflow HTML and stylesheet**, not
from eyeballing screenshots:

- `src/styles/global.css` holds design tokens (colors, the viewport-relative
  type scale, spacing, breakpoints) copied verbatim from the Webflow stylesheet.
  The oversized `vw`-based display type is what gives the site its character —
  those values are deliberate, not arbitrary.
- `public/assets/` holds every image, icon, font and video pulled from the
  Webflow CDN, with filenames slugified from the originals.
- `src/data/projects.ts` transcribes the Webflow CMS portfolio collection (30
  projects) so `/portfolio` and the featured grids stay in sync from one source.

## Pages

| Route        | Source page              |
| ------------ | ------------------------ |
| `/`          | Home                     |
| `/about`     | Meet FrontPage Labs      |
| `/services`  | Services & Capabilities  |
| `/portfolio` | Selected Work            |
| `/contact`   | Contact                  |

### Landing pages (`/lp/*`)

Marketing landing pages for the services, built and edited in the
[Hero Lab](hero-lab/README.md) rather than by hand. One template
(`src/pages/lp/[slug].astro`) renders every one of them from
`hero-lab/data/variants.json`, so adding a page is adding an entry there —
there is no route to write.

| Route                    | Offer                                  |
| ------------------------ | -------------------------------------- |
| `/lp/four-websites`      | Four websites                          |
| `/lp/four-ads`           | Four ads                               |
| `/lp/landing-page-and-ad`| Landing page + ad design, $500         |

They share the home page's hero component and inherit its copy field by field,
so a landing page only carries what it actually changes. All three are
`noindex` by default (they're ad destinations, not search pages) — there's a
toggle per page in the lab.

## Hero motion

The hero headline reproduces the live site's two effects, both measured off
frontpagelabs.com rather than eyeballed:

- **Entrance flip** — each line is a two-faced panel that rotates down into
  place (front face out, back face in, 900ms, line 2 trailing line 1 by
  350ms) while fading in. Pure CSS, in `src/components/LandingHero.astro`.
- **Scroll split** — line 1 slides left and line 2 slides right, reaching
  ±18% of their own width after one viewport of scroll, then holding. Scroll
  back up and they merge. ~20 lines of JS in the same component.

Both are disabled under `prefers-reduced-motion`, which renders the finished
layout immediately.

The headline's colour shift over the laptop screen is `mix-blend-mode:
difference` against the photo — white type stays white over the black areas
and inverts to cyan and green over the bright screen. It has to sit on
`.heading-word` (the element that carries the transforms), because a
transform makes an element an isolated group and a blend applied inside it
would have nothing to blend against.

## Not yet ported

- The horizontal scroll sections.
- Individual `/projects/<slug>` case-study pages (the portfolio grid links to
  them, but the routes don't exist yet).
- Form submission wiring — `/contact` is marked `data-netlify="true"` but has no
  backend attached.

## Commands

| Command           | Action                                      |
| ----------------- | ------------------------------------------- |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Dev server at `http://localhost:4321`       |
| `npm run build`   | Production build to `./dist/`               |
| `npm run preview` | Preview the production build locally        |
| `npm run hero-lab`| Landing-page builder at `http://localhost:3007` |
| `npm run dashboard` | Growth Command at `http://localhost:4787`  |
