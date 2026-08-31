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

export interface PricingPlan {
  /** 'Monthly' | 'One-Time' | 'Flat Fee' … */
  name: string;
  /** '$40' — the big number. */
  price: string;
  /** '/month' — rendered small next to the price. */
  cadence?: string;
  /** '+ $250 initiation fee' — the fine print under the price. */
  note?: string;
  features: string[];
  /** Highlighted card. */
  featured?: boolean;
}

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

  /* Pricing — section renders only when `plans` is non-empty. */
  pricingHeading: string;
  pricingIntro: string;
  plans: PricingPlan[];

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
  pricingHeading: 'Simple pricing',
  pricingIntro: 'Two ways to work with us — pick the one that fits your cash flow.',
  plans: [],
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

  // The five click-through landing pages linked from /services ("Start
  // Building …") — hero → work → testimonials → pricing → form.
  //
  // ⚠ PRELIMINARY PRICING: the Websites numbers ($40/mo, $1,899 + $250
  // initiation) and the $500 landing-page offer are the figures Danish set on
  // 2026-08-31. Channels / Advertising / Strategy ship as "Custom" cards
  // until real numbers exist — replace them here when pricing is decided.
  build({
    slug: 'websites',
    metaTitle: 'Start Building A Website',
    metaDescription:
      'FrontPage Labs designs and builds websites that turn visitors into customers. Monthly plans from $40/month or a one-time build.',
    eyebrow: 'Websites',
    headline: 'Start building your website.',
    subhead:
      'Your website is your digital handshake. We design and build sites that communicate your purpose clearly, load fast, and turn visitors into booked work.',
    points: [
      'Built to convert, not just to look good',
      'Live in weeks, not months',
      'Plans from $40/month',
    ],
    ctaLabel: 'Get started',
    workHeading: 'Work that worked',
    projectSlugs: ['ak', 'therapy-provider', 'massage', 'mosaic-therapy-miami'],
    pricingIntro:
      'Two ways to get your website built — a flat monthly rate that covers everything, or own it outright with a one-time build.',
    plans: [
      {
        name: 'Monthly',
        price: '$40',
        cadence: '/month',
        note: 'No large upfront cost.',
        features: [
          'Custom design & build',
          'Hosting & domain management',
          'Ongoing edits & updates',
          'Support when you need it',
        ],
        featured: true,
      },
      {
        name: 'One-Time',
        price: '$1,899',
        note: '+ $250 initiation fee. You own the site outright.',
        features: [
          'Custom design & build',
          'Launch & full handoff',
          '30 days of post-launch support',
          'Yours to host anywhere',
        ],
      },
    ],
    formHeading: 'Tell us about your business.',
    formIntro:
      'Send over what you do and where you want to be, and we will come back with a plan and a price. No obligation.',
  }),

  build({
    slug: 'channels',
    metaTitle: 'Start Building Channels',
    metaDescription:
      'Social media, email, SMS, and search listings — one cohesive marketing system built and run by FrontPage Labs.',
    eyebrow: 'Marketing Channels',
    headline: 'Start building your channels.',
    subhead:
      'Social media, direct messaging, and search listings bridge the gap between you and your customers. We build brand-rich touchpoints along the whole path.',
    points: [
      'One consistent message, every platform',
      'Social, email, SMS, and search',
      'Built and managed for you',
    ],
    ctaLabel: 'Get started',
    workHeading: 'Work that worked',
    pricingIntro:
      'Channel systems are scoped to your platforms and posting cadence, so pricing starts with a conversation.',
    plans: [
      {
        name: 'Custom',
        price: 'Custom',
        note: 'Scoped to your platforms, cadence, and goals.',
        features: [
          'Channel audit & strategy',
          'Profiles & listings built out',
          'Content calendar & posting',
          'Monthly performance recap',
        ],
        featured: true,
      },
    ],
    formHeading: 'Tell us where your customers are.',
    formIntro:
      'Share which platforms you are on (or want to be on), and we will come back with a channel plan and a price.',
  }),

  build({
    slug: 'advertising',
    metaTitle: 'Start Building Ads',
    metaDescription:
      'Targeted ad campaigns across social and search, built to convert by FrontPage Labs.',
    eyebrow: 'Advertising',
    headline: 'Start building your ads.',
    subhead:
      'Thousands of people are searching for your services right now. We land your business gracefully in front of the right audience — and first in the results.',
    points: [
      'Social & Google ad campaigns',
      'Creative, targeting, and landing pages',
      'Managed end to end',
    ],
    ctaLabel: 'Get started',
    workHeading: 'Work that worked',
    pricingIntro:
      'Ad engagements are scoped to your budget and channels, so pricing starts with a conversation.',
    plans: [
      {
        name: 'Custom',
        price: 'Custom',
        note: 'Scoped to your ad budget and channels.',
        features: [
          'Campaign strategy & setup',
          'Creative & copy included',
          'Ongoing optimization',
          'Transparent reporting',
        ],
        featured: true,
      },
    ],
    formHeading: 'Tell us who you want to reach.',
    formIntro:
      'Share your services and rough ad budget, and we will come back with a campaign plan and a price.',
  }),

  build({
    slug: 'strategy',
    metaTitle: 'Start Building Strategies',
    metaDescription:
      'Market research, brand design, and digital strategy blueprints from FrontPage Labs.',
    eyebrow: 'Strategy',
    headline: 'Grow with a plan.',
    subhead:
      'Intentional growth starts with a clear plan. We map every site, post, and ad to reinforce your brand so you can grow with confidence.',
    points: [
      'Market research & positioning',
      'Content mapping & messaging',
      'Ad budgeting & funnel architecture',
    ],
    ctaLabel: 'Get started',
    workHeading: 'Work that worked',
    pricingIntro:
      'Strategy work is scoped to your market and goals, so pricing starts with a conversation.',
    plans: [
      {
        name: 'Custom',
        price: 'Custom',
        note: 'Scoped to your market, brand, and goals.',
        features: [
          'Market & competitor research',
          'Brand design & messaging',
          'Growth blueprint you keep',
          'Budget & media planning',
        ],
        featured: true,
      },
    ],
    formHeading: 'Tell us where you want to be.',
    formIntro:
      'Share your business and your goals, and we will come back with a strategy plan and a price.',
  }),

  build({
    slug: 'landing-page',
    metaTitle: 'Landing Page + Ad — $500',
    metaDescription:
      'One conversion-built landing page plus one ad campaign, launched together for a flat $500.',
    eyebrow: 'The Landing Page Offer',
    headline: 'A landing page, plus the ad that fills it.',
    subhead:
      'One conversion-built landing page and one ad campaign pointed straight at it — designed, written, and launched together for a flat $500.',
    points: [
      'One flat fee, no surprises',
      'Page and ad launched together',
      'Live in days, not weeks',
    ],
    ctaLabel: 'Claim the offer',
    workHeading: 'Work that worked',
    pricingIntro: 'One flat fee covers the page and the campaign that drives traffic to it.',
    plans: [
      {
        name: 'Landing Page + Ad',
        price: '$500',
        note: 'One flat fee. Page and campaign, launched together.',
        features: [
          'Conversion-built landing page',
          'One ad campaign, set up & launched',
          'Copy & creative included',
          'Lead capture wired in',
        ],
        featured: true,
      },
    ],
    formHeading: 'Claim the $500 offer.',
    formIntro:
      'Tell us about your business and what you want the page to sell, and we will get your page and ad moving.',
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
