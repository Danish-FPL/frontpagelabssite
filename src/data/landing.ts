// Landing pages, resolved from the Hero Lab's variant file.
//
// `hero-lab/data/variants.json` is the single source of truth. Variant A is
// the locked home-page baseline and never becomes a page; every other variant
// with a slug becomes `/lp/<slug>`, rendered by `src/pages/lp/[slug].astro`.
//
// A variant stores only what it changes — `null` means "inherit". Hero fields
// inherit from `homeHero`, offer fields from `offerDefaults` below (the home
// page has no offer block, so there is nothing to inherit from there).
//
// Adding a landing page = adding a variant in the lab and hitting Save. There
// is no separate publish step: this file reads the same JSON the lab writes.

import variantsFile from '../../hero-lab/data/variants.json';
import defaultsFile from '../../hero-lab/data/defaults.json';
import { homeHero, type HeroFields } from './hero';
import { projects, type Project } from './projects';

export interface OfferFields {
  offerEyebrow: string;
  /** Section heading. A newline renders as a line break. */
  offerHeading: string;
  offerBody: string;
  /** Shown big. Empty string hides the price block entirely. */
  price: string;
  priceNote: string;
  includes: string[];
  showcaseEyebrow: string;
  /** Project titles from `projects.ts`. Unknown titles are dropped. */
  showcase: string[];
  finalCtaText: string;
}

export interface PageMeta {
  title: string;
  /** `metaDescription`, not `description` — a variant's `description` is the
   *  note to yourself about why the page exists. */
  metaDescription: string;
  /** Ad landing pages default to noindex — flip per page in the lab. */
  indexable: boolean;
}

export interface Variant extends Partial<HeroFields>, Partial<OfferFields>, Partial<PageMeta> {
  id: string;
  name: string;
  slug: string;
  locked?: boolean;
  description?: string;
  slugAuto?: boolean;
}

export interface LandingPage extends HeroFields, OfferFields, PageMeta {
  id: string;
  slug: string;
  name: string;
  description: string;
  showcaseProjects: Project[];
}

// Kept in hero-lab/data/defaults.json rather than here so the lab can read
// the same values at runtime — a landing page's offer block has no home-page
// equivalent to inherit from, and two copies of these strings would drift.
export const offerDefaults = defaultsFile.offer as OfferFields;
export const metaDefaults = defaultsFile.meta as PageMeta;

const variants = (variantsFile.variants ?? []) as Variant[];

/** variant field ?? baseline field — the same rule the lab previews with. */
function fill<T extends object>(variant: Variant, base: T): T {
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof T)[]) {
    const value = (variant as Record<string, unknown>)[key as string];
    if (value !== null && value !== undefined) out[key] = value as T[keyof T];
  }
  return out;
}

const byTitle = new Map(projects.map((p) => [p.title, p]));

export function resolveVariant(variant: Variant): LandingPage {
  const offer = fill(variant, offerDefaults);
  return {
    id: variant.id,
    slug: variant.slug,
    name: variant.name,
    description: variant.description ?? '',
    ...fill(variant, homeHero),
    ...offer,
    ...fill(variant, metaDefaults),
    showcaseProjects: offer.showcase.map((t) => byTitle.get(t)).filter((p): p is Project => Boolean(p)),
  };
}

/** Every variant that is a real page: unlocked and slugged. */
export const landingPages: LandingPage[] = variants
  .filter((v) => !v.locked && v.slug)
  .map(resolveVariant);
