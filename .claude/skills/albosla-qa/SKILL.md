---
name: albosla-qa
description: Walk البوصلة's client workflows in the browser preview (desktop + mobile) to find UX/layout/copy issues. Use when asked to test, QA, audit, or check the albosla client experience.
---

# البوصلة client-workflow QA

## Setup
Dev server config lives at `~/.claude/launch.json` (name `albosla-dev`, port 3000, runs the albosla dev server). Start/attach with the preview tools, then log in as the client.

```
preview_start name=albosla-dev  →  serverId
preview_resize preset=mobile    (375×812) or desktop
```
Log in at `/ar/auth`: fill `input[type=email]`=`user@albosla.test`, `input[type=password]`=`Albosla123!`, click `button[type=submit]`. (Admin: `admin@albosla.test`, same password.) Session can drop after server restarts — re-login if a dashboard route bounces to `/ar/auth`.

Click precisely via JS when generic selectors are ambiguous:
`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='ابدأ')?.click()`

## Client workflows to cover
1. Home (marketing) — hero, journey road, testimonials, vlogs, CTAs
2. Auth — login / signup / magic-link tabs
3. Workshops — list, filter chips, detail, sessions/prices
4. Booking — `/book/general` (individual slots) & `/book/<sessionId>`: session card, step bar, payment methods (InstaPay 01027857707 / Vodafone Cash 01223810409), receipt upload, confirm
5. Dashboard — stats, compass card, upcoming sessions
6. Roadmap — goals kanban, mentor-notes tab, progress timeline
7. Compass — `/dashboard/compass` 21-question assessment + reading
8. My Bookings, Materials, Profile

## What to check
- **Copy**: Egyptian 3amya + "المنتور" (see `albosla-egyptian-copy`); no English leaking into Arabic UI.
- **Layout**: mobile 375px — no horizontal scroll, sidebar collapses to icon rail, kanban stacks, cards full-width. RTL: use logical props (`insetInlineEnd`, `-end-*`), `dir="ltr"` on URLs.
- **Flows**: no dead-ends/404s (e.g. compass session CTA → `/book/general`, not `/book`); links resolve; empty states are friendly.
- **Data**: booking always has future slots; prices correct.

Report issues grouped by severity with `file:line`, then fix in priority order and redeploy (`albosla-deploy`).
