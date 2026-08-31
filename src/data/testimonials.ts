// Client testimonials, transcribed from the live Webflow site. Shared by the
// home page's "Lab results" section and the /lp/* landing pages, so a quote
// only ever has to be corrected in one place.

export interface Testimonial {
  /** Rendered as two lines. */
  heading: [string, string];
  quote: string;
  name: string;
  company: string;
  /** Teal stat line rendered underneath the client's card. ⚠ PLACEHOLDER
   *  numbers — swap for real figures per client. Omit to render no stat. */
  stat?: string;
}

export const testimonials: Testimonial[] = [
  {
    heading: ['Record Breaking', 'Growth.'],
    quote:
      'FrontPageLabs has built incredible websites, socials and ads for my companies that generated web traffic and sales. Our record-growth is tied directly to FrontPage Lab’s incredible work.',
    name: 'Archie Preissman, Founder',
    company: 'Irene Capital & Brands',
    stat: '+$150K in sales and +26.9 million impressions',
  },
  {
    heading: ['Business Minded', 'Marketing.'],
    quote:
      "FrontPageLabs has been great to work with. They took my rough ideas and crafted a brand far beyond my expectations. Working with FrontPage Labs was one of the best business decisions I've made.",
    name: 'Mike LePree, Founder',
    company: 'Twin Cities Real Estate',
    stat: '+483% in conversions',
  },
  {
    heading: ['Real', 'Results.'],
    quote:
      'The combination of their websites, socials and ads led to impressive outcomes for us. We continue to reach new users month over month.',
    name: 'Jeff Hedges, Founder',
    company: 'Gavvy',
    stat: '+793,000 impressions and +3,000 new users',
  },
  {
    heading: ['Creative', 'Excellence.'],
    quote:
      "With FrontPage Lab's creativity behind our content, engagement continues to blow past anything we've seen in the past.",
    name: 'Uzma Bawany, Founder',
    company: 'Thaakat Foundation',
    stat: '+1.8 million impressions',
  },
];
