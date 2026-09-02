// Portfolio data, transcribed from the live Webflow CMS collection so the
// rebuild lists the same projects in the same order. Images live in
// /public/assets and keep the slugified Webflow filenames.

export interface Project {
  title: string;
  href: string;
  image: string;
  tags: string[];
  /**
   * Full-page screenshot. When set, the card scrolls the whole page on hover
   * instead of sitting still, and plays on its own as the card passes through
   * the middle of a phone screen. See ProjectCard.astro. Keep these 1240px
   * wide, which is what the case-study gallery renders them at; they are
   * lazy-loaded, but every card on the grid holds one.
   */
  preview?: string;
}

export const projects: Project[] = [
  // ── 2026 builds ────────────────────────────────────────────────────────────
  // Everything below with a `preview` was shot from the live site (scripted
  // capture, card at 1600x1000 and preview full-page at 1240 wide, capped at
  // 6200px tall). Re-shoot after a redesign: both the card and the preview come
  // from the same page.
  //
  // Second pass on 2026-09-02 added Cost Property Management, The Jagger, The
  // Roy, Louella and Fantastic Feeling, and re-shot ChicagoLand Auto Fair from
  // /sellers/ because the home page opens a modal over the hero.
  {
    title: "AK Custom Homes",
    href: "/projects/ak",
    image: '/assets/work-akcustomhomes.jpg',
    preview: '/assets/work-akcustomhomes-scroll.jpg',
    tags: ["Website", "Ads", "SEO"],
  },
  {
    title: "CuraPath",
    href: "/projects/curapath",
    image: '/assets/work-curapath.jpg',
    preview: '/assets/work-curapath-scroll.jpg',
    tags: ["Website", "Branding", "Digital Strategy"],
  },
  {
    title: "The Khan Group",
    href: "/projects/thekhangroup",
    image: '/assets/work-khangroup.jpg',
    preview: '/assets/work-khangroup-scroll.jpg',
    tags: ["Website", "Branding", "Marketing"],
  },
  {
    title: "Constant Good",
    href: "/projects/constant-good",
    image: '/assets/work-constantgood.jpg',
    preview: '/assets/work-constantgood-scroll.jpg',
    tags: ["Website", "Branding", "Content"],
  },
  {
    title: "Get You Employed",
    href: "/projects/get-you-employed",
    image: '/assets/work-getyouemployed.jpg',
    preview: '/assets/work-getyouemployed-scroll.jpg',
    tags: ["Website", "Branding", "Digital Strategy"],
  },
  {
    title: "Job Search Dashboard",
    href: "/projects/job-search-dashboard",
    image: '/assets/work-jobdash.jpg',
    preview: '/assets/work-jobdash-scroll.jpg',
    tags: ["Website", "Digital Strategy"],
  },
  {
    title: "Personal Operating Dashboard",
    href: "/projects/personal-dashboard",
    image: '/assets/work-dashboard.jpg',
    preview: '/assets/work-dashboard-scroll.jpg',
    tags: ["Website", "Branding", "Digital Strategy"],
  },

  // ── Earlier work, transcribed from the Webflow CMS ─────────────────────────
  {
    title: "Seth Taylor Fitness",
    href: "/projects/seth-taylor-fitness",
    image: '/assets/work-seth-taylor-fitness.jpg',
    preview: '/assets/work-seth-taylor-fitness-scroll.jpg',
    tags: ["Website", "Branding", "Marketing"],
  },
  {
    title: "Charity Website",
    href: "/projects/charity-website",
    image: '/assets/screenshot-2026-04-29-at-8.01.29-am.png',
    tags: ["Website", "Social Media", "Content"],
  },
  {
    title: "Property Management Company",
    href: "/projects/property-management-company",
    image: '/assets/work-costpropertymanagement.jpg',
    preview: '/assets/work-costpropertymanagement-scroll.jpg',
    tags: ["Website", "Marketing", "Ads"],
  },
  {
    title: "Therapy Provider",
    href: "/projects/therapy-provider",
    image: '/assets/work-therapy-provider.jpg',
    preview: '/assets/work-therapy-provider-scroll.jpg',
    tags: ["Website", "Digital Strategy", "Review Growth"],
  },
  // "Dashboard Project" was this same site under an older screenshot; it now
  // lives above as Personal Operating Dashboard.
  {
    title: "Verona Residences",
    href: "/projects/verona-residences",
    image: '/assets/work-verona-residences.jpg',
    preview: '/assets/work-verona-residences-scroll.jpg',
    tags: ["Website", "Digital Strategy", "Marketing"],
  },
  {
    title: "RankHero (Formerly EtsyCheck)",
    href: "/projects/rankhero",
    image: '/assets/1.png',
    tags: ["Content", "Ads", "Social Media"],
  },
  {
    title: "Jagger Apartments",
    href: "/projects/jagger-apartments",
    image: '/assets/work-jagger-apartments.jpg',
    preview: '/assets/work-jagger-apartments-scroll.jpg',
    tags: ["Website", "Social Media", "Ads"],
  },
  {
    title: "Tactical Apparel Brand",
    href: "/projects/gunderpants",
    image: '/assets/work-gunderpants.jpg',
    preview: '/assets/work-gunderpants-scroll.jpg',
    tags: ["LabLaunch*", "Branding", "Website"],
  },
  {
    title: "MJ Timepieces",
    href: "/projects/mj-timepieces",
    image: '/assets/screenshot-2025-11-10-at-6.40.54-pm.png',
    tags: ["Website", "Branding", "Marketing"],
  },
  {
    title: "ChicagoLand Auto Fair",
    href: "/projects/autofair",
    image: '/assets/work-autofair.jpg',
    preview: '/assets/work-autofair-scroll.jpg',
    tags: ["Website", "Ads", "Social Media"],
  },
  {
    title: "Mosaic Therapy Miami",
    href: "/projects/mosaic-therapy-miami",
    image: '/assets/work-mosaic-therapy-miami.jpg',
    preview: '/assets/work-mosaic-therapy-miami-scroll.jpg',
    tags: ["Website", "Social Media", "Ads"],
  },
  {
    title: "Roy Apartments",
    href: "/projects/roy-apartments",
    image: '/assets/work-roy-apartments.jpg',
    preview: '/assets/work-roy-apartments-scroll.jpg',
    tags: ["Website", "Ads", "Social Media"],
  },
  {
    title: "Louella Apartments",
    href: "/projects/louella-apartments",
    image: '/assets/work-louella-apartments.jpg',
    preview: '/assets/work-louella-apartments-scroll.jpg',
    tags: ["Website", "Social Media", "Ads"],
  },
  {
    title: "DeSalvoFlorian Architects",
    href: "/projects/dsfarchitects",
    image: '/assets/work-dsfarchitects.jpg',
    preview: '/assets/work-dsfarchitects-scroll.jpg',
    tags: ["Website", "Ads", "Social Media"],
  },
  {
    title: "Mosaic Therapy Sun Valley",
    href: "/projects/mosaic-therapy-sun-valley",
    image: '/assets/mosaicidaho-1.png',
    tags: ["Website", "Social Media", "Strategy"],
  },
  {
    title: "Charity Basketball Tournament",
    href: "/projects/charity",
    image: '/assets/1-ef598f.png',
    tags: ["Content", "Social Media", "Strategy"],
  },
  {
    title: "Cale Ent. Real Estate",
    href: "/projects/cale",
    image: '/assets/work-cale.jpg',
    preview: '/assets/work-cale-scroll.jpg',
    tags: ["Website", "Branding"],
  },
  {
    title: "Gavvy",
    href: "/projects/gavvy",
    image: '/assets/1-5bd238.png',
    tags: ["Branding", "Digital Strategy", "Marketing"],
  },
  {
    title: "Kanengiser Coaching",
    href: "/projects/kanengiser-coaching",
    image: '/assets/work-kanengiser-coaching.jpg',
    tags: ["Website", "Social Media", "Marketing"],
  },
  {
    title: "Massage Therapy Studio",
    href: "/projects/massage",
    image: '/assets/work-massage-studio.jpg',
    preview: '/assets/work-massage-studio-scroll.jpg',
    tags: ["Digital Strategy", "Review Growth", "SEO"],
  },
  {
    title: "Blockchain Tech Startup",
    href: "/projects/blockchain-tech-startup",
    image: '/assets/qcmedchain-2.png',
    tags: ["Website", "Digital Strategy", "Branding"],
  },
  {
    title: "Wellness Newsletter",
    href: "/projects/mental-health-newsletter",
    image: '/assets/1-cb97a8.png',
    tags: ["Branding", "Social Media", "Content"],
  },
  {
    title: "Funke Architects",
    href: "/projects/funke-architects",
    image: '/assets/work-funke-architects.jpg',
    preview: '/assets/work-funke-architects-scroll.jpg',
    tags: ["Website"],
  },
  {
    title: "Digital Studios Photography",
    href: "/projects/digital-studios",
    image: '/assets/dsf-2.png',
    tags: ["Website", "Content"],
  },
  {
    title: "Omar Eats",
    href: "/projects/omar-eats",
    image: '/assets/omareats-1.png',
    tags: ["Website", "Branding"],
  },
  {
    title: "Fatin Hameed Architects",
    href: "/projects/fatin-hameed-architects",
    image: '/assets/fatin-hameed-1.png',
    tags: ["Website"],
  },
  {
    title: "BlueSky Studio Architects",
    href: "/projects/blueskyarchitects",
    image: '/assets/work-blueskyarchitects.jpg',
    preview: '/assets/work-blueskyarchitects-scroll.jpg',
    tags: ["Website", "Branding"],
  },
];

/** The four projects the home and services pages feature. */
export const featuredProjects = projects.slice(0, 4);

/**
 * The home-page mosaic, in the order it reads down the page. Hand-picked
 * rather than sliced off the top so the section stays client work — the two
 * in-house dashboards sit high in `projects` but do not belong in a wall of
 * recent client builds. Edit this list to change what the mosaic shows; the
 * layout adapts to however many entries are in it.
 */
const RECENT_WORK_SLUGS = [
  'ak',
  'curapath',
  'thekhangroup',
  'constant-good',
  'property-management-company',
  'get-you-employed',
  'seth-taylor-fitness',
];

export const recentWork: Project[] = RECENT_WORK_SLUGS.map((slug) => {
  const project = projects.find((p) => p.href === `/projects/${slug}`);
  if (!project) throw new Error(`recentWork: no project with slug "${slug}"`);
  return project;
});
