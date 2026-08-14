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

## Not yet ported

- Scroll-triggered entrance animations and the horizontal scroll sections.
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
