# ATLAS — the world you carry

A personal tracking sanctuary named for the Greek Titan who holds up the sky.
Built with Next.js (App Router), Tailwind, and a hand-made Greek design language
(parchment scrolls, gold leaf, meander borders, orbiting spheres).

## The journey

1. **`/` and `/login`** — Tap the face of Zeus to enter Atlas without an account. Your world is stored
   locally in this browser.
2. **`/hub`** — A simple home page with links to each part of your world.
3. Choose a section to open it:

| Sphere | Greek | Page(s) |
|---|---|---|
| **Work** | Ἔργον | `/work` (projects, steps, clock tools) → `/study` |
| **Study** | Μάθησις | `/study` (timetable, courses, assignments/exams, self-learning, session log) |
| **People** | Ἄνθρωποι | `/people` (profiles, dates, promises, gifts, check-ins) |
| **Life** | Βίος | `/life` (health, money, habits, mood 1–5) |
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

## Atlas AI — the awakened Titan

The world now has a mind and a body.

- **`/atlas`** — the assistant temple. A marble **Greek-god body**
  (`public/assets/atlas-god.png`) stands at the left; the oracle chat at the right.
  Atlas can **analyse** the whole world, **add** to it (tasks, habits, people,
  journal, ledger, assignments), **remove** from it, and **lay plans** (staircases
  of steps kept in `state.plans`). Commands come back as ```atlas action edicts
  that `lib/atlas-ai.ts` parses and executes against the store.
- **`/atlas/settings`** — Atlas Assistant Settings. **Bring your own key**:
  OpenAI, Anthropic (Claude), Google Gemini, or any OpenAI-compatible endpoint
  (Groq, OpenRouter, Ollama…). Pick a model, hit **Test the key** to probe which
  model answers, and the key powers every reply. The key lives only in this
  browser's localStorage; calls go straight from browser to provider.

### Entering Atlas

Open `/` or `/login` and choose **Enter Atlas**. No account is required.
Your world is stored in this browser on this device; it does not sync between devices.

### The written assistant

- **The docked orb** — once inside, the spinning orb sits on the left edge of
  app page. Press it to open the conversation.
- **The entry face** — tap the face of Zeus to open your locally stored world.

## State

Local-first. World data, Memories, assistant settings, and chat live in browser
`localStorage`, seeded with example data. Clearing browser data can erase them.
Gallery photos and videos are stored in the browser too and are subject to its
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
