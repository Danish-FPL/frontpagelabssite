// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// `site` makes og:url / og:image absolute. Change to https://frontpagelabs.com
// when the real domain is pointed at Netlify.
export default defineConfig({
  site: 'https://frontpagelabs.netlify.app',
});
