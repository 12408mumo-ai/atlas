"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Bar, Badge, Tabs, Empty, TwinLink } from "@/components/ui";
import { Meander } from "@/components/Ornaments";
import { useAtlas, toggleTask, relativeDue, prettyDate, todayISO } from "@/lib/store";

const GOLD = "#e2b563";

export default function WorkPage() {
  const s = useAtlas();
  const [tab, setTab] = useState("projects");

  const income = s.ledger.filter((l) => l.kind === "income").reduce((a, b) => a + b.amount, 0);
  const expense = s.ledger.filter((l) => l.kind === "expense").reduce((a, b) => a + b.amount, 0);
  const hours = s.projects.reduce((a, p) => a + p.hours, 0);
  const billable = s.projects.reduce((a, p) => a + p.hours * p.rate, 0);
  const openTasks = s.projects.flatMap((p) => p.tasks.filter((t) => !t.done));

  return (
    <PageShell
      greek="Ἔργον · the first pillar"
      title="Work"
      subtitle="What you build, what it earns, and how long it truly takes. Two doors below: client work, and study."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Invoiced" value={`$${income.toLocaleString()}`} sub="this season" />
        <Stat label="Costs" value={`$${expense.toLocaleString()}`} sub="software, space, tools" accent="#d98f7a" />
        <Stat label="Hours logged" value={`${hours}`} sub="across 3 projects" accent="#8fb3c9" />
        <Stat label="Billable value" value={`$${billable.toLocaleString()}`} sub="hours × rate" accent="#7fae86" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <TwinLink href="/study" greek="Μάθησις" name="Study →" blurb="Timetable, courses, assignments, exams and self-learning." />
        <TwinLink href="/memories" greek="Μνῆμαι" name="See the trail →" blurb="Every work log, milestone and payment lands in your timeline." />
      </div>

      <div className="mt-8">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "projects", label: "Projects & clients" },
            { key: "tasks", label: "Tasks & deadlines" },
            { key: "time", label: "Time" },
            { key: "money", label: "Income & expenses" },
            { key: "ventures", label: "Own ventures" },
          ]}
        />
      </div>

      <div className="mt-5">
        {tab === "projects" && (
          <div className="grid gap-3 md:grid-cols-2">
            {s.projects.filter((p) => p.client !== "Own venture").map((p) => {
              const done = p.tasks.filter((t) => t.done).length;
              return (
                <Panel key={p.id} title={p.name} hint={`${p.client} · $${p.rate}/h`}>
                  <div className="mb-4 flex items-center justify-between text-[11.5px]">
                    <Badge tone={p.status === "active" ? "green" : "dim"}>{p.status}</Badge>
                    <span className="font-body italic text-marble/40">{p.hours}h · {done}/{p.tasks.length} done</span>
                  </div>
                  <Bar value={done} max={p.tasks.length} accent={GOLD} />
                  <ul className="mt-4 space-y-2">
                    {p.tasks.map((t) => (
                      <li key={t.id}>
                        <button
                          onClick={() => toggleTask(p.id, t.id)}
                          className="flex w-full items-center gap-3 border border-white/[.05] px-3 py-2 text-left transition hover:border-gold/25 hover:bg-gold/[.03]"
                        >
                          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] ${t.done ? "border-gold bg-gold text-[#1a1206]" : "border-white/25 text-transparent"}`}>✓</span>
                          <span className={`flex-1 font-body text-[13px] ${t.done ? "text-marble/35 line-through" : "text-marble/85"}`}>{t.title}</span>
                          <span className={`font-ui text-[9px] tracking-[.14em] ${t.due < todayISO() && !t.done ? "text-[#e5a794]" : "text-marble/35"}`}>{relativeDue(t.due)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Panel>
              );
            })}
          </div>
        )}

        {tab === "tasks" && (
          <Panel title="Every open task" hint={`${openTasks.length} in flight · sorted by the nearest stone`}>
            {openTasks.length === 0 ? (
              <Empty>Nothing open. The shoulders are light.</Empty>
            ) : (
              <ul className="divide-y divide-white/[.05]">
                {openTasks
                  .sort((a, b) => a.due.localeCompare(b.due))
                  .map((t) => {
                    const project = s.projects.find((p) => p.tasks.some((x) => x.id === t.id))!;
                    const late = t.due < todayISO();
                    return (
                      <li key={t.id} className="flex items-center gap-4 py-3">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: late ? "#d98f7a" : GOLD }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-body text-[14px] text-marble/85">{t.title}</p>
                          <p className="font-ui text-[9px] uppercase tracking-[.2em] text-marble/30">{project.name}</p>
                        </div>
                        <span className={`font-ui text-[9.5px] uppercase tracking-[.16em] ${late ? "text-[#e5a794]" : "text-gold/70"}`}>
                          {prettyDate(t.due)} · {relativeDue(t.due)}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Panel>
        )}

        {tab === "time" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="Time per project" hint="Hours as they actually happened">
              <ul className="space-y-4">
                {s.projects.map((p) => (
                  <li key={p.id}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-body text-[13.5px] text-marble/80">{p.name}</span>
                      <span className="font-ui text-[10px] tracking-[.14em] text-gold/80">{p.hours}h</span>
                    </div>
                    <Bar value={p.hours} max={Math.max(...s.projects.map((x) => x.hours))} accent={p.client === "Own venture" ? "#8fb3c9" : GOLD} />
                    <p className="mt-1 font-body text-[11px] italic text-marble/30">{p.client}</p>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Week at a glance" hint="Where the hours went">
              <div className="grid grid-cols-7 items-end gap-2 pt-2">
                {[3.5, 6, 5, 7.5, 4, 2, 1].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end bg-white/[.04]">
                      <div className="w-full rounded-t-sm" style={{ height: `${(h / 8) * 100}%`, background: "linear-gradient(180deg,#f3d79a,#a97b36)" }} />
                    </div>
                    <span className="font-ui text-[8px] uppercase tracking-[.1em] text-marble/30">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                    <span className="font-ui text-[8px] text-marble/25">{h}h</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {tab === "money" && (
          <Panel title="The ledger" hint="Invoices in, costs out — nothing left unrecorded">
            <ul className="divide-y divide-white/[.05]">
              {s.ledger.map((l) => (
                <li key={l.id} className="flex items-center gap-4 py-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] ${l.kind === "income" ? "border-laurel/40 text-laurel" : "border-[#d98f7a]/40 text-[#e5a794]"}`}>
                    {l.kind === "income" ? "↓" : "↑"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[14px] text-marble/85">{l.label}</p>
                    <p className="font-ui text-[9px] uppercase tracking-[.2em] text-marble/30">{l.bucket} · {prettyDate(l.date)}</p>
                  </div>
                  <span className={`font-display text-[15px] ${l.kind === "income" ? "text-laurel" : "text-[#e5a794]"}`}>
                    {l.kind === "income" ? "+" : "−"}${l.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between border-t border-gold/20 pt-4">
              <span className="font-ui text-[10px] uppercase tracking-[.26em] text-marble/45">Net</span>
              <span className="font-display text-[20px] gold-text">${(income - expense).toLocaleString()}</span>
            </div>
          </Panel>
        )}

        {tab === "ventures" && (
          <div className="grid gap-3 md:grid-cols-2">
            {s.projects.filter((p) => p.client === "Own venture").map((p) => (
              <Panel key={p.id} title={p.name} hint="Yours: no client, no invoice, just the work">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Hours" value={`${p.hours}h`} />
                  <Stat label="Open tasks" value={`${p.tasks.filter((t) => !t.done).length}`} accent="#8fb3c9" />
                </div>
                <ul className="mt-4 space-y-2">
                  {p.tasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between border border-white/[.05] px-3 py-2">
                      <span className="font-body text-[13px] text-marble/80">{t.title}</span>
                      <span className="font-ui text-[9px] tracking-[.14em] text-marble/35">{relativeDue(t.due)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
            <Panel title="Start another venture" hint="A new venture lives here beside the client work">
              <div className="space-y-3">
                <input className="field" placeholder="Name of the venture" />
                <input className="field" placeholder="What is it for? (one line)" />
                <button className="btn-gold w-full">Begin</button>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Meander className="mt-14" height={16} />
    </PageShell>
  );
}
