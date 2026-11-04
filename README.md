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
