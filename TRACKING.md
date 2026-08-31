# Tracking (Meta)

## Accounts

| What | Value | Where it is used |
|---|---|---|
| Meta pixel ID | `728093653651869` | `META_PIXEL_ID` in `src/data/tracking.ts` |
| Meta ad account ID | `1356031632720034` | Ads Manager only. **Not** used in site code. |

The ad account ID never appears in page markup. It identifies the account that
owns the campaigns and is what you select in Ads Manager when building the
audiences and conversions this pixel feeds. Keep it here so the two are
recorded together.

## Where the pixel fires

**Every page**, so retargeting audiences build from all site traffic.

`src/components/MetaPixel.astro` renders the base pixel and its PageView, and
is included by `src/layouts/Base.astro` (which every normal page uses) plus
the two pages that build their own shell instead of using the layout:
`/get-started` and `/offers/website-audit/start`. It also renders the
`<noscript>` fallback image, so visitors with JavaScript off are still counted.

The ID lives in `src/data/tracking.ts`. **Emptying that string turns all Meta
tracking off site-wide** — one edit, no other changes needed.

## Events

| Event | Type | When |
|---|---|---|
| `PageView` | standard | Any page on the site loads |
| `GetStartedStep` | custom, `{ step: 1-4 }` | Each step renders |
| `GetStartedScratchOpen` | custom | Scratch-off modal opens (start of step 2) |
| `GetStartedScratch` | custom, `{ prize }` | A scratch-off is revealed |
| `GetStartedExitOffer` | custom, `{ step }` | Exit-intent offer is shown |
| `GetStartedPromoClaimed` | custom, `{ code }` | A promo code is copied |
| `Lead` | standard, `{ content_name: 'get-started' }` | Final submit |

`Lead` is the standard event to optimize campaigns against. The custom events
are for diagnosing where people drop out, and can be turned into custom
conversions in Events Manager if you want to optimize for a mid-funnel step.

Every call is wrapped so a blocked or failed pixel can never break the funnel.

## Verifying it works

1. Deploy (`./ship.sh`). The pixel only exists on the built site.
2. Install the **Meta Pixel Helper** Chrome extension.
3. Open <https://frontpagelabs.netlify.app/get-started> and watch it register
   `728093653651869` plus a PageView, then step through the flow and watch the
   custom events fire.
4. Events Manager → your pixel → Test Events shows the same in real time.

Note the site currently sends `X-Robots-Tag: noindex` (set in `netlify.toml`,
because frontpagelabs.com is still on Webflow). That does not affect the
pixel, but do remove that block when the real domain is pointed here.

## Privacy

The pixel loads Meta's script and sends the events above from visitors'
browsers. If you run ads in regions requiring consent, this needs a consent
banner gating the pixel. Not built.
