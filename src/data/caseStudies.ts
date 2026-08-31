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
    gallery: [project.image],
    image: project.image,
  };
}

/**
 * Real content, keyed by slug. Partial — every omitted field falls back to the
 * placeholder above, so an entry can be as small as a single corrected year.
 */
const content: Record<string, Partial<CaseStudy>> = {
  // Worked example of the shape. Delete or rewrite freely.
  'seth-taylor-fitness': {
    year: '2026',
    client: 'Seth Taylor Fitness',
    services: 'Website / Branding / Marketing',
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
