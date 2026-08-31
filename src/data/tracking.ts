// Tracking IDs, in one place.
//
// The pixel is rendered by src/components/MetaPixel.astro, which every page
// gets through Base.astro (plus the two pages that build their own shell).
// Empty this string to turn all Meta tracking off site-wide.
export const META_PIXEL_ID = '728093653651869';

// The ad account that owns the campaigns this pixel feeds. Recorded here for
// reference only — Ads Manager uses it, the site never does. See TRACKING.md.
export const META_AD_ACCOUNT_ID = '1356031632720034';
