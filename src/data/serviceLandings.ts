// Service landing pages — the ad destinations at /services/<slug>.
//
// WHY THESE ARE NOT /lp/* PAGES
// -----------------------------
// `/lp/*` is the Hero Lab's territory: its shape is hero → offer → showcase →
// proof → close, and its fields are the locked hero schema the lab reads and
// writes. These pages are a different, simpler shape (hero → work →
// testimonials → form) and carry a form the lab has no concept of, so they get
// their own route and their own data rather than distorting that one.
//
// TO ADD ANOTHER SERVICE
// ----------------------
// Add an entry to `serviceLandings` below. The page builds itself — there is no
// route to write. Everything except `slug`, `headline` and `formHeading` has a
// sensible default, so a new service can start as a few lines and grow.

import { projects, type Project } from './projects';
import { testimonials, type Testimonial } from './testimonials';
import { slugOf } from './caseStudies';

export interface ServiceLanding {
  /** URL segment: 'service-sites' → /services/service-sites */
  slug: string;
  /** <title>. Falls back to the headline. */
  metaTitle?: string;
  metaDescription: string;
  /**
   * Ad destinations are noindex by default so they can't compete with
   * /services in search or get picked up as duplicate content.
   */
  indexable?: boolean;

  /* Hero */
  eyebrow: string;
  headline: string;
  subhead: string;
  /** Short proof points under the subhead. */
  points: string[];
  ctaLabel: string;

  /* Work */
  workEyebrow: string;
  workHeading: string;
  /** Project slugs (as in projects.ts hrefs). Empty = the first four. */
  projectSlugs: string[];

  /* Testimonials */
  proofHeading: string;
  /** How many quotes to show, from the top of testimonials.ts. */
  proofCount: number;

  /* Form */
  formEyebrow: string;
  formHeading: string;
  formIntro: string;
  formButtonLabel: string;
}

type ServiceLandingInput = Pick<ServiceLanding, 'slug' | 'headline' | 'formHeading'> &
  Partial<ServiceLanding>;

const DEFAULTS = {
  metaDescription: 'FrontPage Labs builds websites that turn visitors into customers.',
  indexable: false,
  eyebrow: 'FrontPage Labs',
  subhead: '',
  points: [],
  ctaLabel: 'Get a quote',
  workEyebrow: 'Recent work',
  workHeading: 'Work that worked',
  projectSlugs: [],
  proofHeading: 'What clients say',
  proofCount: 3,
  formEyebrow: 'Get started',
  formIntro: 'Tell us about your business and we will come back with a plan and a price.',
  formButtonLabel: 'Send message',
} as const;

function build(input: ServiceLandingInput): ServiceLanding {
  return { ...DEFAULTS, ...input } as ServiceLanding;
}

export const serviceLandings: ServiceLanding[] = [
  build({
    slug: 'service-sites',
    metaTitle: 'Websites for Service Businesses',
    metaDescription:
      'FrontPage Labs designs and builds websites for service businesses. Clear, fast, and built to turn visitors into booked work.',
    eyebrow: 'Websites for service businesses',
    headline: 'A website that books the work.',
    subhead:
      'Most service businesses lose the job before the first call, on a site that is slow, unclear, or years out of date. We build the version that closes.',
    points: [
      'Built to convert, not just to look good',
      'Live in weeks, not months',
      'Sites starting at $900',
    ],
    ctaLabel: 'Get a quote',
    workHeading: 'Sites we have built',
    projectSlugs: ['ak', 'therapy-provider', 'massage', 'mosaic-therapy-miami'],
    proofHeading: 'What clients say',
    formHeading: 'Tell us about your business.',
    formIntro:
      'Send over what you do and where you want to be, and we will come back with a plan and a price. No obligation.',
  }),
];

export const serviceLandingBySlug = (slug: string) =>
  serviceLandings.find((s) => s.slug === slug);

/** The project cards a landing page shows. */
export function landingProjects(landing: ServiceLanding): Project[] {
  if (!landing.projectSlugs.length) return projects.slice(0, 4);
  return landing.projectSlugs
    .map((slug) => projects.find((p) => slugOf(p) === slug))
    .filter((p): p is Project => Boolean(p));
}

/** The quotes a landing page shows. */
export function landingTestimonials(landing: ServiceLanding): Testimonial[] {
  return testimonials.slice(0, landing.proofCount);
}
