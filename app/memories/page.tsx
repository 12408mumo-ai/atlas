"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Badge, Tabs, Empty } from "@/components/ui";
import { MeanderWine } from "@/components/Ornaments";
import { useAtlas, addJournal, prettyDate, todayISO } from "@/lib/store";

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
        <Stat label="Entries" value={`${entries.length}`} sub="kept so far" />
        <Stat label="Streak" value="6 days" sub="writing, not streak-keeping" tone="gold" />
        <Stat label="Milestones" value={`${entries.filter((e) => e.kind === "milestone").length}`} sub="worth remembering" tone="wine" />
        <Stat label="On this day" value={`${onThisDay.length}`} sub="look-backs waiting" />
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
            <span className="absolute bottom-0 left-[16px] top-2 w-[3px] bg-gold" />
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.id} className="relative pl-11">
                  <span className="absolute left-[9px] top-5 grid h-4 w-4 place-items-center rounded-full border-2 border-wine bg-marble">
                    <span className="h-1.5 w-1.5 rounded-full bg-wine" />
                  </span>
                  <article className="rounded-2xl border-2 border-wine bg-marble p-5 transition-colors hover:border-gold">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-ui text-[13px] uppercase tracking-[0.22em] text-wine opacity-65">{prettyDate(e.date)}</span>
                      {e.pillar && <Badge tone="dim">{e.pillar}</Badge>}
                      <Badge tone={e.kind === "milestone" ? "gold" : "marble"}>{e.kind}</Badge>
                      <span className="ml-auto font-ui text-[13px] tracking-[0.16em] text-wine opacity-55">mood {e.mood}/5</span>
                    </div>
                    <h3 className="mt-3 font-display text-[20px] tracking-[0.02em] text-wine">{e.title}</h3>
                    <p className="mt-2 font-body text-[16px] leading-[1.75] text-wine opacity-75">{e.text}</p>
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
                <span className="font-ui text-[13px] uppercase tracking-[0.2em] text-wine opacity-60">Mood</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMood(n)}
                    className={`h-8 w-8 rounded-full border-2 border-wine font-display text-[15px] transition-colors ${mood >= n ? "bg-wine text-marble" : "bg-marble text-wine"}`}
                  >
                    {n}
                  </button>
                ))}
                <span className="ml-auto flex gap-2">
                  <button className="btn-ghost btn-sm" title="Voice entries would record here">
                    ◎ Voice
                  </button>
                  <button className="btn-ghost btn-sm" title="Attach a photo">
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
                  <li key={t} className="flex items-start gap-3 border-l-4 border-gold pl-3">
                    <div>
                      <p className="font-ui text-[12.5px] uppercase tracking-[0.18em] text-wine opacity-60">{p}</p>
                      <p className="mt-0.5 font-body text-[16px] text-wine">{t}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-body text-[15px] italic text-wine opacity-55">
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
                  <li key={e.id} className="border-l-4 border-wine pl-4">
                    <p className="font-ui text-[13px] uppercase tracking-[0.22em] text-wine opacity-65">{e.date.slice(0, 4)}</p>
                    <p className="mt-1 font-display text-[19px] text-wine">{e.title}</p>
                    <p className="mt-1 font-body text-[16.5px] text-wine opacity-75">{e.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "all" && (
          <Panel title="Everything, flat" hint="Filtered by where it came from">
            <ul className="divide-y-2 divide-gold">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-3">
                  <span className="w-6 text-center font-display text-[16px] text-wine opacity-70">{KIND_GLYPH[e.kind] ?? "·"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[16.5px] text-wine">{e.title}</p>
                    <p className="font-ui text-[13px] uppercase tracking-[0.18em] text-wine opacity-55">{prettyDate(e.date)} · {e.kind}</p>
                  </div>
                  <span className="font-ui text-[13px] uppercase tracking-[0.16em] text-wine opacity-60">{e.pillar ?? "Personal"}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <MeanderWine className="mt-14" height={16} />
    </PageShell>
  );
}
