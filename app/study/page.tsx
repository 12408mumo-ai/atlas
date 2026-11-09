"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/Chrome";
import { AtlasHoldButton } from "@/components/AtlasHoldButton";
import { Timetable } from "@/components/Timetable";
import { Panel, Stat, Bar, Badge, Tabs, Ring } from "@/components/ui";
import { MeanderWine } from "@/components/Ornaments";
import { useAtlas, setState, addStudySession, removeStudySession, relativeDue, prettyDate } from "@/lib/store";

export default function StudyPage() {
  const s = useAtlas();
  const [tab, setTab] = useState("timetable");
  const [skillName, setSkillName] = useState("");
  const [skillStatus, setSkillStatus] = useState("Just started");
  const [sessionSubject, setSessionSubject] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState("");
  const submitSession = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = Number(sessionMinutes);
    if (!sessionSubject.trim() || !Number.isInteger(minutes) || minutes < 1) return;
    addStudySession(sessionSubject, minutes);
    setSessionSubject(""); setSessionMinutes("");
  };
  const addSkill = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = skillName.trim();
    if (!name) return;
    setState((current) => ({ skills: [...current.skills, { id: crypto.randomUUID(), name, hours: 0, sessions: 0, status: skillStatus }] }));
    setSkillName("");
  };
  useEffect(() => {
    const allowed = ["timetable", "courses", "assignments", "self", "sessions"];
    const select = (value: unknown) => { if (typeof value === "string" && allowed.includes(value)) setTab(value); };
    select(new URLSearchParams(window.location.search).get("view"));
    const listener = (event: Event) => select((event as CustomEvent).detail);
    const history = () => select(new URLSearchParams(window.location.search).get("view"));
    window.addEventListener("atlas:show-view", listener);
    window.addEventListener("popstate", history);
    return () => { window.removeEventListener("atlas:show-view", listener); window.removeEventListener("popstate", history); };
  }, []);

  const open = s.assignments.filter((a) => a.status === "open");
  const avg = s.courses.length ? Math.round(s.courses.reduce((a, c) => a + c.progress, 0) / s.courses.length) : 0;

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
            <Timetable slots={s.timetable} />
          </Panel>
        )}

        {tab === "courses" && (
          <div className="grid gap-3.5 md:grid-cols-2">
            {s.courses.map((c) => (
              <Panel glass={false} key={c.id} title={c.title} hint={`${c.code} · next: ${c.next}`}>
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
              <Panel glass={false} key={k.id} title={k.name} hint={`${k.sessions} sessions · ${k.hours}h`}>
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
              <form className="space-y-3" onSubmit={addSkill}>
                <input className="field" aria-label="Subject or skill" placeholder="Subject or skill" value={skillName} onChange={(e) => setSkillName(e.target.value)} required />
                <select className="field" aria-label="Skill status" value={skillStatus} onChange={(e) => setSkillStatus(e.target.value)}>
                  <option>Just started</option>
                  <option>Practising</option>
                  <option>Compounding</option>
                  <option>Taught to others</option>
                </select>
                <AtlasHoldButton submit disabled={!skillName.trim()} className="w-full">Hold to add subject</AtlasHoldButton>
              </form>
            </Panel>
          </div>
        )}

        {tab === "sessions" && (
          <Panel title="Session log" hint="Time spent learning, shared with Work">
            {s.studySessions.length === 0 ? <p className="font-body text-lg italic text-wine/70">No sessions logged yet.</p> : <ul className="divide-y-2 divide-wine/20">
              {s.studySessions.map((session) => <li key={session.id} className="flex flex-wrap items-center gap-3 py-3.5">
                <div className="min-w-[120px] flex-1"><p className="break-words font-body text-xl text-wine">{session.subject}</p><p className="font-ui text-sm text-wine/70">{prettyDate(session.date)} · {session.durationMin} min</p></div>
                <AtlasHoldButton label={`Delete study session ${session.subject} on ${session.date}`} action={() => removeStudySession(session.id)}>Delete</AtlasHoldButton>
              </li>)}
            </ul>}
            <form onSubmit={submitSession} className="mt-4 flex flex-wrap items-end gap-3 border-t border-wine/20 pt-4">
              <label className="min-w-[130px] flex-1 font-ui text-sm text-wine">Subject<input className="field mt-1" placeholder="Subject" value={sessionSubject} onChange={(e) => setSessionSubject(e.target.value)} required /></label>
              <label className="w-24 font-ui text-sm text-wine">Minutes<input className="field mt-1" type="number" min="1" step="1" value={sessionMinutes} onChange={(e) => setSessionMinutes(e.target.value)} required /></label>
              <AtlasHoldButton submit disabled={!sessionSubject.trim()}>Add session</AtlasHoldButton>
            </form>
          </Panel>
        )}
      </div>

      <MeanderWine className="mt-14" height={16} />
    </PageShell>
  );
}
