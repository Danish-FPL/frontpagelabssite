# Tracking (Meta)

## Accounts

| What | Value | Where it is used |
|---|---|---|
| Meta pixel ID | `728093653651869` | In the page: `META_PIXEL_ID` in `src/pages/get-started.astro` |
| Meta ad account ID | `1356031632720034` | Ads Manager only. **Not** used in site code. |

The ad account ID never appears in page markup. It identifies the account that
owns the campaigns and is what you select in Ads Manager when building the
audiences and conversions this pixel feeds. Keep it here so the two are
recorded together.

## Where the pixel currently fires

Only on `/get-started`. The rest of the site carries no tracking.

That is deliberate for now: the flow was the thing that needed measuring. If
you want retargeting audiences built from everyone who visits the site (the
usual reason to run a pixel), it needs to move into `src/layouts/Base.astro`
so every page fires PageView. Ask and it is a small change.

## Events

| Event | Type | When |
|---|---|---|
| `PageView` | standard | The `/get-started` page loads |
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
