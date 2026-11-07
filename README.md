# ATLAS — the world you carry

A personal tracking sanctuary named for the Greek Titan who holds up the sky.
Built with Next.js (App Router), Tailwind, and a hand-made Greek design language
(parchment scrolls, gold leaf, meander borders, orbiting spheres).

## The journey

1. **`/login`** — The registry. A parchment **scroll** with turned wooden rods and
   gilt finials sits on the left; behind it the **ruins of a Greek temple at golden
   hour play as a looping video** (`public/assets/ruins-loop.mp4`, generated from
   `ruins-poster.png`). Any email + a 4-character password forges your world.
2. **`/hub`** — The Titan. A marble **Atlas kneels holding a glowing celestial
   sphere**; five **pillar spheres orbit the world** on tilted rings. Click a sphere
   → light blooms → the doorway opens.
3. Each sphere opens its own page with sub-branches (the pillar method):

| Sphere | Greek | Page(s) |
|---|---|---|
| **Work** | Ἔργον | `/work` (projects, tasks, time, income, ventures) → `/study` |
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
- **Scroll**: `components/ScrollFrame.tsx` — paper grain, aged edges, brass rods.
- **Stage**: `components/AtlasStage.tsx` — orbit math, canvas rings, DOM-driven
  sphere animation (no animation library), doorway transition.

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

### Signing in

- **The opening** (`/`) — the sign-in form stands on the opening screen, with
  the ribbon sphere woven behind it. Enter your email and password to sign in.
- **Enter without signing in** — a button on the form lets you come straight in
  without an account. Your world is kept in this browser only and is not
  synced to the cloud, until you make an account.
- **`/login`** — the same form, on its own page.
- **`/hub`** — the globe and the spheres you know.

### The written assistant

- **The docked orb** — once inside, the spinning orb sits on the left edge of
  every page. Press it to open `/atlas`.
- **The ribbon sphere** — a woven form of magenta, blue and teal that drifts on
  its own. It hangs behind the sign-in form on the opening screen.

## State

Local-first. Everything (session, projects, ledger, people, habits, journal…)
lives in `localStorage` through one tiny store in `lib/store.ts`, seeded with a
believable world so the pages are alive on first open.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```
