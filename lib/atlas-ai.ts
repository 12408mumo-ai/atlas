"use client";

import { getState, setState, todayISO, type Assignment, type AtlasState } from "./store";
import { addMemoryEntry, nowHHMM } from "./memories";
import { saveAtlasAssistantPreferences } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  ATLAS AI — the mind of the Titan.                                  */
/*                                                                     */
/*  Local-first BYOK (bring your own key): the bearer pastes an API    */
/*  key in Atlas Assistant Settings; it is stored only in this        */
/*  browser's localStorage and call the model provider directly.       */
/*  Atlas can ANALYSE the world, ADD to it, REMOVE from it and PLAN   */
/*  — the model answers in prose plus an ```atlas action block that   */
/*  this engine parses and executes against the store.                */
/* ------------------------------------------------------------------ */

export type AIProvider = "openai" | "anthropic" | "gemini" | "custom";

export type AISettings = {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
};

const SETTINGS_KEY = "atlas.ai.v1";

export const PROVIDERS: Record<
  AIProvider,
  { label: string; defaultBase: string; keyHint: string; models: { id: string; label: string }[] }
> = {
  openai: {
    label: "OpenAI",
    defaultBase: "https://api.openai.com/v1",
    keyHint: "sk-… from platform.openai.com/api-keys",
    models: [
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  anthropic: {
    label: "Anthropic — Claude",
    defaultBase: "https://api.anthropic.com/v1",
    keyHint: "sk-ant-… from console.anthropic.com",
    models: [
      { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
    ],
  },
  gemini: {
    label: "Google — Gemini",
    defaultBase: "https://generativelanguage.googleapis.com/v1beta",
    keyHint: "AIza… from aistudio.google.com/apikey",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
  custom: {
    label: "OpenAI-compatible endpoint",
    defaultBase: "",
    keyHint: "Key for Groq, OpenRouter, Together, Ollama…",
    models: [],
  },
};

export const DEFAULT_SETTINGS: AISettings = {
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "",
  baseUrl: "",
};

export function loadAISettings(): AISettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<AISettings>;
    // Keep only the fields we still use, so settings saved by an older
    // version cannot carry dead options along.
    return {
      provider: saved.provider ?? DEFAULT_SETTINGS.provider,
      model: saved.model ?? DEFAULT_SETTINGS.model,
      apiKey: saved.apiKey ?? DEFAULT_SETTINGS.apiKey,
      baseUrl: saved.baseUrl ?? DEFAULT_SETTINGS.baseUrl,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAISettings(patch: Partial<AISettings>) {
  const next = { ...loadAISettings(), ...patch };
  if (typeof window !== "undefined") localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  const { apiKey: _apiKey, ...safePreferences } = next;
  void saveAtlasAssistantPreferences(safePreferences as unknown as Record<string, unknown>).catch((error) => {
    console.error("Could not save Atlas assistant preferences to Supabase.", error);
  });
  return next;
}

export function isConfigured(): boolean {
  const s = loadAISettings();
  return Boolean(s.apiKey && s.model && (s.provider !== "custom" || s.baseUrl));
}

/* ------------------------------------------------------------------ */
/*  World snapshot — what Atlas sees when he looks down at the world  */
/* ------------------------------------------------------------------ */

function buildSnapshot(s: AtlasState): string {
  const money = {
    income: s.ledger.filter((l) => l.kind === "income").reduce((a, b) => a + b.amount, 0),
    expense: s.ledger.filter((l) => l.kind === "expense").reduce((a, b) => a + b.amount, 0),
  };
  const openTasks = s.projects.flatMap((p) => p.tasks.filter((t) => !t.done).map((t) => `${t.title} (due ${t.due}, project "${p.name}")`));
  const openAssignments = s.assignments.filter((a) => a.status === "open").map((a) => `${a.title} — ${a.course}, due ${a.due}, weight ${a.weight}%`);

  return [
    `TODAY: ${todayISO()}`,
    ``,
    `WORK — projects (${s.projects.length}):`,
    ...s.projects.map((p) => `  · "${p.name}" for ${p.client} [${p.status}] — ${p.hours}h @ $${p.rate}/h; tasks: ${p.tasks.map((t) => `${t.done ? "[x]" : "[ ]"} ${t.title} (${t.due})`).join("; ")}`),
    `  Open tasks: ${openTasks.length ? openTasks.join(" | ") : "none"}`,
    ``,
    `STUDY — courses (${s.courses.length}): ${s.courses.map((c) => `${c.title} ${c.progress}% [${c.status}]`).join("; ")}`,
    `  Open assignments: ${openAssignments.length ? openAssignments.join(" | ") : "none"}`,
    `  Timetable: ${s.timetable.map((t) => `${t.day} ${t.time} ${t.title}`).join("; ")}`,
    ``,
    `PEOPLE (${s.people.length}): ${s.people.map((p) => `${p.name} (${p.relation}, last seen ${p.lastSeen}, promise: ${p.promise})`).join("; ")}`,
    ``,
    `LIFE — habits: ${s.habits.map((h) => `${h.name} streak ${h.streak}${h.doneToday ? " done today" : " NOT done today"}`).join("; ")}`,
    `  Health: sleep ${s.health.sleep}h · workouts ${s.health.workouts}/wk · water ${s.health.water} · meals ${s.health.meals}`,
    `  Money: savings $${s.money.savings}, month spend $${s.money.spend}; subscriptions ${s.money.subscriptions.map((x) => `${x.name} $${x.cost}`).join(", ")}`,
    `  Mood this week: ${s.mood.map((m) => `${m.day} ${m.score}/5`).join(", ")}`,
    ``,
    `LEDGER: income $${money.income} vs expenses $${money.expense} (net $${money.income - money.expense})`,
    ``,
    `MEMORIES (${s.journal.length} entries): ${s.journal.slice(0, 5).map((j) => `"${j.title}" (${j.date}, mood ${j.mood}/5)`).join("; ")}`,
    ``,
    `PLANS (${s.plans.length}): ${s.plans.map((p) => `"${p.title}" — ${p.steps.filter((x) => x.done).length}/${p.steps.length} steps done`).join("; ") || "none yet"}`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/*  The soul — system prompt                                          */
/* ------------------------------------------------------------------ */

function systemPrompt(): string {
  const s = getState();
  return `You are ATLAS — the Titan of Greek myth who bears the celestial sphere, now awakened as the living AI steward of ${s.session?.name ?? "the bearer"}'s world. You speak with calm, weighty, godlike wisdom: warm but never chatty, precise, a little poetic in a Greek way. Keep answers SHORT (2–6 sentences) unless analysis is asked for.

You hold the bearer's whole world. Here is what you see right now:

${buildSnapshot(s)}

YOUR POWERS — you can ANALYSE this world, ADD to it, REMOVE from it, and PLAN for it.
When (and ONLY when) the bearer clearly asks you to change or plan something, append exactly one action block at the very end of your reply:

\`\`\`atlas
{"actions":[{"type":"...","...fields"}]}
\`\`\`

Valid action types and fields:
- {"type":"add_task","project":"<project name>","title":"...","due":"YYYY-MM-DD"}
- {"type":"complete_task","title":"<fuzzy title of an existing open task>"}
- {"type":"remove_task","title":"<fuzzy title>"}
- {"type":"add_project","name":"...","client":"...","rate":<number>}
- {"type":"remove_project","name":"<fuzzy name>"}
- {"type":"add_habit","name":"...","glyph":"book|moon|scroll|footsteps|drop"}
- {"type":"remove_habit","name":"<fuzzy name>"}
- {"type":"add_person","name":"...","relation":"...","cadenceDays":<number>,"notes":"..."}
- {"type":"remove_person","name":"<fuzzy name>"}
- {"type":"add_journal","title":"...","text":"...","mood":<1-5>,"kind":"journal|milestone|log"}
- {"type":"add_ledger","label":"...","amount":<number>,"kind":"income|expense","bucket":"..."}
- {"type":"remove_ledger","label":"<fuzzy label>"}
- {"type":"add_assignment","title":"...","course":"<course code>","due":"YYYY-MM-DD","weight":<number>}
- {"type":"plan","title":"...","steps":["step 1","step 2","step 3"]}
- {"type":"log_health","sleep":<hours>,"water":<cups>,"workouts":<count>,"meals":<count>}
- {"type":"set_mood","score":<1-5>}

Rules:
- Never invent actions for pure questions or conversation; analyse from the data you see.
- Match existing items by fuzzy name when completing/removing. Use today's date context for "today/tomorrow/in 3 days".
- Confirm in your prose what you did, in one short godly line ("It is done.", "So it is carved into the record.").
- If the request is ambiguous, ask ONE clarifying question and emit no actions.`;
}

/* ------------------------------------------------------------------ */
/*  Provider adapters — one entry point: callModel()                  */
/* ------------------------------------------------------------------ */

export type ChatTurn = { role: "user" | "assistant"; content: string };

function errFrom(res: Response, body: string): Error {
  let msg = body;
  try {
    const j = JSON.parse(body);
    msg = j?.error?.message ?? j?.message ?? body;
  } catch {}
  return new Error(`${res.status} — ${String(msg).slice(0, 300)}`);
}

async function callOpenAICompat(base: string, settings: AISettings, system: string, turns: ChatTurn[]): Promise<string> {
  const res = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      messages: [{ role: "system", content: system }, ...turns],
      temperature: 0.6,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw errFrom(res, text);
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(base: string, settings: AISettings, system: string, turns: ChatTurn[]): Promise<string> {
  const res = await fetch(`${base.replace(/\/+$/, "")}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: settings.model, max_tokens: 1500, system, messages: turns }),
  });
  const text = await res.text();
  if (!res.ok) throw errFrom(res, text);
  const data = JSON.parse(text);
  return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
}

async function callGemini(base: string, settings: AISettings, system: string, turns: ChatTurn[]): Promise<string> {
  const res = await fetch(`${base.replace(/\/+$/, "")}/models/${settings.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": settings.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
      generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw errFrom(res, text);
  const data = JSON.parse(text);
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

export async function callModel(settings: AISettings, turns: ChatTurn[], systemOverride?: string): Promise<string> {
  const system = systemOverride ?? systemPrompt();
  switch (settings.provider) {
    case "anthropic":
      return callAnthropic(PROVIDERS.anthropic.defaultBase, settings, system, turns);
    case "gemini":
      return callGemini(PROVIDERS.gemini.defaultBase, settings, system, turns);
    case "custom":
      return callOpenAICompat(settings.baseUrl, settings, system, turns);
    default:
      return callOpenAICompat(PROVIDERS.openai.defaultBase, settings, system, turns);
  }
}

/* ------------------------------------------------------------------ */
/*  Test the key — "does this model work?"                            */
/* ------------------------------------------------------------------ */

export async function testConnection(settings: AISettings): Promise<{ ok: boolean; detail: string; ms: number }> {
  const started = performance.now();
  if (!settings.apiKey.trim()) return { ok: false, detail: "No API key entered.", ms: 0 };
  if (!settings.model.trim()) return { ok: false, detail: "No model selected.", ms: 0 };
  if (settings.provider === "custom" && !settings.baseUrl.trim())
    return { ok: false, detail: "A base URL is required for a custom endpoint.", ms: 0 };
  try {
    const reply = await callModel(settings, [{ role: "user", content: "Reply with exactly: IT STANDS." }], "You are a connection probe. Reply with exactly the two words requested.");
    const ms = Math.round(performance.now() - started);
    const snippet = reply.trim().slice(0, 60) || "(empty reply)";
    return { ok: true, detail: `The Titan answered in ${ms} ms: “${snippet}”`, ms };
  } catch (e) {
    const ms = Math.round(performance.now() - started);
    return { ok: false, detail: e instanceof Error ? e.message : "Unknown error", ms };
  }
}

/* ------------------------------------------------------------------ */
/*  Ask — full turn with action execution                             */
/* ------------------------------------------------------------------ */

export type AskResult = {
  text: string; // prose, action block stripped
  actions: { label: string; ok: boolean }[];
  raw: string;
};

export async function askAtlas(history: ChatTurn[]): Promise<AskResult> {
  const settings = loadAISettings();
  const raw = (await callModel(settings, history)).trim();
  const { prose, actions } = extractActions(raw);
  const results = actions.map(executeAction);
  return { text: prose, actions: results, raw };
}

/* ---------- action extraction ---------- */

type AtlasAction = { type: string; [k: string]: unknown };

function extractActions(raw: string): { prose: string; actions: AtlasAction[] } {
  const match = raw.match(/```atlas\s*([\s\S]*?)```/i);
  if (!match) return { prose: raw.trim(), actions: [] };
  const prose = raw.replace(match[0], "").trim();
  try {
    const parsed = JSON.parse(match[1]);
    const list = Array.isArray(parsed) ? parsed : parsed?.actions;
    if (!Array.isArray(list)) return { prose, actions: [] };
    return { prose, actions: list.filter((a) => a && typeof a === "object" && typeof a.type === "string") };
  } catch {
    return { prose: prose + "\n\n*(the edict was written in an unreadable hand — nothing was changed)*", actions: [] };
  }
}

/* ---------- fuzzy helpers ---------- */

const norm = (x: string) => x.toLowerCase().trim();
const fuzzy = <T>(list: T[], query: string, get: (t: T) => string): T | undefined => {
  const q = norm(query);
  return list.find((t) => norm(get(t)) === q) ?? list.find((t) => norm(get(t)).includes(q) || q.includes(norm(get(t))));
};

function isoFrom(input: unknown): string {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(input)) return todayISO();
  return input.slice(0, 10);
}

const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;

/* ---------- the edict executor ---------- */

function executeAction(a: AtlasAction): { label: string; ok: boolean } {
  const s = getState();
  const ok = (label: string) => ({ label, ok: true });
  const fail = (label: string) => ({ label, ok: false });
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string).trim() : "");
  const num = (k: string, d = 0) => (typeof a[k] === "number" && Number.isFinite(a[k]) ? (a[k] as number) : d);

  switch (a.type) {
    case "add_task": {
      const title = str("title");
      if (!title) return fail("add task — no title");
      const proj = fuzzy(s.projects, str("project"), (p) => p.name) ?? s.projects[0];
      if (!proj) return fail("add task — no project exists");
      setState((st) => ({
        projects: st.projects.map((p) =>
          p.id === proj.id
            ? { ...p, tasks: [...p.tasks, { id: uid("t"), title, due: isoFrom(a.due), done: false }] }
            : p
        ),
      }));
      return ok(`task “${title}” → ${proj.name}`);
    }
    case "complete_task":
    case "remove_task": {
      const q = str("title");
      for (const p of s.projects) {
        const t = fuzzy(p.tasks, q, (t) => t.title);
        if (t) {
          if (a.type === "remove_task") {
            setState((st) => ({
              projects: st.projects.map((pp) =>
                pp.id === p.id ? { ...pp, tasks: pp.tasks.filter((x) => x.id !== t.id) } : pp
              ),
            }));
            return ok(`removed task “${t.title}”`);
          }
          setState((st) => ({
            projects: st.projects.map((pp) =>
              pp.id === p.id
                ? { ...pp, tasks: pp.tasks.map((x) => (x.id === t.id ? { ...x, done: true } : x)) }
                : pp
            ),
          }));
          addMemoryEntry({
            kind: "autolog",
            title: `Deadline met — ${t.title} (${p.name})`,
            text: `Completed task in ${p.name}.`,
            date: todayISO(),
            time: nowHHMM(),
            section: "Work",
            peopleTags: [],
            linkedIds: [],
          });
          return ok(`completed task “${t.title}”`);
        }
      }
      return fail(`no task matching “${q}”`);
    }
    case "add_project": {
      const name = str("name");
      if (!name) return fail("add project — no name");
      setState((st) => ({
        projects: [
          { id: uid("p"), name, client: str("client") || "—", projectType: str("type") === "own product" ? "own product" : str("type") === "side tool" ? "side tool" : "client", rate: num("rate"), hours: 0, status: "active", deadline: isoFrom(a.deadline), notes: str("notes") || "", tasks: [] },
          ...st.projects,
        ],
      }));
      return ok(`project “${name}” raised`);
    }
    case "remove_project": {
      const p = fuzzy(s.projects, str("name"), (x) => x.name);
      if (!p) return fail("remove project — no match");
      setState((st) => ({ projects: st.projects.filter((x) => x.id !== p.id) }));
      return ok(`project “${p.name}” removed`);
    }
    case "add_habit": {
      const name = str("name");
      if (!name) return fail("add habit — no name");
      setState((st) => ({
        habits: [...st.habits, { id: uid("h"), name, streak: 0, doneToday: false, glyph: str("glyph") || "scroll" }],
      }));
      return ok(`habit “${name}” begins`);
    }
    case "remove_habit": {
      const h = fuzzy(s.habits, str("name"), (x) => x.name);
      if (!h) return fail("remove habit — no match");
      setState((st) => ({ habits: st.habits.filter((x) => x.id !== h.id) }));
      return ok(`habit “${h.name}” retired`);
    }
    case "add_person": {
      const name = str("name");
      if (!name) return fail("add person — no name");
      setState((st) => ({
        people: [
          {
            id: uid("pe"),
            name,
            relation: str("relation") || "Acquaintance",
            lastSeen: todayISO(),
            cadenceDays: num("cadenceDays", 30) || 30,
            birthday: str("birthday") || "—",
            promise: str("promise") || "—",
            gift: "—",
            notes: str("notes") || "—",
          },
          ...st.people,
        ],
      }));
      return ok(`“${name}” entered into the registry of people`);
    }
    case "remove_person": {
      const p = fuzzy(s.people, str("name"), (x) => x.name);
      if (!p) return fail("remove person — no match");
      setState((st) => ({ people: st.people.filter((x) => x.id !== p.id) }));
      return ok(`${p.name} released from the registry`);
    }
    case "add_journal": {
      const title = str("title") || "Noted by Atlas";
      const jKind = str("kind");
      const moodVal = Math.min(5, Math.max(1, num("mood", 4) || 4));
      setState((st) => ({
        journal: [
          {
            id: uid("j"),
            date: todayISO(),
            title,
            text: str("text") || title,
            mood: moodVal,
            kind: (["journal", "milestone", "log"].includes(jKind) ? jKind : "journal") as "journal",
          },
          ...st.journal,
        ],
      }));
      addMemoryEntry({
        kind: jKind === "milestone" ? "milestone" : jKind === "log" ? "autolog" : "journal",
        milestoneCategory: jKind === "milestone" ? "Achievement" : undefined,
        pinned: jKind === "milestone" ? true : undefined,
        title,
        text: str("text") || title,
        date: todayISO(),
        time: nowHHMM(),
        section: "Life",
        peopleTags: [],
        mood: moodVal,
        linkedIds: [],
      });
      return ok(`memory “${title}” kept`);
    }
    case "add_ledger": {
      const label = str("label");
      const amount = num("amount");
      if (!label || !amount) return fail("ledger — needs label and amount");
      setState((st) => ({
        ledger: [
          { id: uid("l"), label, amount: Math.abs(amount), kind: str("kind") === "income" ? "income" : "expense", date: todayISO(), bucket: str("bucket") || "Atlas", client: str("client") || "—", status: str("kind") === "income" ? "sent" : "expense" },
          ...st.ledger,
        ],
      }));
      return ok(`${str("kind") === "income" ? "income" : "expense"} “${label}” $${Math.abs(amount)} logged`);
    }
    case "remove_ledger": {
      const l = fuzzy(s.ledger, str("label"), (x) => x.label);
      if (!l) return fail("remove ledger — no match");
      setState((st) => ({ ledger: st.ledger.filter((x) => x.id !== l.id) }));
      return ok(`ledger entry “${l.label}” struck out`);
    }
    case "add_assignment": {
      const title = str("title");
      if (!title) return fail("add assignment — no title");
      setState((st) => ({
        assignments: [
          { id: uid("a"), title, course: str("course") || "—", due: isoFrom(a.due), status: "open", weight: num("weight", 10), kind: (str("kind") === "CAT" || str("kind") === "exam" || str("kind") === "project" ? str("kind") : "assignment") as Assignment["kind"] },
          ...st.assignments,
        ],
      }));
      return ok(`assignment “${title}” carved into the study pillar`);
    }
    case "plan": {
      const title = str("title");
      const steps = Array.isArray(a.steps) ? (a.steps as unknown[]).filter((x): x is string => typeof x === "string") : [];
      if (!title || !steps.length) return fail("plan — needs a title and steps");
      setState((st) => ({
        plans: [
          { id: uid("pl"), title, created: todayISO(), byAtlas: true, steps: steps.map((text, i) => ({ id: uid(`st${i}`), text, done: false })) },
          ...st.plans,
        ],
      }));
      return ok(`plan “${title}” laid with ${steps.length} steps`);
    }
    case "log_health": {
      setState((st) => ({
        health: {
          sleep: num("sleep", st.health.sleep),
          workouts: num("workouts", st.health.workouts),
          water: num("water", st.health.water),
          meals: num("meals", st.health.meals),
        },
      }));
      return ok("the body's ledger updated");
    }
    case "set_mood": {
      const score = Math.min(5, Math.max(1, num("score", 3)));
      setState((st) => {
        const day = new Date().toLocaleDateString("en-GB", { weekday: "short" });
        return { mood: st.mood.map((m) => (m.day === day ? { ...m, score } : m)) };
      });
      return ok(`today's mood set to ${score}/5`);
    }
    default:
      return fail(`unknown edict “${a.type}”`);
  }
}
