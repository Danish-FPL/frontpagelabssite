// Portfolio data, transcribed from the live Webflow CMS collection so the
// rebuild lists the same projects in the same order. Images live in
// /public/assets and keep the slugified Webflow filenames.

export interface Project {
  title: string;
  href: string;
  image: string;
  tags: string[];
}

export const projects: Project[] = [
  {
    title: "AK Custom Real Estate",
    href: "/projects/ak",
    image: '/assets/frontpagelabs-x-akcustomhomes-1-1.png',
    tags: ["Website", "Ads", "SEO"],
  },
  {
    title: "Seth Taylor Fitness",
    href: "/projects/seth-taylor-fitness",
    image: '/assets/1-0fa5f1.png',
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
    image: '/assets/screenshot-2026-04-29-at-11.00.34-am.png',
    tags: ["Website", "Marketing", "Ads"],
  },
  {
    title: "Therapy Provider",
    href: "/projects/therapy-provider",
    image: '/assets/screenshot-2026-04-29-at-10.22.47-am.png',
    tags: ["Website", "Digital Strategy", "Review Growth"],
  },
  {
    title: "Dashboard Project",
    href: "/projects/dashboard-project",
    image: '/assets/screenshot-2026-04-29-at-7.31.46-am.png',
    tags: ["Website", "Branding", "Content"],
  },
  {
    title: "Verona Residences",
    href: "/projects/verona-residences",
    image: '/assets/verona-1.png',
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
    image: '/assets/jagger-7.png',
    tags: ["Website", "Social Media", "Ads"],
  },
  {
    title: "Tactical Apparel Brand",
    href: "/projects/gunderpants",
    image: '/assets/screenshot-2025-10-21-at-9.22.41-am.png',
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
    image: '/assets/cfa-6.png',
    tags: ["Website", "Ads", "Social Media"],
  },
  {
    title: "Mosaic Therapy Miami",
    href: "/projects/mosaic-therapy-miami",
    image: '/assets/mosaic-7.png',
    tags: ["Website", "Social Media", "Ads"],
  },
  {
    title: "Roy Apartments",
    href: "/projects/roy-apartments",
    image: '/assets/roy-1.png',
    tags: ["Website", "Ads", "Social Media"],
  },
  {
    title: "Louella Apartments",
    href: "/projects/louella-apartments",
    image: '/assets/louella-1.png',
    tags: ["Website", "Social Media", "Ads"],
  },
  {
    title: "DeSalvoFlorian Architects",
    href: "/projects/dsfarchitects",
    image: '/assets/dsf.png',
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
    image: '/assets/screenshot-2025-11-05-at-1.29.53-pm.png',
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
    image: '/assets/kanengiser-2.png',
    tags: ["Website", "Social Media", "Marketing"],
  },
  {
    title: "Massage Therapy Studio",
    href: "/projects/massage",
    image: '/assets/screenshot-2025-11-05-at-7.05.21-am.png',
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
    image: '/assets/screenshot-2025-10-19-at-8.03.02-pm.png',
    tags: ["Website"],
  },
  {
    title: "Digital Studios Photography",
    href: "/projects/digital-studios",
    image: '/assets/dsf-2.png',
    tags: ["Website", "Content"],
  },
  {
    title: "KhanGroup Real Estate",
    href: "/projects/khangroup-real-estate",
    image: '/assets/khangroup-8.png',
    tags: ["Website"],
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
    image: '/assets/bluesky-1.png',
    tags: ["Website", "Branding"],
  },
];

/** The four projects the home and services pages feature. */
export const featuredProjects = projects.slice(0, 4);
