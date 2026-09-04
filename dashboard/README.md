# Growth Command — internal dashboard

A local-only, PIN-gated board for running FrontPage Labs' pipeline and outreach.

```
npm run dashboard      # http://localhost:4787
```

Default PIN is `2468`. **Set `FPL_DASH_PIN` before this ever points at real
client data.**

## What this is

The wireframe is deliberately modeled on the Chicagoland Auto Fair "Event
Command" dashboard — same architecture and the same screen grammar, because
that layout has been proven in live use:

| CAF                          | Here                                        |
| ---------------------------- | ------------------------------------------- |
| Bare Node `http`, no express | same                                        |
| Single-file vanilla frontend | same                                        |
| PIN → HMAC HttpOnly cookie   | same                                        |
| Header → stat deck → tabs → panels → detail drawer | same             |

Nothing was copied out of the CAF repo and the CAF repo was not modified. The
car-selling domain does not carry over — there are no sellers, cars, VINs,
stickers, scans or event-day tabs here.

## Tabs

| Tab           | Holds                                                              |
| ------------- | ------------------------------------------------------------------ |
| **Pipeline**  | Prospects by stage (New → Contacted → Call Booked → Proposal → Won/Lost), searchable and stage-filterable |
| **Outreach**  | Reusable channel copy (cold email, LinkedIn, Instagram, call scripts) with copy buttons, plus the follow-up queue sorted by what's due |
| **Clients**   | Active retainers, MRR, account health, next deliverable            |
| **Campaigns** | Per-client channel spend with derived CPL and ROAS                 |
| **Attention** | Overdue follow-ups, deals gone quiet 7+ days, at-risk accounts     |
| **Activity**  | Chronological feed of pipeline events                              |
| **Site**      | The marketing-site QA log from `data/site-audit.json`: what was fixed in the last pass and what is still suggested, filterable by phone/desktop. Real data, unlike the rest |

Tapping any row opens the detail drawer.

## Data

Everything renders from `data/sample-data.json` — placeholder records so the
wireframe is browsable end to end. **None of it is real.**

To connect a real CRM, replace `loadData()` in `server.mjs`. The JSON shape it
returns is the contract the frontend reads, so if a real source is mapped into
the same shape, nothing in `public/index.html` needs to change.

Writes are not implemented. Stage changes, logged touches and notes are
read-only until there's a system of record behind them.

## Isolation

This directory sits outside `src/` and `public/`, so Astro never sees it and it
cannot be published with the marketing site. It is meant to run on a laptop or
the local network, never on a public host.

The server binds `0.0.0.0` so a phone on the same Wi-Fi can reach it at the
LAN address. Plain HTTP on a private network is the accepted threat model —
same as CAF's board.

## Environment

| Variable          | Default          | Purpose                                    |
| ----------------- | ---------------- | ------------------------------------------ |
| `FPL_DASH_PIN`    | `2468`           | Shared team PIN. Changing it signs everyone out. |
| `FPL_DASH_PORT`   | `4787`           | Port                                       |
| `FPL_DASH_STAFF`  | `Danish`         | Comma-separated names for the sign-in picker |
