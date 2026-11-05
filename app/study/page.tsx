"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Bar, Badge, Tabs, Ring } from "@/components/ui";
import { MeanderWine } from "@/components/Ornaments";
import { useAtlas, relativeDue, prettyDate } from "@/lib/store";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function StudyPage() {
  const s = useAtlas();
  const [tab, setTab] = useState("timetable");

  const open = s.assignments.filter((a) => a.status === "open");
  const avg = Math.round(s.courses.reduce((a, c) => a + c.progress, 0) / s.courses.length);

  return (
    <PageShell
      greek="Μάθησις · the second chamber of Work"
      title="Study"
      subtitle="The school timetable and the syllabus, then the learning you choose for yourself. Both are weighed here."
    >
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Courses" value={`${s.courses.length}`} sub={`${s.courses.filter((c) => c.status === "complete").length} complete`} />
        <Stat label="Average progress" value={`${avg}%`} sub="across all courses" tone="gold" />
        <Stat label="Open assignments" value={`${open.length}`} sub="before the term ends" />
        <Stat label="Self-learning" value={`${s.skills.reduce((a, k) => a + k.hours, 0)}h`} sub={`${s.skills.length} skills practised`} tone="wine" />
      </div>

      <div className="mt-8">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "timetable", label: "Timetable" },
            { key: "courses", label: "Course list" },
            { key: "assignments", label: "Assignments & exams" },
            { key: "self", label: "Self-learning" },
            { key: "sessions", label: "Session log" },
          ]}
        />
      </div>

      <div className="mt-5">
        {tab === "timetable" && (
          <Panel title="The week" hint="Where you are expected to be">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {DAYS.map((d) => {
                const slots = s.timetable.filter((x) => x.day === d);
                return (
                  <div key={d} className="rounded-xl border-2 border-wine bg-marble">
                    <p className="border-b-2 border-wine px-3.5 py-2.5 font-ui text-[17.5px] uppercase tracking-[0.2em] text-wine">{d}</p>
                    <div className="space-y-2.5 p-2.5">
                      {slots.length === 0 && <p className="px-1 py-4 text-center font-body text-[19px] italic text-wine opacity-45">free</p>}
                      {slots.map((sl) => (
                        <div key={sl.id} className="rounded-lg border-2 border-wine bg-marbleDim px-3 py-2.5">
                          <p className="font-ui text-[17px] tracking-[0.1em] text-wine">{sl.time}</p>
                          <p className="mt-0.5 font-body text-[20px] leading-snug text-wine">{sl.title}</p>
                          <p className="mt-1 font-body text-[18.5px] italic text-wine opacity-70">{sl.place}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {tab === "courses" && (
          <div className="grid gap-3.5 md:grid-cols-2">
            {s.courses.map((c) => (
              <Panel key={c.id} title={c.title} hint={`${c.code} · next: ${c.next}`}>
                <div className="flex items-center gap-5">
                  <Ring value={c.progress} max={100} label={`${c.progress}%`} color={c.status === "complete" ? "gold" : "wine"} sub={c.status} size={104} />
                  <div className="flex-1">
                    <Bar value={c.progress} color={c.status === "complete" ? "gold" : "wine"} />
                    <p className="mt-3 font-body text-[20px] italic text-wine opacity-65">
                      {c.status === "complete" ? "Closed and kept." : `Currently at ${c.progress}% — keep the thread.`}
                    </p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {tab === "assignments" && (
          <Panel title="Due and weighing" hint="Weight is the share of the final mark">
            <ul className="divide-y-2 divide-wine/20">
              {s.assignments
                .sort((a, b) => a.due.localeCompare(b.due))
                .map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-[20.5px] text-wine">{a.title}</p>
                      <p className="font-ui text-[17px] uppercase tracking-[0.15em] text-wine opacity-60">{a.course} · weighs {a.weight}%</p>
                    </div>
                    <Badge tone={a.status === "open" ? "marble" : "wine"}>
                      {a.status}
                    </Badge>
                    <span className="hidden w-44 text-right font-ui text-[17.5px] uppercase tracking-[0.1em] text-wine opacity-75 sm:block">
                      {prettyDate(a.due)}
                      <br />
                      <span className="opacity-75">{relativeDue(a.due)}</span>
                    </span>
                  </li>
                ))}
            </ul>
          </Panel>
        )}

        {tab === "self" && (
          <div className="grid gap-3.5 md:grid-cols-3">
            {s.skills.map((k) => (
              <Panel key={k.id} title={k.name} hint={`${k.sessions} sessions · ${k.hours}h`}>
                <div className="flex items-center gap-4">
                  <Ring value={k.hours} max={40} label={`${k.hours}h`} color="gold" size={98} />
                  <div>
                    <Badge tone="gold">{k.status}</Badge>
                    <p className="mt-2 font-body text-[19.5px] italic text-wine opacity-65">
                      {k.hours < 10 ? "Fresh — protect the first ten hours." : "Compounding quietly."}
                    </p>
                  </div>
                </div>
              </Panel>
            ))}
            <Panel title="Add a subject" hint="Anything you are teaching yourself">
              <div className="space-y-3">
                <input className="field" placeholder="Subject or skill" />
                <select className="field">
                  <option>Just started</option>
                  <option>Practising</option>
                  <option>Compounding</option>
                  <option>Taught to others</option>
                </select>
                <button className="btn-wine w-full">Add subject</button>
              </div>
            </Panel>
          </div>
        )}

        {tab === "sessions" && (
          <Panel title="Session log" hint="What you sat with, for how long, and what it gave you">
            <ul className="divide-y-2 divide-wine/20">
              {[
                { d: 0, subj: "Greek II — aorist drills", mins: 50, note: "Paradigm finally stuck." },
                { d: 0, subj: "Type design — lowercase g", mins: 75, note: "Three variants, none right yet." },
                { d: -1, subj: "Statistics reading", mins: 40, note: "Regression chapter, again." },
                { d: -2, subj: "Greek II — Odyssey IX", mins: 60, note: "Read aloud; rhythm helped." },
                { d: -3, subj: "Speaking practice", mins: 20, note: "Recorded, re-listened, cringed." },
              ].map((x, i) => {
                const date = new Date();
                date.setDate(date.getDate() + x.d);
                return (
                  <li key={i} className="flex items-start gap-4 py-3.5">
                    <div className="w-20 shrink-0 font-ui text-[17px] uppercase tracking-[0.12em] text-wine opacity-65">
                      {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-[21px] text-wine">{x.subj}</p>
                      <p className="mt-0.5 font-body text-[19.5px] italic text-wine opacity-60">{x.note}</p>
                    </div>
                    <span className="font-ui text-[18px] tracking-[0.1em] text-wine opacity-75">{x.mins}m</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-wine/20 pt-4">
              <input className="field flex-1" placeholder="Log a session — subject, minutes, one line" />
              <button className="btn-wine shrink-0">Log</button>
            </div>
          </Panel>
        )}
      </div>

      <MeanderWine className="mt-14" height={16} />
    </PageShell>
  );
}
