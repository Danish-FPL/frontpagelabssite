/**
 * Portfolio capture — the card image and the hover scrollthrough for one site.
 *
 * Playwright is deliberately NOT a dependency of this project: it downloads a
 * ~100MB browser on install and this script runs a handful of times a year, so
 * paying for it on every `npm ci` (Netlify's included) is not worth it. Install
 * it on demand instead:
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/shoot-portfolio.mjs <slug> <url>
 *
 * Writes two PNGs to ./shots — <slug>-card.png at 1600x1000 (the 16:10 the
 * tile crops to) and <slug>-scroll.png full-page at 1240 wide (what the card
 * frame renders the preview at). Then convert and file them under
 * public/assets, capping the scrollthrough at 6200px tall so the 7s hover
 * animation does not race:
 *
 *   sips -s format jpeg -s formatOptions 72 shots/<slug>-card.png \
 *     --out public/assets/work-<name>.jpg
 *   sips -c 6200 1240 --cropOffset 0 0 shots/<slug>-scroll.png --out /tmp/c.png
 *   sips -s format jpeg -s formatOptions 68 /tmp/c.png \
 *     --out public/assets/work-<name>-scroll.jpg
 *
 * Shoot the page that shows the work, not necessarily the home page — some
 * sites open a modal over their hero (ChicagoLand Auto Fair is shot from
 * /sellers/ for exactly that reason).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [slug, url] = process.argv.slice(2);
if (!slug || !url) {
  console.error('usage: node shoot.mjs <slug> <url>');
  process.exit(1);
}

const OUT = new URL('../shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Kill the things that ruin a screenshot: cookie bars, newsletter modals,
 * chat bubbles, and any sticky bar that would otherwise ride down the whole
 * full-page shot. Runs after load and again after the scroll pass, because
 * some of these are timed to appear a few seconds in.
 */
async function dismissOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {});

  // Consent bars are the one overlay worth clicking rather than deleting: the
  // click is what stops them coming back on the next scroll or route change.
  for (const sel of [
    '#onetrust-accept-btn-handler',
    '.ot-sdk-container #onetrust-accept-btn-handler',
    '#truste-consent-button',
    'button#hs-eu-confirmation-button',
    '[aria-label="Accept all cookies"]',
    '.cc-allow',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  ]) {
    await page
      .locator(sel)
      .first()
      .click({ timeout: 1200 })
      .catch(() => {});
  }

  await page.evaluate(() => {
    // Vendor widgets that keep their own root and would otherwise ride down
    // the full-page shot.
    const ROOTS = [
      '#onetrust-consent-sdk',
      '#ot-sdk-btn-floating',
      '.onetrust-pc-dark-filter',
      '#CybotCookiebotDialog',
      '#hs-eu-cookie-confirmation',
      '#truste-consent-track',
      '.cookie-banner',
      '.cookie-notice',
      '#usercentrics-root',
      '.acsb-trigger',
      '#acsbSvgTrigger',
      '.userway_buttons_wrapper',
      '#launcher',
      '.grecaptcha-badge',
      '[id^="intercom-"]',
      '[class*="drift-"]',
      '#tawkchat-container',
      '#hubspot-messages-iframe-container',
      '[id*="podium-"]',
    ];
    ROOTS.forEach((sel) => document.querySelectorAll(sel).forEach((el) => el.remove()));

    const KILL = /cookie|consent|gdpr|newsletter|popup|modal|overlay|drift|intercom|tawk|crisp|hubspot|podium|subscribe|exit-intent|lightbox|fancybox|mfp-|interstitial|accessib/i;
    const KEEP = /nav|header|menu|hero|banner-hero/i;

    document.querySelectorAll('body *').forEach((el) => {
      if (!el.isConnected) return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      if (cs.display === 'none' || cs.visibility === 'hidden') return;

      const id = `${el.id} ${el.className}`.toString();
      const r = el.getBoundingClientRect();
      const coversMost = r.width > innerWidth * 0.6 && r.height > innerHeight * 0.5;
      // A full-width strip pinned to the bottom is a consent bar every time.
      const bottomBar = r.width > innerWidth * 0.6 && r.bottom > innerHeight - 4 && r.top > innerHeight * 0.5;
      const isDim = Number(cs.zIndex) > 500 && coversMost;

      if (KILL.test(id) || isDim || bottomBar || (coversMost && !KEEP.test(id))) el.remove();
    });

    // Modals routinely lock the page; unlock so the scroll pass works.
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
  });
}

/** Walk the page so lazy images load and scroll-triggered reveals fire. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.7;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1240, height: 900 },
  deviceScaleFactor: 1,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
await sleep(2500);
await dismissOverlays(page);
await scrollThrough(page);
await dismissOverlays(page);
await page.evaluate(() => scrollTo(0, 0));
await sleep(900);

// Scrollthrough: whole page at the 1240px the card frame renders it at.
await page.screenshot({ path: `${OUT}/${slug}-scroll.png`, fullPage: true, timeout: 120_000 });

// Card: the hero, shot at the 16:10 the tile crops to.
await page.setViewportSize({ width: 1600, height: 1000 });
await sleep(1200);
await dismissOverlays(page);
await page.evaluate(() => scrollTo(0, 0));
await sleep(600);
await page.screenshot({ path: `${OUT}/${slug}-card.png` });

const h = await page.evaluate(() => document.body.scrollHeight);
console.log(`${slug}: captured (page height ${h}px)`);

await browser.close();
