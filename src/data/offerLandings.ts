// Offer landing pages — the ad destinations at /offers/<slug>.
//
// This is the SECOND landing-page template, deliberately separate from
// src/data/serviceLandings.ts rather than a variant flag on it. The two have
// different jobs and will drift apart as they get tuned:
//
//   /services/<slug>  hero → work → testimonials → form
//                     A capability pitch. The form is the last thing.
//
//   /offers/<slug>    offer + form → stats → work → testimonials → close
//                     A priced package. The form is above the fold, and the
//                     page exists to fill it in.
//
// Keeping them apart means tuning one can never regress the other.
//
// TO ADD ANOTHER OFFER
// --------------------
// Add an entry below. The page builds itself — there is no route to write.

import { projects, type Project } from './projects';
import { testimonials, type Testimonial } from './testimonials';
import { slugOf } from './caseStudies';

export interface OfferInclusion {
  title: string;
  body: string;
}

export interface OfferStat {
  /** The number itself. Keep it exact — these are claims. */
  value: string;
  label: string;
}

export interface OfferLanding {
  slug: string;
  metaTitle?: string;
  metaDescription: string;
  /** Ad destinations stay out of the index by default. */
  indexable?: boolean;

  /* Hero + offer */
  eyebrow: string;
  headline: string;
  subhead: string;
  price: string;
  priceNote: string;
  includes: OfferInclusion[];

  /* Form (sits in the hero) */
  formHeading: string;
  formNote: string;
  formButtonLabel: string;

  /* CTA mode — when set, the hero form card is replaced by an offer visual
     plus a button routing to this URL, and the close CTA points there too.
     Exists because some offers convert on a page of their own (a funnel step),
     not on an in-hero form. Leave unset to keep the standard Netlify form. */
  ctaHref?: string;
  /** Button label for CTA mode. Falls back to formButtonLabel. */
  ctaLabel?: string;

  /* Stats */
  statsHeading: string;
  stats: OfferStat[];

  /* Work */
  workHeading: string;
  projectSlugs: string[];

  /* Testimonials */
  proofHeading: string;
  proofCount: number;

  /* Close */
  closeHeading: string;
  closeBody: string;
  closeCtaLabel: string;
}

type OfferInput = Pick<OfferLanding, 'slug' | 'headline' | 'price'> & Partial<OfferLanding>;

const DEFAULTS = {
  metaDescription: 'A complete website and a live ad campaign, for one flat price.',
  indexable: false,
  eyebrow: 'FrontPage Labs',
  subhead: '',
  priceNote: 'one time, everything included',
  includes: [],
  formHeading: 'Start your build',
  formNote: 'No obligation. We will come back with a timeline and next steps.',
  formButtonLabel: 'Get started',
  statsHeading: 'The numbers behind the work',
  stats: [],
  workHeading: 'Recent work',
  projectSlugs: [],
  proofHeading: 'What clients say',
  proofCount: 3,
  closeHeading: 'Ready to build?',
  closeBody: 'Tell us about your business and we will get started.',
  closeCtaLabel: 'Get started',
} as const;

function build(input: OfferInput): OfferLanding {
  return { ...DEFAULTS, ...input } as OfferLanding;
}

export const offerLandings: OfferLanding[] = [
  build({
    slug: 'website-and-ads',
    metaTitle: 'Website + Ad Campaign — $1,400',
    metaDescription:
      'A complete website, three months of maintenance, and a live ad campaign on Google or social. One flat price of $1,400.',

    eyebrow: 'Website + ad campaign',
    headline: 'Everything you need to be found online.',
    subhead:
      'A complete website, three months of us keeping it running, and a live ad campaign pointed at it. One price, one team, no retainer to negotiate.',
    price: '$1,400',
    priceNote: 'one time, all three included',

    includes: [
      {
        title: 'A website, built start to finish',
        body: 'Design, copy layout, build and launch. Yours to keep, on your own domain.',
      },
      {
        title: 'Three months of maintenance',
        body: 'Updates, fixes and content changes handled for you while the site settles in.',
      },
      {
        title: 'An ad campaign, live',
        body: 'Google Search or paid social, your pick. We build the campaign, the creative and the landing page it points at.',
      },
    ],

    formHeading: 'Start your build',
    formNote:
      'No obligation. Send this over and we will come back with a timeline, what we need from you, and a start date.',
    formButtonLabel: 'Start my build',

    // Every figure here is taken from what the site already publishes on
    // /services and the home hero. Do not round them up.
    statsHeading: 'The numbers behind the work',
    stats: [
      { value: '23,490', label: 'Conversions driven through ads' },
      { value: '1,264', label: 'Webpages designed and published' },
      { value: '80+', label: 'Clients scaled' },
      { value: '306%', label: 'Average revenue increase across clients' },
    ],

    workHeading: 'Sites we have launched',
    projectSlugs: ['ak', 'seth-taylor-fitness', 'therapy-provider', 'verona-residences'],

    proofHeading: 'What clients say',

    closeHeading: 'One price. Everything running.',
    closeBody:
      'Website built, maintained for three months, and an ad campaign driving people to it. Tell us about your business and we will get started.',
    closeCtaLabel: 'Start my build',
  }),

  build({
    slug: 'website-audit',
    metaTitle: 'Website Audit — $47',
    metaDescription:
      'A 30-minute website audit call. We review your site before the call, then walk you through what to fix, page by page. $47 flat.',

    eyebrow: 'Website audit',
    headline: 'Find out what your website is costing you.',
    subhead:
      'We review your site before the call — every page, desktop and phone. Then we get on a 30-minute call and walk you through what we found, what to fix first, and why.',
    price: '$47',
    priceNote: 'one time, for the full review and call',

    includes: [
      {
        title: 'A real review, before the call',
        body: 'We go through your website the way a customer would — every page, on desktop and on a phone.',
      },
      {
        title: 'A 30-minute walkthrough call',
        body: 'Screen shared, your site up. What is working, what is losing you visitors, and why — in plain language.',
      },
      {
        title: 'A prioritized fix list',
        body: 'You leave knowing what to fix first and what can wait — useful whoever ends up doing the fixing.',
      },
    ],

    // CTA mode — this offer converts on the questionnaire page, not a form.
    ctaHref: '/offers/website-audit/start',
    ctaLabel: 'Start my audit',
    formHeading: 'Book your audit',
    formNote: 'Five quick questions, then you pick a time. About two minutes.',
    formButtonLabel: 'Start my audit',

    // Same figures the site already publishes on /services and the home hero.
    statsHeading: 'The numbers behind the work',
    stats: [
      { value: '23,490', label: 'Conversions driven through ads' },
      { value: '1,264', label: 'Webpages designed and published' },
      { value: '80+', label: 'Clients scaled' },
      { value: '306%', label: 'Average revenue increase across clients' },
    ],

    workHeading: 'Sites we have launched',
    projectSlugs: ['ak', 'seth-taylor-fitness', 'therapy-provider', 'verona-residences'],

    proofHeading: 'What clients say',

    closeHeading: 'Thirty minutes. Everything on the table.',
    closeBody:
      'Bring your website. We bring what we found. You leave with a clear list of what to fix and in what order. And if we ever build something together down the road, the $47 comes off that bill.',
    closeCtaLabel: 'Book my audit',
  }),
];

export const offerLandingBySlug = (slug: string) => offerLandings.find((o) => o.slug === slug);

export function offerProjects(landing: OfferLanding): Project[] {
  if (!landing.projectSlugs.length) return projects.slice(0, 4);
  return landing.projectSlugs
    .map((slug) => projects.find((p) => slugOf(p) === slug))
    .filter((p): p is Project => Boolean(p));
}

export function offerTestimonials(landing: OfferLanding): Testimonial[] {
  return testimonials.slice(0, landing.proofCount);
}
