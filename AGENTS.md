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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
