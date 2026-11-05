"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Empty } from "@/components/ui";
import { useAtlas, togglePlanStep, removePlan, prettyDate } from "@/lib/store";
import {
  askAtlas,
  isConfigured,
  loadAISettings,
  saveAISettings,
  speak,
  stopSpeaking,
  PROVIDERS,
  type ChatTurn,
} from "@/lib/atlas-ai";

/* ------------------------------------------------------------------ */
/*  Atlas — the awakened Titan. His body stands at the left; his      */
/*  mind answers at the right; his edicts reshape the world below.    */
/* ------------------------------------------------------------------ */

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: { label: string; ok: boolean }[];
  time: string;
};

const CHAT_KEY = "atlas.ai.chat.v1";
const MAX_HISTORY = 16; // turns sent to the model

type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

type RecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function loadChat(): Msg[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? (JSON.parse(raw) as Msg[]) : [];
  } catch {
    return [];
  }
}

const QUICK = [
  { label: "Analyse my world", prompt: "Analyse my world — what needs my attention most right now?" },
  { label: "Plan my tomorrow", prompt: "Look at my deadlines, habits and people, and lay a plan for tomorrow." },
  { label: "Who is drifting?", prompt: "Which people should I reach out to, and why? Use the cadence ledger." },
  { label: "Weigh my money", prompt: "Analyse my money: income, expenses, subscriptions. What do you advise?" },
];

export default function AtlasAssistantPage() {
  const s = useAtlas();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [configured, setConfigured] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");
  const [model, setModel] = useState("");
  const [speakOn, setSpeakOn] = useState(true);
  const [micSupported, setMicSupported] = useState(false);
  const recRef = useRef<RecognitionLike | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  /* hydrate chat + config */
  useEffect(() => {
    setMsgs(loadChat());
    const conf = isConfigured();
    setConfigured(conf);
    const st = loadAISettings();
    setProviderLabel(PROVIDERS[st.provider].label);
    setModel(st.model);
    setSpeakOn(st.speak);
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setMicSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-60)));
    } catch {}
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useEffect(() => () => stopSpeaking(), []);

  /* ---------------- voice in ---------------- */
  function startListening() {
    const w = window as unknown as {
      SpeechRecognition?: new () => RecognitionLike;
      webkitSpeechRecognition?: new () => RecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor || status !== "idle") return;
    stopSpeaking();
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    let heard = "";
    rec.onresult = (e) => {
      heard = e.results?.[0]?.[0]?.transcript ?? "";
    };
    rec.onend = () => {
      recRef.current = null;
      if (heard.trim()) {
        setDraft(heard.trim());
        void send(heard.trim());
      } else {
        setStatus("idle");
      }
    };
    rec.onerror = () => {
      recRef.current = null;
      setStatus("idle");
    };
    recRef.current = rec;
    setStatus("listening");
    rec.start();
  }

  function stopListening() {
    recRef.current?.stop();
  }

  /* ---------------- the oracle answers ---------------- */
  async function send(text: string) {
    const content = text.trim();
    if (!content || status === "thinking") return;
    if (!isConfigured()) {
      setMsgs((m) => [
        ...m,
        { id: `u${Date.now()}`, role: "user", content, time: nowTime() },
        {
          id: `a${Date.now()}`,
          role: "assistant",
          content:
            "I stand powerless. Open the Atlas Assistant Settings and lay an API key upon the altar — then I will wake.",
          time: nowTime(),
        },
      ]);
      return;
    }
    setDraft("");
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", content, time: nowTime() };
    setMsgs((m) => [...m, userMsg]);
    setStatus("thinking");

    const history: ChatTurn[] = [...msgs, userMsg].slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await askAtlas(history);
      const reply: Msg = {
        id: `a${Date.now()}`,
        role: "assistant",
        content: res.text,
        actions: res.actions,
        time: nowTime(),
      };
      setMsgs((m) => [...m, reply]);
      const st = loadAISettings();
      if (st.speak && reply.content) {
        setStatus("speaking");
        speak(reply.content, st, () => setStatus("idle"));
      } else {
        setStatus("idle");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "The way to Olympus is blocked.";
      setMsgs((m) => [
        ...m,
        {
          id: `a${Date.now()}`,
          role: "assistant",
          content: `⚠ I spoke into the void and the void refused the key.\n\n${msg}\n\nCheck your Atlas Assistant Settings — the key or the model may be wrong.`,
          time: nowTime(),
        },
      ]);
      setStatus("idle");
    }
  }

  const nowTime = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const statusLine: Record<VoiceStatus, string> = {
    idle: configured ? "The Titan is awake. Speak." : "The Titan sleeps — a key must be laid.",
    listening: "Listening… speak now.",
    thinking: "Atlas weighs your words…",
    speaking: "The Titan speaks…",
  };

  const activePlans = s.plans;

  return (
    <PageShell
      greek="Ὁ Τιτὰν ἐνεργός · the awakened titan"
      title="Atlas AI"
      subtitle="The mind that holds your world. Ask him to analyse it, add to it, strike from it, or lay a plan — then listen, for the Titan speaks."
      action={
        <Link href="/atlas/settings" className="btn-ghost btn-sm">
          Assistant settings
        </Link>
      }
    >
      {/* ---------------- the temple: body + oracle ---------------- */}
      <div className="grid gap-3.5 lg:grid-cols-[400px_1fr]">
        {/* ==== THE BODY ==== */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-wine bg-wineDeep">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/atlas-god.png"
              alt="The body of Atlas — warm-cream marble statue of the Titan bearing the celestial sphere"
              className="h-[490px] w-full object-cover object-top sm:h-[550px]"
            />
            {/* status orb */}
            <div className="absolute left-1/2 top-5 -translate-x-1/2">
              <div
                className={`grid h-14 w-14 place-items-center rounded-full border-2 ${
                  status === "idle"
                    ? "border-marble bg-wine"
                    : status === "listening"
                      ? "border-wine bg-marble anim-breathe"
                      : status === "thinking"
                        ? "border-marble bg-wine anim-breathe"
                        : "border-wine bg-marble anim-breathe"
                }`}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    stroke={status === "listening" || status === "speaking" ? "#28282A" : "#F5E8D3"}
                    strokeWidth="2"
                  />
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="8"
                    ry="3.4"
                    stroke={status === "listening" || status === "speaking" ? "#28282A" : "#F5E8D3"}
                    strokeWidth="1.4"
                  />
                </svg>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-wine px-5 py-4">
              <p className="font-ui text-[17px] uppercase tracking-[0.22em] text-marble opacity-85">The body of Atlas · v1.0 mind</p>
              <p className="mt-1.5 font-body text-[20.5px] italic leading-snug text-marble opacity-90">{statusLine[status]}</p>
              <div className="mt-3.5 flex items-center gap-2.5">
                {/* mic */}
                {micSupported && (
                  <button
                    onClick={status === "listening" ? stopListening : startListening}
                    disabled={status === "thinking" || status === "speaking"}
                    className={`grid h-12 w-12 place-items-center rounded-full border-2 transition-colors disabled:opacity-40 ${
                      status === "listening"
                        ? "border-marble bg-marble text-wine"
                        : "border-marble bg-wine text-marble hover:bg-marble hover:text-wine"
                    }`}
                    aria-label={status === "listening" ? "Stop listening" : "Speak to Atlas"}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                    </svg>
                  </button>
                )}
                {/* voice toggle */}
                <button
                  onClick={() => {
                    const next = !speakOn;
                    setSpeakOn(next);
                    stopSpeaking();
                    saveAISettings({ speak: next });
                  }}
                  className={`grid h-12 w-12 place-items-center rounded-full border-2 transition-colors ${
                    speakOn ? "border-marble bg-marble text-wine" : "border-marble bg-transparent text-marble"
                  }`}
                  aria-label={speakOn ? "Mute the Titan's voice" : "Give the Titan voice"}
                >
                  {speakOn ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                    </svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" />
                    </svg>
                  )}
                </button>
                <div className="ml-auto text-right">
                  <p className="font-ui text-[16.5px] uppercase tracking-[0.18em] text-marble opacity-75">powered by</p>
                  <p className="font-ui text-[18px] uppercase tracking-[0.14em] text-marble">
                    {configured ? `${providerLabel} · ${model}` : "no key laid"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==== THE ORACLE — chat ==== */}
        <Panel title="The oracle" hint="Type, or touch the disc and speak" tone="marble" className="flex flex-col">
          {!configured && (
            <div className="mb-3.5 rounded-xl border-2 border-wine bg-marbleDim px-4 py-3.5">
              <p className="font-ui text-[18px] uppercase tracking-[0.18em] text-wine">No API key laid</p>
              <p className="mt-1 font-body text-[20px] leading-snug text-wine opacity-85">
                Atlas has a body but no mind yet. Open{" "}
                <Link href="/atlas/settings" className="underline underline-offset-2">
                  Atlas Assistant Settings
                </Link>
                , paste any provider&apos;s key (OpenAI, Claude, Gemini…), test which model answers — and the Titan wakes.
              </p>
            </div>
          )}

          <div ref={transcriptRef} className="max-h-[450px] flex-1 space-y-3 overflow-y-auto pr-1">
            {msgs.length === 0 && (
              <div className="grid h-full min-h-[220px] place-items-center">
                <div className="text-center">
                  <p className="font-display text-[22px] tracking-[0.26em] text-wine opacity-65">Ἐρώτησις</p>
                  <p className="mt-2 font-body text-[21px] italic text-wine opacity-65">
                    Ask and it is weighed. Command and it is carved.
                  </p>
                </div>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl border-2 px-4 py-3 ${
                    m.role === "user" ? "border-wine bg-wine text-marble" : "border-wine bg-marbleDim text-wine"
                  }`}
                >
                  <p className="whitespace-pre-wrap font-body text-[20.5px] leading-relaxed">{m.content}</p>
                  {m.actions && m.actions.length > 0 && (
                    <div
                      className={`mt-2.5 space-y-1 border-t-2 pt-2 ${
                        m.role === "user" ? "border-marble/30" : "border-wine/20"
                      }`}
                    >
                      {m.actions.map((a, i) => (
                        <p key={i} className="font-ui text-[17.5px] uppercase tracking-[0.12em]">
                          {a.ok ? "⚒ " : "✕ "}
                          {a.label}
                        </p>
                      ))}
                    </div>
                  )}
                  <p
                    className={`mt-1.5 font-ui text-[16px] uppercase tracking-[0.16em] ${
                      m.role === "user" ? "text-marble opacity-75" : "text-wine opacity-60"
                    }`}
                  >
                    {m.role === "assistant" ? "Atlas · " : ""}
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
            {status === "thinking" && (
              <div className="flex justify-start">
                <div className="rounded-2xl border-2 border-wine bg-marbleDim px-4 py-3">
                  <p className="font-body text-[20px] italic text-wine opacity-75">The sphere shifts on his shoulders…</p>
                </div>
              </div>
            )}
          </div>

          {/* composer */}
          <div className="mt-4 flex items-stretch gap-2.5">
            <input
              className="field flex-1"
              placeholder={configured ? "Command the Titan… (try a quick edict below)" : "Lay a key in settings first…"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
            />
            <button className="btn-wine px-6" onClick={() => void send(draft)} disabled={status === "thinking"}>
              Send
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q.label}
                onClick={() => void send(q.prompt)}
                disabled={status === "thinking"}
                className="rounded-pill border-2 border-wine px-3.5 py-2 font-ui text-[17px] uppercase tracking-[0.12em] text-wine transition-colors hover:bg-wine hover:text-marble disabled:opacity-40"
              >
                {q.label}
              </button>
            ))}
            <button
              onClick={() => {
                setMsgs([]);
                try {
                  localStorage.removeItem(CHAT_KEY);
                } catch {}
              }}
              className="ml-auto rounded-pill border-2 border-transparent px-3.5 py-2 font-ui text-[17px] uppercase tracking-[0.12em] text-wine opacity-55 transition-opacity hover:opacity-100"
            >
              Clear memory
            </button>
          </div>
        </Panel>
      </div>

      {/* ---------------- plans + powers ---------------- */}
      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="The plans Atlas has laid" hint="Every 'plan' edict lands here — a staircase of steps you can climb">
          {activePlans.length === 0 ? (
            <Empty>No plans yet. Ask the Titan to lay one.</Empty>
          ) : (
            <div className="space-y-3.5">
              {activePlans.map((p) => {
                const done = p.steps.filter((x) => x.done).length;
                return (
                  <div key={p.id} className="rounded-xl border-2 border-wine bg-marbleDim p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-body text-[22px] font-semibold text-wine">{p.title}</p>
                        <p className="mt-0.5 font-ui text-[16.5px] uppercase tracking-[0.16em] text-wine opacity-65">
                          laid {prettyDate(p.created)} · {done}/{p.steps.length} climbed {p.byAtlas ? "· by the Titan" : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => removePlan(p.id)}
                        className="font-ui text-[18px] uppercase tracking-[0.14em] text-wine opacity-50 transition-opacity hover:opacity-100"
                        aria-label="Remove plan"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {p.steps.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => togglePlanStep(p.id, st.id)}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border-2 border-wine ${
                              st.done ? "bg-wine text-marble" : "bg-marble"
                            }`}
                          >
                            {st.done && <span className="text-[15px]">✓</span>}
                          </span>
                          <span className={`font-body text-[20.5px] ${st.done ? "text-wine line-through opacity-50" : "text-wine"}`}>
                            {st.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="The Titan's powers" hint="What the mind can do when given a key" tone="wine">
          <ul className="space-y-3.5">
            {[
              ["Ἀνάλυσις", "Analyse — he reads every pillar of your world and tells you what matters."],
              ["Πρόσθεσις", "Add — tasks, habits, people, journal entries, expenses, assignments."],
              ["Ἀφαίρεσις", "Remove — strike tasks, habits, projects, people and ledger entries."],
              ["Βουλή", "Plan — he lays staircases of steps that appear beside you."],
              ["Φωνή", "Voice — speak to him; he answers aloud, low, like stone moving."],
            ].map(([greek, line]) => (
              <li key={greek} className="flex gap-3.5">
                <span className="mt-0.5 w-32 shrink-0 font-display text-[19px] tracking-[0.06em] text-marble">{greek}</span>
                <span className="font-body text-[20px] leading-snug text-marble opacity-85">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t-2 border-marble/30 pt-4">
            <Link href="/atlas/settings" className="btn-gold btn-sm w-full">
              Power him with an API key
            </Link>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
