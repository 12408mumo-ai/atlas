"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Bar, Badge, Tabs, Empty, TwinLink } from "@/components/ui";
import { MeanderWine } from "@/components/Ornaments";
import { useAtlas, toggleTask, relativeDue, prettyDate, todayISO } from "@/lib/store";

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
        <Stat label="Costs" value={`$${expense.toLocaleString()}`} sub="software, space, tools" />
        <Stat label="Hours logged" value={`${hours}`} sub="across 3 projects" tone="gold" />
        <Stat label="Billable value" value={`$${billable.toLocaleString()}`} sub="hours × rate" tone="wine" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <TwinLink href="/study" greek="Μάθησις" name="Study →" blurb="Timetable, courses, assignments, exams and self-learning." image="/assets/emblems/study.png" />
        <TwinLink href="/memories" greek="Μνῆμαι" name="See the trail →" blurb="Every work log, milestone and payment lands in your timeline." image="/assets/emblems/memories.png" />
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
                  <div className="mb-3 flex items-center justify-between">
                    <Badge tone={p.status === "active" ? "gold" : "dim"}>{p.status}</Badge>
                    <span className="font-body text-[14.5px] italic text-wine opacity-60">
                      {p.hours}h · {done}/{p.tasks.length} done
                    </span>
                  </div>
                  <Bar value={done} max={p.tasks.length} />
                  <ul className="mt-4 space-y-2">
                    {p.tasks.map((t) => (
                      <li key={t.id}>
                        <button
                          onClick={() => toggleTask(p.id, t.id)}
                          className="flex w-full items-center gap-3 rounded-pill border-2 border-wine px-3 py-2 text-left transition-colors hover:bg-marbleDim"
                        >
                          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 border-wine text-[13px] ${t.done ? "bg-wine text-marble" : "bg-marble text-transparent"}`}>
                            ✓
                          </span>
                          <span className={`flex-1 font-body text-[16px] text-wine ${t.done ? "opacity-45 line-through" : ""}`}>{t.title}</span>
                          <span className="font-ui text-[13px] tracking-[0.12em] text-wine opacity-60">{relativeDue(t.due)}</span>
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
              <ul className="divide-y-2 divide-gold">
                {openTasks
                  .sort((a, b) => a.due.localeCompare(b.due))
                  .map((t) => {
                    const project = s.projects.find((p) => p.tasks.some((x) => x.id === t.id))!;
                    const late = t.due < todayISO();
                    return (
                      <li key={t.id} className="flex items-center gap-4 py-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${late ? "bg-wine" : "bg-wine/35"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-body text-[16px] text-wine">{t.title}</p>
                          <p className="font-ui text-[13px] uppercase tracking-[0.18em] text-wine opacity-55">{project.name}</p>
                        </div>
                        <span className="font-ui text-[13.5px] uppercase tracking-[0.14em] text-wine opacity-70">
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
                      <span className="font-body text-[16.5px] text-wine">{p.name}</span>
                      <span className="font-ui text-[14px] tracking-[0.12em] text-wine opacity-70">{p.hours}h</span>
                    </div>
                    <Bar value={p.hours} max={Math.max(...s.projects.map((x) => x.hours))} color={p.client === "Own venture" ? "gold" : "wine"} />
                    <p className="mt-1 font-body text-[14px] italic text-wine opacity-50">{p.client}</p>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Week at a glance" hint="Where the hours went">
              <div className="grid grid-cols-7 items-end gap-2 pt-2">
                {[3.5, 6, 5, 7.5, 4, 2, 1].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end rounded-t-md border-2 border-wine bg-marbleDim">
                      <div className="w-full rounded-t-sm bg-wine" style={{ height: `${(h / 8) * 100}%` }} />
                    </div>
                    <span className="font-ui text-[12px] uppercase tracking-[0.1em] text-wine opacity-55">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                    <span className="font-ui text-[12px] text-wine opacity-45">{h}h</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {tab === "money" && (
          <Panel title="The ledger" hint="Invoices in, costs out — nothing left unrecorded">
            <ul className="divide-y-2 divide-gold">
              {s.ledger.map((l) => (
                <li key={l.id} className="flex items-center gap-4 py-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full border-2 text-[14px] ${l.kind === "income" ? "border-wine bg-marble text-wine" : "border-wine bg-wine text-marble"}`}>
                    {l.kind === "income" ? "↓" : "↑"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[16px] text-wine">{l.label}</p>
                    <p className="font-ui text-[13px] uppercase tracking-[0.18em] text-wine opacity-55">{l.bucket} · {prettyDate(l.date)}</p>
                  </div>
                  <span className="font-display text-[17px] text-wine">
                    {l.kind === "income" ? "+" : "−"}${l.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-pill border-2 border-wine bg-marbleDim px-4 py-2.5">
              <span className="font-ui text-[14px] uppercase tracking-[0.24em] text-wine">Net</span>
              <span className="font-display text-[21px] text-wine">${(income - expense).toLocaleString()}</span>
            </div>
          </Panel>
        )}

        {tab === "ventures" && (
          <div className="grid gap-3 md:grid-cols-2">
            {s.projects.filter((p) => p.client === "Own venture").map((p) => (
              <Panel key={p.id} title={p.name} hint="Yours: no client, no invoice, just the work">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Hours" value={`${p.hours}h`} />
                  <Stat label="Open tasks" value={`${p.tasks.filter((t) => !t.done).length}`} tone="gold" />
                </div>
                <ul className="mt-4 space-y-2">
                  {p.tasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-pill border-2 border-wine px-3 py-2">
                      <span className="font-body text-[16px] text-wine">{t.title}</span>
                      <span className="font-ui text-[13px] tracking-[0.12em] text-wine opacity-60">{relativeDue(t.due)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
            <Panel title="Start another venture" hint="A new venture lives here beside the client work" tone="wine">
              <div className="space-y-3">
                <input className="field" placeholder="Name of the venture" />
                <input className="field" placeholder="What is it for? (one line)" />
                <button className="btn-gold w-full">Begin</button>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <MeanderWine className="mt-14" height={16} />
    </PageShell>
  );
}
