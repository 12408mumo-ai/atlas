# ATLAS — the world you carry

A personal tracking sanctuary named for the Greek Titan who holds up the sky.
Built with Next.js (App Router), Tailwind, and a hand-made Greek design language
(parchment scrolls, gold leaf, meander borders, orbiting spheres).

## The journey

1. **`/` and `/login`** — Tap Zeus, then enter your PIN. Your world is stored
   locally in this browser.
2. **`/hub`** — A simple home page with links to each part of your world.
3. Choose a section to open it:

| Sphere | Greek | Page(s) |
|---|---|---|
| **Work** | Ἔργον | `/work` (projects, steps, clock tools) → `/study` |
| **Study** | Μάθησις | `/study` (timetable, courses, assignments/exams, self-learning, session log) |
| **People** | Ἄνθρωποι | `/people` (profiles, dates, promises, gifts, check-ins) |
| **Life** | Βίος | `/life` (goals, places, experiences and personal aspirations) |
| **Memories** | Μνῆμαι | `/memories` (journal, on-this-day, cross-pillar logs) |

Work and Study are the same pillar's two chambers — linked both ways.

## Design system

- **Type**: the requested Typekit kit (`https://use.typekit.net/iyo4kyx.css`) is
  loaded in `app/layout.tsx` with `--font-display / --font-body / --font-ui`
  variables. Graceful fallbacks (Cinzel, Cormorant Garamond, Jost) are linked so
  the Greek feeling holds even if the kit does not resolve.
- **Ornaments**: `components/Ornaments.tsx` — meander borders, laurel dividers,
  twinkling starfield, Greek-key corners.
- **Home**: `app/hub/page.tsx` — accessible links to the six sections.

## PIN access

Set server-only environment variables `ATLAS_PIN` (8–12 randomly chosen digits)
and `ATLAS_SESSION_SECRET` (at least 32 random characters) in Vercel, then
redeploy. Never use a `NEXT_PUBLIC_` prefix. Both must be set or Atlas stays
locked. The PIN gate issues an HTTP-only 12-hour session cookie. Changing the
session secret invalidates existing sessions. For local development use an
untracked `.env.local` and restart the server.

This gate protects app routes when online but is not encryption: browser-local
world data remains accessible to someone with access to the browser/device.
The built-in login attempt brake is per server instance, not a distributed rate
limit. Configure a shared rate limit or Vercel WAF and stronger authentication
before exposing a paid voice API or relying on this PIN against brute force.
PIN-protected navigation requires a network connection.

## AI

Connect an OpenRouter API key and model on `/atlas`. The key is stored in this
browser tab's sessionStorage and sent directly to OpenRouter with the command;
only the command, not the saved world, is sent. The model ID is kept in
localStorage. Provider usage may incur charges. The orb stays at the side of
the page: enable wake listening explicitly, then say “Atlas” followed by a
command (or type one). Supported actions are opening pages and Life categories,
and proposing additions to Life lists. Approve or cancel additions via voice or
the on-screen buttons. Other edits and deletions are not supported.

Wake listening needs microphone permission, a supported browser, and an open
tab; browser speech recognition may use a remote speech service. It is not a
system-wide wake word. Turn it off with “Stop listening”. The previous
assistant's data and settings are untouched; old keys may remain in browser
storage under `atlas.ai.v1` (localStorage) and `atlas.voice.test.v1`
(sessionStorage). Remove them in browser developer tools if no longer needed.

## Life

Keep goals, places, things to do and the person you want to become. Things to do
can include an image. Entries are stored locally; the previous Life data remains
in the saved world even though it is no longer displayed on the Life page.

## State

Local-first. World data, Memories, and the assistant model setting live in browser
`localStorage`, seeded with example data. Clearing browser data can erase them.
Life images, gallery photos and videos are stored in the browser too and are subject to its
limited storage quota. Previously uploaded remote media may no longer be available.
Existing account-specific browser caches are not automatically imported into the
local world, and previously cloud-synced data is not automatically downloaded.

## Run

Node.js 20.9 or later is required. The Next.js 16 upgrade removes `next lint`;
use the type-check command below until an ESLint configuration is added.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run typecheck
```
