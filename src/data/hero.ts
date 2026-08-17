// The hero contract shared by the home page and every landing page.
//
// `homeHero` below is the live home page hero — it is also the Hero Lab's
// locked baseline (variant A). A landing-page variant stores only the fields
// it changes; every `null` falls back to the value here. That is why the
// home hero and the landing template render from the SAME component
// (`src/components/LandingHero.astro`): the lab has one DOM contract to read
// and write, so a variant previewed on the home page shell looks the same as
// the page it eventually becomes.
//
// Editing this file changes the home page AND the fallback for every landing
// page that has not overridden the field.

export interface HeroListItem {
  label: string;
  number: string;
}

export interface HeroFields {
  /** Display type, line 1 and line 2. Copy-field markdown is allowed. */
  headlineTop: string;
  headlineBottom: string;
  /** 'split' pushes line 2 to the right edge (the home treatment). */
  headlineAlign: 'split' | 'left';
  eyebrow: string;
  /** The numbered index under the eyebrow. Any length. */
  listItems: HeroListItem[];
  /** Proof lines in the middle column. Copy-field markdown is allowed. */
  statLines: string[];
  /** The dimmed line under the stats. */
  kicker: string;
  ctaText: string;
  ctaLabel: string;
  ctaHref: string;
  /** 'video' plays the FPL loop; 'image' shows `mediaPoster` as a still. */
  mediaMode: 'video' | 'image';
  mediaPoster: string;

  /* Style overrides. `null` = use the stylesheet, which is what the home
     page does for all of them. Only a landing page that needs to deviate
     should carry numbers here. */
  hlSize: number | null;
  hlLineHeight: number | null;
  hlTracking: number | null;
  statSize: number | null;
  overlayTop: number | null;
  overlayBottom: number | null;
  minHeight: number | null;
}

export const homeHero: HeroFields = {
  headlineTop: 'Frontpage',
  headlineBottom: 'labs',
  headlineAlign: 'split',
  eyebrow: 'What we do',
  listItems: [
    { label: 'Websites', number: '01' },
    { label: 'Marketing Channels', number: '02' },
    { label: 'Ads', number: '03' },
    { label: 'Strategy', number: '04' },
  ],
  statLines: [
    '**80+ clients** scaled.',
    '**23K+ conversions** generated.',
    '**306% average revenue increase** across clients.',
  ],
  kicker: "Here, it's **Digital Performance, Down to a Science**.",
  ctaText: 'Ready for the ~FrontPage?~',
  ctaLabel: 'Get Started',
  ctaHref: '/contact',
  // The live site's hero still: the laptop shot the display type blends
  // against. This is the landscape crop the Webflow CDN served, already in
  // /public/assets — the 4000×6000 original is the same photo uncropped and
  // would frame far too tight in a wide hero.
  mediaMode: 'image',
  mediaPoster: '/assets/pexels-ceesz-284432587-13073603.jpg',

  hlSize: null,
  hlLineHeight: null,
  hlTracking: null,
  statSize: null,
  overlayTop: null,
  overlayBottom: null,
  minHeight: null,
};

/** Keys the Hero Lab may override on a variant. */
export const HERO_KEYS = Object.keys(homeHero) as (keyof HeroFields)[];
