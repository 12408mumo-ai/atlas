"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Badge, Tabs, Empty } from "@/components/ui";
import { Meander } from "@/components/Ornaments";
import { useAtlas, addJournal, prettyDate, todayISO } from "@/lib/store";

const VIOLET = "#b79bd6";

const KIND_GLYPH: Record<string, string> = {
  journal: "✎",
  voice: "◍",
  photo: "▣",
  milestone: "★",
  log: "·",
};

export default function MemoriesPage() {
  const s = useAtlas();
  const [tab, setTab] = useState("timeline");
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState(4);

  function save() {
    if (!draft.trim()) return;
    addJournal({
      date: todayISO(),
      title: title.trim() || "Untitled day",
      text: draft.trim(),
      mood,
      kind: "journal",
    });
    setDraft("");
    setTitle("");
  }

  const entries = [...s.journal].sort((a, b) => b.date.localeCompare(a.date));
  const onThisDay = entries.filter((e) => e.date.slice(5) === todayISO().slice(5) && e.date !== todayISO());

  return (
    <PageShell
      greek="Μνῆμαι · the fourth pillar"
      title="Memories"
      subtitle="The timeline that cuts across everything. Every log from Work, Study, People and Life arrives here on its own."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Entries" value={`${entries.length}`} sub="kept so far" accent={VIOLET} />
        <Stat label="Streak" value="6 days" sub="writing, not streak-keeping" accent="#e2b563" />
        <Stat label="Milestones" value={`${entries.filter((e) => e.kind === "milestone").length}`} sub="worth remembering" accent="#7fae86" />
        <Stat label="On this day" value={`${onThisDay.length}`} sub="look-backs waiting" accent="#8fb3c9" />
      </div>

      <div className="mt-8">
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: "timeline", label: "Timeline" },
          { key: "write", label: "Today's entry" },
          { key: "onthisday", label: "On this day" },
          { key: "all", label: "All logs" },
        ]} />
      </div>

      <div className="mt-5">
        {tab === "timeline" && (
          <div className="relative">
            <span className="absolute bottom-0 left-[15px] top-2 w-px bg-gradient-to-b from-gold/50 via-gold/20 to-transparent" />
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.id} className="relative pl-11">
                  <span
                    className="absolute left-[9px] top-5 grid h-3.5 w-3.5 place-items-center rounded-full border"
                    style={{ borderColor: `${VIOLET}aa`, background: "#0b1119", boxShadow: `0 0 12px ${VIOLET}66` }}
                  >
                    <span className="h-1 w-1 rounded-full" style={{ background: VIOLET }} />
                  </span>
                  <article className="glass-soft rounded-sm p-5 transition hover:border-gold/25">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-ui text-[9px] uppercase tracking-[.24em] text-gold/70">{prettyDate(e.date)}</span>
                      {e.pillar && <Badge tone="dim">{e.pillar}</Badge>}
                      <Badge tone={e.kind === "milestone" ? "gold" : "blue"}>{e.kind}</Badge>
                      <span className="ml-auto font-ui text-[9px] tracking-[.18em] text-marble/30">mood {e.mood}/5</span>
                    </div>
                    <h3 className="mt-3 font-display text-[18px] tracking-[.02em] text-marble/90">{e.title}</h3>
                    <p className="mt-2 font-body text-[14px] leading-[1.75] text-marble/58">{e.text}</p>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "write" && (
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <Panel title="Today's entry" hint={prettyDate(todayISO())}>
              <input className="field mb-3" placeholder="Give the day a name" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea
                className="field min-h-[190px] resize-y leading-relaxed"
                placeholder="What actually happened? What did it cost, what did it give?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-ui text-[9px] uppercase tracking-[.22em] text-marble/35">Mood</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMood(n)}
                    className={`h-8 w-8 rounded-full border font-display text-[12px] transition ${mood >= n ? "border-gold/60 bg-gold/15 text-goldBright" : "border-white/10 text-marble/30"}`}
                  >
                    {n}
                  </button>
                ))}
                <span className="ml-auto flex gap-2">
                  <button className="btn-ghost" title="Voice entries would record here">
                    ◎ Voice
                  </button>
                  <button className="btn-ghost" title="Attach a photo">
                    ▣ Photo
                  </button>
                  <button onClick={save} className="btn-gold">Keep it</button>
                </span>
              </div>
            </Panel>
            <Panel title="Arriving on their own" hint="Automatic logs from the other pillars">
              <ul className="space-y-2.5">
                {[
                  ["Work", "Kavala milestone invoiced — $2,400"],
                  ["Study", "Greek II session · 50 min"],
                  ["People", "Spoke with Mum — 12 min"],
                  ["Life", "Habit kept: morning walk (12 days)"],
                  ["Life", "Mood recorded: 4/5"],
                ].map(([p, t]) => (
                  <li key={t} className="flex items-start gap-3 border-l border-white/10 pl-3">
                    <div>
                      <p className="font-ui text-[8.5px] uppercase tracking-[.2em] text-gold/60">{p}</p>
                      <p className="mt-0.5 font-body text-[13px] text-marble/75">{t}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-body text-[12px] italic text-marble/32">
                You never file these yourself. They surface from Work, Study, People and Life.
              </p>
            </Panel>
          </div>
        )}

        {tab === "onthisday" && (
          <Panel title="On this day" hint="The same date, other years">
            {onThisDay.length === 0 ? (
              <Empty>Nothing from this date yet. Year one begins now.</Empty>
            ) : (
              <ul className="space-y-3">
                {onThisDay.map((e) => (
                  <li key={e.id} className="border-l-2 border-[#8fb3c9]/50 pl-4">
                    <p className="font-ui text-[9px] uppercase tracking-[.24em] text-[#8fb3c9]/80">{e.date.slice(0, 4)}</p>
                    <p className="mt-1 font-display text-[17px] text-marble/88">{e.title}</p>
                    <p className="mt-1 font-body text-[13.5px] text-marble/55">{e.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "all" && (
          <Panel title="Everything, flat" hint="Filtered by where it came from">
            <ul className="divide-y divide-white/[.05]">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-3">
                  <span className="w-6 text-center font-display text-[14px] text-gold/70">{KIND_GLYPH[e.kind] ?? "·"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[13.5px] text-marble/85">{e.title}</p>
                    <p className="font-ui text-[9px] uppercase tracking-[.2em] text-marble/30">{prettyDate(e.date)} · {e.kind}</p>
                  </div>
                  <span className="font-ui text-[9px] uppercase tracking-[.18em] text-marble/35">{e.pillar ?? "Personal"}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <Meander className="mt-14" height={16} />
    </PageShell>
  );
}
