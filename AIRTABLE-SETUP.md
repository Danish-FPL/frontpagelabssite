# Turning lead storage on (Airtable)

Every form on this site posts to `/api/lead`
(`netlify/functions/submit-lead.mjs`), which writes one row per lead into an
Airtable table. The code is done. **Until the three env vars below are set,
the endpoint runs in placeholder mode: visitors see success, the function
logs the lead, and nothing is stored.**

Three steps: build the table, make a token, set the vars.

---

## 1. Build the table in Airtable

Create a base (call it **FrontPage Labs Leads**) with one table named
**Leads**. The column names must match EXACTLY, including capitals. Anything
the site sends that has no matching column is silently dropped, and a column
name that does not exist will make the whole write fail.

| Field name | Field type | What lands here |
|---|---|---|
| `Source` | Single select | Which form: `Get started`, `Contact page`, `Service landing`, `Audit questionnaire`, `Home page` |
| `Page` | Single line text | Which landing page slug, e.g. `websites`, `get-started` |
| `Name` | Single line text | Their name (not collected by /get-started) |
| `Email` | Email | Their email |
| `Phone` | Phone number | Their phone |
| `Website` | Single line text | Existing site / socials |
| `Business` | Long text | **/get-started step 1: their industry and company** |
| `Message` | Long text | **/get-started step 3: budget, plus scratch-off prize and promo code** |
| `Frustration` | Long text | **/get-started step 2: their biggest growth challenge** |
| `Goal` | Long text | What success looks like (audit funnel) |
| `Channel` | Single line text | Reserved for channel forms |
| `Submitted` | Date (include time) | Set automatically on every write |

### Prompt for Airtable's Omni assistant

Paste this into Omni, in a new empty base:

> Create a table named `Leads` for capturing website leads. Add these fields
> with exactly these names and types, and no other fields:
>
> - `Source` — single select, with options: Get started, Contact page,
>   Service landing, Offer landing, Audit questionnaire, Home page
> - `Page` — single line text
> - `Name` — single line text
> - `Email` — email
> - `Phone` — phone number
> - `Website` — single line text
> - `Business` — long text
> - `Message` — long text
> - `Frustration` — long text
> - `Goal` — long text
> - `Channel` — single line text
> - `Submitted` — date field with the time included
>
> Do not add any other fields, do not rename these, and do not make any of
> them required. Then create a grid view named `New leads` sorted by
> `Submitted` newest first, and a second view named `Finished` filtered to
> rows where `Email` is not empty.

Two notes on why the last view matters: `/get-started` saves **after every
step**, so a row appears as soon as someone answers question one. Rows
without an `Email` are people still mid-flow or who dropped out. The
`Finished` view is your real inbox; the full table is your drop-off report.

---

## 2. Create the API token

1. Go to https://airtable.com/create/tokens
2. Name it `frontpagelabs-site`.
3. Scopes: `data.records:read` **and** `data.records:write`.
   (Read is required — the site updates a row as the visitor advances.)
4. Access: the FrontPage Labs Leads base only.
5. Copy the token. It starts with `pat…` and is shown only once.

You also need the base ID: open the base and copy the `app…` segment from the
URL (`https://airtable.com/appXXXXXXXX/tbl…`).

---

## 3. Set the variables

On Netlify (production). From this folder:

```bash
netlify env:set AIRTABLE_API_KEY "pat_your_token_here"
netlify env:set AIRTABLE_BASE_ID "app_your_base_id_here"
netlify env:set AIRTABLE_LEADS_TABLE "Leads"
```

Or in the dashboard: Site settings → Environment variables → Add a variable.

Then `./ship.sh` to deploy. Functions read env vars at runtime, so an
already-deployed site starts storing as soon as the vars are set and the
functions redeploy.

For local testing, copy `.env.example` to `.env` (gitignored) with the same
three values and run `netlify dev` instead of `npm run dev` — `/api/lead`
does not exist under plain `astro dev`, so forms there will log a 404 and
show their error path.

---

## How /get-started fills the row

The flow saves progressively so an abandoned funnel still leaves what it got:

1. Step 1 answered → creates the row (`Business` = their industry) and keeps
   the returned record id.
2. Steps 2, 3 and the scratch-off → PATCH that same row.
3. Final submit → fills `Email` and `Phone` on the same row.

So one visitor is one row that fills in over time, not four rows.

`Message` is a composed line, e.g.
`Budget: $500 – $2,000 | Scratch-off: 15% off | Promo code: FPL15`.
If you would rather have Budget, Scratch-off and Promo code as their own
columns, add them in Airtable and add the matching keys to the `COLUMNS` map
in `netlify/functions/submit-lead.mjs` — one line each, both sides must match.

## Promo codes

The discount codes handed out by the exit-intent modal and the scratch-off
are defined in `src/pages/get-started.astro` (`const PROMO`):

| Prize | Code |
|---|---|
| 10% off | `FPL10` |
| 15% off | `FPL15` |
| 25% off | `FPL25` |

**These must be created as promotion codes in Stripe or checkout will reject
them.** Keep the two lists in sync.
