// Case-study content for every /projects/<slug> page.
//
// HOW THIS WORKS
// --------------
// Every project in `projects.ts` gets a page automatically — there is no route
// to write and no file to create per project. `src/pages/projects/[slug].astro`
// renders all of them from this file.
//
// Each page starts from `placeholder()` below, which builds a complete,
// structurally-correct page out of what `projects.ts` already knows (title,
// tags, image). That is why clicking any project works right now even though
// none of the real copy is written yet.
//
// TO FILL IN A REAL PROJECT
// -------------------------
// Add an entry to `content` keyed by the project's slug, with only the fields
// you want to override. Anything you leave out keeps its placeholder. See the
// worked example under 'seth-taylor-fitness'.
//
// If one project eventually needs a layout the template can't express, add
// `src/pages/projects/<slug>.astro` — a static route wins over the dynamic one,
// so that single page takes over without disturbing the other 29.

import { projects, type Project } from './projects';

export interface CaseStudyHighlight {
  /** Short capability name, e.g. "Expert Exercise Coaching". */
  title: string;
  /** One line under it. */
  body: string;
}

export interface CaseStudy {
  slug: string;
  /** Display title — the oversized page heading. */
  title: string;
  /** The row under the title: tags, then the year. */
  tags: string[];
  year: string;
  client: string;
  /** Right-hand column of the details list, e.g. "Website / Branding". */
  services: string;
  /** Renders the "View Online" button when set. */
  liveUrl: string | null;
  /** Body paragraphs in the overview column. */
  overview: string[];
  /** The numbered 01/02/03 list on the dark band. */
  highlights: CaseStudyHighlight[];
  /** Image beside the numbered list. */
  highlightImage: string;
  /** The oversized scrolling line between sections. */
  marquee: string;
  /** Paragraphs in the "(About)" block. */
  about: string[];
  /** Full-width screenshots down the page. */
  gallery: string[];
  /** Card image used when this project is shown as "related". */
  image: string;
}

/** Slug from a project href: "/projects/ak" → "ak". */
export const slugOf = (project: Project) => project.href.replace('/projects/', '');

/**
 * A complete page built from what we already know about a project. Every field
 * here is meant to be replaced — the copy is deliberately generic so it reads
 * as unfinished rather than as a claim about the client.
 */
function placeholder(project: Project): CaseStudy {
  return {
    slug: slugOf(project),
    title: project.title,
    tags: project.tags,
    year: '2026',
    client: project.title,
    services: project.tags.join(' / '),
    liveUrl: null,
    overview: [
      `FrontPage Labs partnered with ${project.title} to build the digital system behind the brand.`,
      'Placeholder overview copy. Replace this with the story of the engagement: what the client came to us with, what we set out to change, and how the work was scoped.',
      'A second paragraph carries the approach: the decisions that shaped the build and why they were the right ones for this brand.',
      'A closing line lands the outcome.',
    ],
    highlights: [
      { title: 'First capability', body: 'One line describing what this piece of the work does for the client.' },
      { title: 'Second capability', body: 'One line describing what this piece of the work does for the client.' },
      { title: 'Third capability', body: 'One line describing what this piece of the work does for the client.' },
      { title: 'Fourth capability', body: 'One line describing what this piece of the work does for the client.' },
    ],
    highlightImage: project.image,
    marquee: 'Placeholder headline',
    about: [
      `Placeholder about copy for ${project.title}. Replace with the longer-form context: who the brand serves, what the market looks like, and what the site and campaigns had to accomplish.`,
      'A second paragraph can carry results, testimonials, or the ongoing relationship.',
    ],
    // A project with a full-page screenshot shows the whole site here; the rest
    // fall back to the single card image until real gallery shots exist.
    gallery: project.preview ? [project.preview] : [project.image],
    image: project.image,
  };
}

/**
 * Real content, keyed by slug. Partial — every omitted field falls back to the
 * placeholder above, so an entry can be as small as a single corrected year.
 */
const content: Record<string, Partial<CaseStudy>> = {
  // ── 2026 builds ────────────────────────────────────────────────────────────
  // The `gallery` on each of these is the full-page screenshot that also drives
  // the card scrollthrough, so the detail page shows the whole site in one pass.
  ak: {
    year: '2026',
    client: 'AK Custom Homes',
    services: 'Website / Ads / SEO',
    liveUrl: 'https://akcustomhomes.netlify.app',
    overview: [
      'AK Custom Homes builds luxury new construction across eight Chicago neighborhoods, with more than forty homes delivered since 2007 and a portfolio worth north of $100 million.',
      'A builder at that level was being judged on a website that showed none of it. We rebuilt the site around the work itself: a featured project that runs the full length of a single home, a founder section that puts Azeem and Raheem in front of the buyer, and a four-step process page that answers the question every prospective homeowner actually has, which is what the next eighteen months will feel like.',
      'The result reads the way the homes do, unhurried and detailed, and it gives the sales conversation somewhere to start.',
    ],
    highlights: [
      { title: 'Featured Project Story', body: 'A single home carried across twenty-two frames, from facade rendering to listing detail.' },
      { title: 'Founder-Led Trust', body: 'The people behind the homes, named and reachable, instead of a faceless contact form.' },
      { title: 'Process Made Legible', body: 'Discovery through final delivery, so a first-time custom buyer knows what they are signing up for.' },
      { title: 'Search and Paid Support', body: 'Neighborhood-level SEO and ad support pointed at buyers already looking in Chicago.' },
    ],
    marquee: 'Masterfully crafted',
    about: [
      'Custom home building is a long, expensive, deeply personal purchase, and the decision gets made months before anyone picks up the phone. The site had to do the early convincing on its own.',
      'Every section is built to survive that slow read: large photography, specific numbers, real names, and a clear path from browsing the portfolio to getting in touch.',
    ],
  },

  curapath: {
    year: '2026',
    client: 'CuraPath',
    services: 'Website / Branding / Digital Strategy',
    liveUrl: 'https://mansicurapath.netlify.app',
    overview: [
      'CuraPath is an AI-enabled post-operative recovery platform that closes the gap between the operating room and the follow-up appointment. Patients check in from their phone, and care teams get a risk-ranked view of who needs attention.',
      'Health software has to earn belief from two audiences at once, and they want opposite things. Clinicians want signal and defensible outcomes. Patients want to feel looked after. We built the site to speak to both without diluting either, splitting the product story into a clinician view and a patient view that mirror each other section for section.',
      'The centerpiece is a working product surface rendered directly in the page, so a clinician can see the dashboard before requesting access rather than reading a description of it.',
    ],
    highlights: [
      { title: 'Dual Audience Architecture', body: 'Parallel clinician and patient tracks that answer what you get and why it matters.' },
      { title: 'Live Product Surface', body: 'The recovery dashboard built in HTML rather than shown as a flat mockup.' },
      { title: 'Evidence Forward', body: 'Pilot results and outcome data placed where a skeptical clinical reader looks for them.' },
      { title: 'Clinical Brand System', body: 'A calm, dark interface language that reads as software rather than as marketing.' },
    ],
    marquee: 'Clarity for clinicians',
    about: [
      'Post-op recovery is largely invisible to the people responsible for it. The weeks between discharge and follow-up are where complications quietly develop, and where a platform like CuraPath has to prove its value.',
      'The site was written to make that invisible window the whole argument, then to hand the reader a request-access path while the point is still fresh.',
    ],
  },

  thekhangroup: {
    year: '2026',
    client: 'The Khan Group',
    services: 'Website / Branding / Marketing',
    liveUrl: 'https://thekhangroup.netlify.app',
    overview: [
      'The Khan Group has worked Chicago’s North Side for over a decade as a brokerage that stays on to manage the property after the sale closes.',
      'That continuity is their whole differentiator, and the previous site never said it. We rebuilt around three services presented as one accountable relationship, then gave the firm a real origin story: a seventeen-year-old sticking a label reading Khan Brothers Real Estate on his older brother’s laptop, years before either of them worked in property.',
      'A property index covering forty-four buildings across five neighborhoods turns a claim about local expertise into something a prospective seller can scroll through and check.',
    ],
    highlights: [
      { title: 'One Accountable Group', body: 'Brokerage, property management, and rental management framed as a single relationship.' },
      { title: 'Verifiable Track Record', body: 'Forty-four properties across five North Side neighborhoods, listed by address.' },
      { title: 'Family Origin Story', body: 'The founding story told properly, which is what an owner-operator brokerage sells on.' },
      { title: 'Neighborhood Positioning', body: 'Areas of expertise named individually, from North Center to the West Loop.' },
    ],
    marquee: 'Experts in Chicago',
    about: [
      'Real estate sites tend to look interchangeable because they are all built from the same photography and the same promises. The Khan Group had specifics that nobody else could copy, and the rebuild is mostly a matter of putting those specifics on the page.',
      'The tone stays restrained throughout, since the audience includes investors and building owners who are unimpressed by superlatives.',
    ],
  },

  'constant-good': {
    year: '2026',
    client: 'Constant Good',
    services: 'Website / Branding / Content',
    liveUrl: 'https://constantgood.netlify.app',
    overview: [
      'Constant Good builds schools and safe learning environments, partnering with educators already rooted in the communities where the campuses go up. Their network reaches over ten thousand students across Karachi, Myanmar, and Sierra Leone.',
      'The organization asks for a specific and unusual thing: funding an entire school in one act rather than a recurring monthly gift. That ask needs a site that carries weight, so we built the case in layers, opening on the mission, moving through the argument for why education compounds, and closing on an interactive map that lets a donor stand in a specific place before deciding.',
      'Impact stories run alongside the numbers so the reader meets someone, not just a statistic. Bushra grew up near the Jam Chakro landfill and now works as a doctor in the organization’s own clinic.',
    ],
    highlights: [
      { title: 'Legacy Giving Framing', body: 'A single complete school, positioned as the gift rather than a monthly subscription.' },
      { title: 'Interactive Impact Map', body: 'Country and marker level exploration of active projects and the ground they cover.' },
      { title: 'Counted Outcomes', body: 'Students served, female enrollment rate, and schools built, animated in as the reader arrives.' },
      { title: 'Story-Led Proof', body: 'Long-form impact articles that give the donation a face and a follow-through.' },
    ],
    marquee: 'A place to thrive',
    about: [
      'Nonprofit sites usually fail in one of two directions, either drowning the reader in need or scrubbing the work into abstraction. Constant Good needed the middle, which is dignity plus specificity.',
      'Every number on the page is attached to a place, and every place is attached to a partner organization already working there.',
    ],
  },

  'get-you-employed': {
    year: '2026',
    client: 'Get You Employed',
    services: 'Website / Branding / Digital Strategy',
    liveUrl: 'https://getyouemployed.netlify.app',
    overview: [
      'Get You Employed sells a private job-hunting dashboard that reads the career portals of the companies a candidate cares about every morning and returns one short list, already scored against their resume.',
      'The product is easy to describe and hard to believe, so the page leads with the arithmetic instead of the pitch. A horizontally scrolling data section walks through what an applicant is actually up against, drawn from Ashby talent trend reports covering more than a hundred million applications logged between 2021 and 2026.',
      'By the time the offer appears, the reader has already agreed with the premise. The launch runs on five hand-built seats given away permanently in exchange for honest feedback, which the page states plainly rather than dressing up as a promotion.',
    ],
    highlights: [
      { title: 'Argument Before Offer', body: 'Five hiring statistics presented in sequence so the problem lands before the product does.' },
      { title: 'Sourced Data Design', body: 'Every figure carries its source, including where the evidence is thinner than the rest.' },
      { title: 'Honest Launch Mechanic', body: 'Five free seats, no card and no trial clock, framed as an application rather than a signup.' },
      { title: 'Product Shown Working', body: 'Screens from a live board, scrubbed to a demo persona, embedded in a browser frame.' },
    ],
    marquee: 'A numbers game',
    about: [
      'Most job-search tools sell optimism. This one sells a better position in a pile that has tripled in five years, which is a harder sell and a more defensible one.',
      'The writing throughout stays deliberately unsalesy, because the audience is people who have already been marketed to by every job board they have ever used.',
    ],
  },

  'job-search-dashboard': {
    year: '2026',
    client: 'Get You Employed',
    services: 'Website / Digital Strategy',
    liveUrl: null,
    overview: [
      'The dashboard behind Get You Employed is a single-page application that crawls over eighty company career feeds every morning, scores what it finds against the candidate’s background, and banks the results in one ranked list.',
      'It reaches the boards directly rather than through an aggregator, which is the entire point: applying through a company’s own portal puts a candidate in a far smaller room than a one-click listing does. Full-time, part-time, and local roles get their own tracks, each with its own scoring rubric.',
      'A built-in resume lab handles the other half of the job, letting the candidate keep tailored versions per role and export a clean, machine-readable PDF.',
    ],
    highlights: [
      { title: 'Eighty-Plus Live Feeds', body: 'Company career portals read directly each morning, with no aggregator in the middle.' },
      { title: 'Transparent Scoring', body: 'Every fit score explains itself on hover, including where the signal is thin.' },
      { title: 'Batch Application Flow', body: 'Open the next twenty-five unopened roles at once, with the position remembered between sessions.' },
      { title: 'Resume Lab', body: 'Per-role resume versions with a page-accurate preview and a clean PDF export.' },
    ],
    marquee: 'Wake up and apply',
    about: [
      'This is the working product rather than the page that sells it, so the screenshots come from a demo board seeded with an invented candidate. No real user data appears anywhere in this case study.',
      'The build runs with no paid API of any kind. The crawler and the scorer are both plain JavaScript running in serverless functions, which is what keeps a per-seat product viable at five dollars a month.',
    ],
  },

  'personal-dashboard': {
    year: '2026',
    client: 'Internal',
    services: 'Website / Branding / Digital Strategy',
    liveUrl: 'https://danishroadtomillions.netlify.app',
    overview: [
      'A single-page operating system for the working day, built in-house and used daily. It holds the schedule, the standing rules, and a set of small tools that would otherwise be ten open browser tabs.',
      'The design brief was almost entirely about restraint. A dashboard someone opens at seven in the morning cannot be loud, so the interface runs near-black with one accent color, monospace labels, and a single editorial serif carrying the daily quote.',
      'Ten utilities live behind the front page, covering everything from a breathing exercise to a cold call script to a macro calculator, each one a full screen rather than a widget.',
    ],
    highlights: [
      { title: 'Single Page, Many Screens', body: 'A client-side router moves between ten full-screen tools with no page loads.' },
      { title: 'Built for Seven AM', body: 'Near-black palette, monospace labels, and one accent color that never competes.' },
      { title: 'Time-Blocked Schedule', body: 'The day laid out as three named blocks with the reasoning for each one attached.' },
      { title: 'Standing Rules', body: 'Training, work, food, and sleep committed to the page so they stop being decisions.' },
    ],
    marquee: 'Built for the work',
    about: [
      'Productivity apps fail because they ask you to maintain them. This one is deliberately opinionated and mostly static, with the rules written down once and the tools sitting one tap away.',
      'The screenshots here show the design and the tooling. The live task list and health tracking panels are personal and have been left out of the capture.',
    ],
  },

  // ── Earlier work ───────────────────────────────────────────────────────────
  // These carry only a verified live URL so far; the rest of each page is still
  // the placeholder. Each link was loaded on 2026-09-01 at the same time its
  // screenshots were taken, so a dead one means the client's site went down
  // after that date. Projects with no entry here have no working link on file.
  autofair: { liveUrl: 'https://chicagolandautofair.com/' },
  blueskyarchitects: { liveUrl: 'http://blueskystudio.com/' },
  cale: { liveUrl: 'https://www.cale-re.com/' },
  dsfarchitects: { liveUrl: 'https://desalvoflorian.com/' },
  'funke-architects': { liveUrl: 'http://funkearchitects.com/' },
  gunderpants: { liveUrl: 'https://gunderpants.com' },
  'jagger-apartments': { liveUrl: 'https://www.thejaggerla.com/' },
  'kanengiser-coaching': { liveUrl: 'https://www.kanengisercoaching.com/' },
  'louella-apartments': { liveUrl: 'https://www.livelouella.com/' },
  massage: { liveUrl: 'https://fantasticfeelingonline.com/' },
  'mosaic-therapy-miami': { liveUrl: 'https://www.mosaictherapymiami.com/' },
  'property-management-company': { liveUrl: 'https://www.costpropertymanagement.com/' },
  'roy-apartments': { liveUrl: 'https://www.theroyla.com/' },
  'therapy-provider': { liveUrl: 'https://www.vitopathways.com/' },
  'verona-residences': { liveUrl: 'https://veronaresidences.com/' },

  // Worked example of the shape. Delete or rewrite freely.
  'seth-taylor-fitness': {
    year: '2026',
    client: 'Seth Taylor Fitness',
    services: 'Website / Branding / Marketing',
    liveUrl: 'https://sethtaylorfitness.com/',
    overview: [
      'FrontPage Labs partnered with Seth Taylor Fitness, a fast-growing fitness coach and online creator building a loyal audience around performance, discipline, and real transformation.',
      'Our focus was to rebuild the entire digital system behind the brand, starting with a full website overhaul and a redesigned VSL funnel built to clearly communicate Seth’s coaching philosophy, results, and offer structure.',
      'The new system gives Seth a platform that matches the level of his content, one that not only showcases his expertise but is built to convert attention into clients at scale.',
    ],
    highlights: [
      { title: 'Expert Exercise Coaching', body: 'Daily workout routines are built specifically to your goals.' },
      { title: 'Guided Nutrition Optimization', body: 'Precision nutrition plans for your desired fitness outcomes.' },
      { title: 'Mindset Management', body: 'Tools to spark lasting change, for wherever you’re at in your fitness journey.' },
      { title: 'Daily Accountability', body: 'No excuses here. We push you to drive progress each day.' },
    ],
    marquee: 'Push your growth',
  },
};

/** Every project, as a ready-to-render case study. */
export const caseStudies: CaseStudy[] = projects.map((project) => ({
  ...placeholder(project),
  ...content[slugOf(project)],
}));

export const caseStudyBySlug = (slug: string) => caseStudies.find((c) => c.slug === slug);

/** The two projects shown at the foot of a case study, wrapping the list. */
export function relatedProjects(slug: string, count = 2): Project[] {
  const i = projects.findIndex((p) => slugOf(p) === slug);
  return Array.from({ length: count }, (_, n) => projects[(i + n + 1) % projects.length]);
}
