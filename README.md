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
- **Voice** — touch the disc on his body and *speak* (Web Speech recognition);
  with the voice switch on, Atlas reads every reply aloud, pitched low like
  moving stone. Voice choice lives in settings.
- **`/atlas/settings`** — Atlas Assistant Settings. **Bring your own key**:
  OpenAI, Anthropic (Claude), Google Gemini, or any OpenAI-compatible endpoint
  (Groq, OpenRouter, Ollama…). Pick a model, hit **Test the key** to probe which
  model answers, and the key powers every reply. The key lives only in this
  browser's localStorage; calls go straight from browser to provider.

### The spoken demo assistant

A voice assistant that runs with no API key, so the whole loop can be
demonstrated immediately.

- **The opening** (`/`) — a sphere of golden particles hangs in the dark.
  They drift on slow currents and carry a warm glow. The orb greets you by
  the time of day and asks whether to proceed. There is no button anywhere:
  answer **yes** by voice and it asks for your **voice pass**; speak the
  digits and the app opens. The first digits you speak become your pass. Set
  or change it later in **Atlas AI Settings → Voice pass**.
- **The voice waves** — while Atlas speaks, rings travel outward from the
  centre of the sphere and the particles brighten. While the microphone is
  open the particles draw gently inward.
- **The docked tab** — once inside, a small **Atlas** tab sits on the left edge
  of every page. Press it to open the assistant panel. Say **"Atlas"** and the
  panel wakes up and listens.
- **The microphone stays open.** The mic pauses while Atlas speaks so it never
  hears itself, then reopens on its own. You never have to reach for a button
  between saying a command and answering "yes".
- **What it can do** — `lib/commands.ts` turns speech into a structured action
  and `lib/commands-exec.ts` runs it against the real store, so every change
  syncs to Supabase like any other edit. It covers tasks, projects, hours,
  expenses and income, people, habits, journal notes, plans, assignments,
  course progress, study sessions, health, mood, and subscriptions — adding,
  editing, completing and deleting.
- **Every change is confirmed out loud** before it runs. Say **yes** to go
  ahead or **no** to leave it be. Nothing changes without your word.
- Typing works everywhere, so the assistant is usable without a microphone.
- **Deep chat** in the panel header opens `/atlas`, the written chat with a
  real model when you have set a key.

`lib/voice.ts` holds the speech layer: a continuous listening session that
survives the browser dropping the mic, spoken-number to digit conversion
("seven hundred forty two" → `742`), wake-word detection, and yes/no intent
matching that reads the first meaningful word of a reply.

`lib/voice-pass.ts` holds the spoken pass — the rule that decides whether the
app opens. It is one place, tested on its own, so the entry and the settings
page can never disagree about it.

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
