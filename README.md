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

Atlas can use `smallthinker:3b` in Ollama on your computer through an
authenticated ngrok gateway. The browser sends only your command to the Atlas
server, which sends it to the gateway; no saved world data or gateway secret is
sent to the browser. Model output is validated against a fixed set of actions;
Life additions need approval. Without gateway settings, exact local commands
such as “open Life” and “add visit Kyoto to places” continue to work.

### Set up the gateway (Windows)

1. Install Ollama and ngrok, sign in to ngrok and configure its authtoken
   directly on your computer following ngrok's instructions. Do not share tokens.
   Run `ollama run smallthinker:3b` once to download the model and use `/bye`
   to exit the chat; Ollama must remain running.
2. Make a private traffic policy file **outside this repository**, such as
   `%USERPROFILE%\atlas-ngrok-policy.yml`, with the following structure. Replace
   the example values with your own username (letters, digits, `_` or `-`) and
   a strong random password of at least 16 printable characters. Never share it:

   ```yaml
   on_http_request:
     - actions:
         - type: basic-auth
           config:
             credentials:
               - 'YOUR_USERNAME:YOUR_LONG_RANDOM_PASSWORD'
   ```

3. Start the tunnel with the policy enabled:
   `ngrok http 11434 --host-header=rewrite --traffic-policy-file "%USERPROFILE%\atlas-ngrok-policy.yml"`.
   Never start a public Ollama tunnel without its authentication policy. The
   gateway gives access to Ollama to anyone who knows the credentials. Confirm
   an unauthenticated request receives HTTP 401 before proceeding.
4. In Vercel's project environment settings, set `OLLAMA_GATEWAY_URL` to the
   HTTPS ngrok origin (no path), `OLLAMA_GATEWAY_USER` to your username, and
   `OLLAMA_GATEWAY_PASSWORD` to the matching password. Mark the credentials
   sensitive; do not use `NEXT_PUBLIC_` or put values in chat. Save for the
   required environments and redeploy. ngrok URLs can change; update the URL
   and redeploy when necessary. Only ngrok-hosted HTTPS origins are accepted.
5. Keep both Ollama and ngrok running on the laptop. Unlock Atlas and try a
   command. If the tunnel is offline, Atlas reports an error. The model may
   misunderstand; check proposed changes before approving.

The existing PIN's per-instance attempt brake is not a shared brute-force
limit. Configure a distributed limit or Vercel WAF and stronger access control
before making this gateway available to untrusted users. Basic auth secures the
ngrok endpoint but is not a replacement for Atlas access control.

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
