# Growth Command — internal outreach dashboard

A local-only, PIN-gated board for running FrontPage Labs' outbound: who to
reach today, a drafted message for each, one tap to open Gmail or the profile,
and a log of everything that went out. Nothing is ever sent by software.
Danish reads the draft, sends it himself, and ticks it.

```
cp .env.example .env      # fill in what you have; everything is optional to start
npm run dashboard         # http://localhost:4787 (and a LAN address for a phone)
npm run test:dashboard    # unit tests for the queue, sequences, and validation
```

Default PIN is `2468`. **Set `FPL_DASH_PIN` before this ever points at real
prospects.**

## Where the data lives

| Env set | Store | Notes |
|---|---|---|
| nothing | `dashboard/data/prospects.json` + `touches.json` | Works on day one. Gitignored. |
| `AIRTABLE_API_KEY` + `AIRTABLE_BASE_ID` | `Prospects` + `Touches` tables in the FrontPage Labs base | See [AIRTABLE-SETUP.md](../AIRTABLE-SETUP.md), section "Prospects and Touches". Run `npm run check:airtable`, then hit `/api/verify` once from the signed-in browser. |

The header badge says which one is active. Column names live only in the
`PF` and `TF` maps in `lib/store.mjs`.

## Drafting

Set `ANTHROPIC_API_KEY` in `.env` and the **Draft** buttons appear. Each draft
reads the prospect's own website (stripped to text, cached for a month on the
row), the brief in `brief/fpl-brief.md`, and the proof block in
`brief/proof.md`, and returns one observation plus one message. Drafts are
cached on the prospect, so re-opening a row is free. Cost is about two cents a
draft; the day's spend shows in the Today toolbar and every call is logged to
`data/draft-log.jsonl`. Without a key, rows show the fill-in templates from
`data/sample-data.json` instead.

The key never sends anything. The only outbound calls the server makes are to
Airtable, to the Anthropic API, and to a prospect's public site.

## The day

1. **Today** lists due follow-ups first, then new first touches up to the caps
   (default 15 a day: 7 email, 4 LinkedIn, 3 Instagram, 1 call; change them
   with **⚙ Caps**). Follow-ups never consume a cap.
2. **Draft N missing** pre-writes the whole queue in one go.
3. Per row: **Draft** / **Redraft**, **Copy**, **Open** (Gmail compose with
   the exact text, or the LinkedIn / Instagram profile, or a `tel:` link),
   **Sent ✓**, **Snooze**, **Replied**, **Not interested**. Edits to the text
   are what get logged. Opening Gmail logs the send after a beat, because the
   compose window carries the exact text; DMs wait for the Sent button since
   they need a paste.
4. Sequences advance on Sent: email day 0 / +4 / +12, LinkedIn connect then
   message after they accept, Instagram DM then one follow-up, call then a
   second attempt. Replied takes them off the sequence and into the pipeline.

Keyboard on Today: `j` `k` move · `d` draft · `c` copy · `o` open · `s` sent ·
`z` snooze 3d · `r` replied · `x` not interested · `1`–`4` channel, `0` all ·
`e` edit the text · `Enter` open the drawer · `a` add · `/` search · `Esc`.

## Getting prospects in

- **＋ Add** in the header.
- **Import** a CSV (paste or file), columns matched by name, duplicates
  skipped by email, website domain, LinkedIn path, Instagram handle, or phone.
- **Bookmarklet** at `/bookmarklet`: one tap on a LinkedIn profile, an
  Instagram profile, a Google Maps listing, or any business site. Reads only
  the page on screen.
- **Inbound** tab: the site's own form leads (the `Leads` table), with a
  Promote button.
- **Research** (optional): `FPL_RESEARCH_ENABLED=1` adds a button that runs
  web searches for "property managers in Naperville" and lists candidates
  with sources. Roughly 5 to 15 cents a search; nothing is added until ticked.

## Tabs

| Tab | Holds |
|---|---|
| **Today** | The day's queue, per channel, with drafts and one-tap sends |
| **Pipeline** | Every prospect by stage, searchable; tap a row to edit it in the drawer |
| **Attention** | Replied and waiting on you, overdue, finished sequences still open, gone quiet |
| **Inbound** | Site form leads from Airtable, promote to prospect |
| **Activity** | The touch log, newest first |
| **Reporting** | Sent, replies, reply rate, and calls booked per week and channel |
| **Templates** | The fill-in fallbacks |
| **Clients / Campaigns** | Still the sample rows from `data/sample-data.json` |
| **Site** | The marketing-site QA log from `data/site-audit.json` |

## Files

```
server.mjs              routes, auth, the board cache
lib/store.mjs           Airtable or local JSON, one interface; column maps
lib/queue.mjs           who goes on Today (pure, tested)
lib/sequences.mjs       the four cadences (pure, tested)
lib/touches.mjs         Sent / Replied / Snoozed / stage changes
lib/drafter.mjs         the Claude call, validation, cache, batch jobs
lib/research.mjs        optional web-search research
lib/prospects.mjs       row shape, normalization, dedupe, CSV
lib/airtable.mjs        paced REST calls, schema probe
lib/report.mjs          weekly counts
lib/settings.mjs        caps
lib/localdate.mjs       Chicago dates everywhere
brief/                  the drafting doctrine and proof block
public/index.html       the board (single file)
public/bookmarklet.html / capture.html   one-tap capture
data/                   runtime data, gitignored except the two sample files
```

## Later: a paid email sender

When volume needs more than one Gmail account, export the email prospects
(`/api/prospects/export.csv?channel=email&status=active&markExternal=1`) into
Instantly or Smartlead. `markExternal` flips their sequence status so Today
stops offering them; replies still get logged here by hand.

## Isolation

This directory sits outside `src/` and `public/`, so Astro never sees it and
it cannot be published with the marketing site. It runs on a laptop or the
local network, never on a public host. Plain HTTP on a private network is the
accepted threat model.
