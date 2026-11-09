"use client";

import { WorkClock } from "@/components/WorkClock";
import { AtlasHoldButton } from "@/components/AtlasHoldButton";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MemorySphere, type SphereGlyph } from "@/components/MemorySphere";
import { Timetable } from "@/components/Timetable";
import {
  addDeadline,
  addInvoice,
  addProject,
  addStudySession,
  addSubject,
  relativeDue,
  prettyDate,
  todayISO,
  toggleDeadline,
  toggleTask,
  useAtlas,
  type Assignment,
  type Course,
  type Project,
} from "@/lib/store";

/* ------------------------------------------------------------------ */
/*  Work Page — Simple Sphere Navigation                              */
/*  Work                                                             */
/*  ├── Work (Projects · Hours logged · Money)                      */
/*  └── Study (Timetable · Deadlines · Subjects · Study sessions)   */
/* ------------------------------------------------------------------ */

type GroupKey = "work" | "study";
type SectionKey =
  | "projects"
  | "hours"
  | "money"
  | "timetable"
  | "deadlines"
  | "subjects"
  | "sessions";

const GROUPS: { key: GroupKey; name: string; sub: string; glyph: SphereGlyph; phase: number }[] = [
  { key: "work", name: "Work", sub: "Projects, hours, money", glyph: "work", phase: 0.2 },
  { key: "study", name: "Study", sub: "Timetable, deadlines, subjects", glyph: "study", phase: 1.5 },
];

const SECTIONS: {
  key: SectionKey;
  name: string;
  sub: string;
  glyph: SphereGlyph;
  group: GroupKey;
  phase: number;
}[] = [
  { key: "projects", name: "Projects", sub: "Client work & ventures", glyph: "projects", group: "work", phase: 0.3 },
  { key: "hours", name: "Hours logged", sub: "Time as it happened", glyph: "hours", group: "work", phase: 1.1 },
  { key: "money", name: "Money", sub: "Invoices & costs", glyph: "money", group: "work", phase: 1.9 },
  { key: "timetable", name: "Timetable", sub: "The week ahead", glyph: "timetable", group: "study", phase: 2.7 },
  { key: "deadlines", name: "Deadlines", sub: "What's due", glyph: "deadlines", group: "study", phase: 3.5 },
  { key: "subjects", name: "Subjects", sub: "School & self-learning", glyph: "subjects", group: "study", phase: 4.3 },
  { key: "sessions", name: "Study sessions", sub: "Time spent learning", glyph: "sessions", group: "study", phase: 5.1 },
];

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function projectStatusLabel(s: Project["status"]) {
  return s === "active" ? "In progress" : s === "paused" ? "Paused" : "Done";
}

function courseStatusLabel(s: Course["status"]) {
  return s === "active" ? "In progress" : s === "complete" ? "Done" : "Planned";
}

export default function WorkPage() {
  const router = useRouter();
  const atlas = useAtlas();

  const [docked, setDocked] = useState(false);
  const [group, setGroup] = useState<GroupKey | null>(null);
  const [section, setSection] = useState<SectionKey | null>(null);

  // Glide the Work sphere from center to the left on open
  useEffect(() => {
    const id = requestAnimationFrame(() => setDocked(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleBackPress = () => {
    if (section !== null) {
      setSection(null);
      return;
    }
    if (group !== null) {
      setGroup(null);
      return;
    }
    router.push("/hub");
  };

  const openSectionMeta = SECTIONS.find((s) => s.key === section);
  const openGroupMeta = GROUPS.find((g) => g.key === group);

  // Sections of the currently open group (for the right rail)
  const groupSections = useMemo(
    () => SECTIONS.filter((s) => s.group === group),
    [group]
  );

  return (
    <div className="glass-page relative min-h-[100svh] w-screen overflow-x-hidden text-wine">
      {/* ================================================================ */}
      {/* 1. LEFT WORK SPHERE (glides left on open; press to go back)     */}
      {/* ================================================================ */}
      <div
        style={{
          transition:
            "left 700ms cubic-bezier(0.22, 1, 0.36, 1), top 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={
          docked
            ? "fixed left-[38px] top-[92px] z-50 -translate-x-1/2 -translate-y-1/2 scale-100 sm:left-[54px] sm:top-[104px]"
            : "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 scale-[1.45]"
        }
      >
        <button
          type="button"
          onClick={handleBackPress}
          aria-label="Go back"
          className="group flex cursor-pointer flex-col items-center focus-visible:outline-none"
        >
          <div className="hidden transition-transform duration-200 group-hover:scale-105 sm:block">
            <MemorySphere glyph="work" size={78} tone="wine" speed={0.5} />
          </div>
          <div className="transition-transform duration-200 group-hover:scale-105 sm:hidden">
            <MemorySphere glyph="work" size={60} tone="wine" speed={0.5} />
          </div>
          <span className="mt-1 rounded-pill border border-wine bg-marble px-2.5 py-0.5 font-ui text-[13px] text-wine transition-colors group-hover:bg-wine group-hover:text-marble">
            ← Back
          </span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* 2. RIGHT SCROLLABLE SPHERE RAIL                                  */}
      {/*    • section open   -> the other sections of this group          */}
      {/*    • group open     -> the other group, for switching             */}
      {/* ================================================================ */}
      <aside
        aria-label="Other sections"
        style={{
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 450ms ease",
        }}
        className={
          section !== null || group !== null
            ? "glass-rail fixed right-2 top-1/2 z-40 max-h-[80svh] w-[78px] -translate-y-1/2 translate-x-0 overflow-y-auto py-3 opacity-100 sm:right-5 sm:w-[104px]"
            : "pointer-events-none fixed right-5 top-1/2 z-40 max-h-[80svh] w-[104px] -translate-y-1/2 translate-x-36 opacity-0"
        }
      >
        <div className="flex flex-col items-center gap-5">
          {section !== null
            ? groupSections
                .filter((s) => s.key !== section)
                .map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setSection(s.key);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="group flex cursor-pointer flex-col items-center transition-transform duration-200 hover:scale-105"
                  >
                    <div className="hidden sm:block">
                      <MemorySphere glyph={s.glyph} size={72} tone="wine" phaseOffset={s.phase} />
                    </div>
                    <div className="sm:hidden">
                      <MemorySphere glyph={s.glyph} size={52} tone="wine" phaseOffset={s.phase} />
                    </div>
                    <span className="mt-1 font-ui text-[13px] text-wine opacity-85 group-hover:opacity-100 sm:text-[14.5px]">
                      {s.name}
                    </span>
                  </button>
                ))
            : group !== null &&
              GROUPS.filter((g) => g.key !== group).map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => {
                    setGroup(g.key);
                    setSection(null);
                  }}
                  className="group flex cursor-pointer flex-col items-center transition-transform duration-200 hover:scale-105"
                >
                  <div className="hidden sm:block">
                    <MemorySphere glyph={g.glyph} size={72} tone="wine" phaseOffset={g.phase} />
                  </div>
                  <div className="sm:hidden">
                    <MemorySphere glyph={g.glyph} size={52} tone="wine" phaseOffset={g.phase} />
                  </div>
                  <span className="mt-1 font-ui text-[13px] text-wine opacity-85 group-hover:opacity-100 sm:text-[14.5px]">
                    {g.name}
                  </span>
                </button>
              ))}
        </div>
      </aside>

      {/* ================================================================ */}
      {/* 3. CENTER CONTENT                                                */}
      {/* ================================================================ */}
      <main
        className={`mx-auto max-w-[980px] pb-24 pl-20 pt-7 transition-all duration-300 sm:pl-32 sm:pt-10 ${
          section !== null ? "pr-24 sm:pr-36" : "pr-6 sm:pr-12"
        }`}
      >
        {/* ---- Simple header ---- */}
        <header className="glass-card p-4">
          <h1 className="font-display text-[clamp(30px,4.2vw,44px)] tracking-[0.03em] text-wine">
            Work
          </h1>
          <p className="mt-1.5 font-body text-[19px] text-wine opacity-65">
            Your projects, your hours, your money — and everything you're learning.
          </p>
        </header>

        {/* ============================================================== */}
        {/* STAGE A: THE TWO GROUPS (Work & Study spheres)                 */}
        {/* ============================================================== */}
        {group === null && (
          <section className="mt-12 sm:mt-16 anim-fade">
            <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-12 sm:gap-x-20">
              {GROUPS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setGroup(g.key)}
                  className="group flex w-[170px] cursor-pointer flex-col items-center text-center transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="anim-float transition-transform duration-200 group-hover:scale-105">
                    <MemorySphere
                      glyph={g.glyph}
                      size={132}
                      tone="wine"
                      speed={0.5}
                      phaseOffset={g.phase}
                    />
                  </div>
                  <span className="mt-3 font-display text-[23px] text-wine">{g.name}</span>
                  <span className="mt-0.5 font-ui text-[14.5px] text-wine opacity-65">{g.sub}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE B: THE SECTIONS OF THE OPEN GROUP                       */}
        {/* ============================================================== */}
        {group !== null && section === null && (
          <section className="mt-10 sm:mt-14 anim-fade">
            <div className="mb-6 flex items-baseline gap-3">
              <h2 className="font-display text-[27px] text-wine">{openGroupMeta?.name}</h2>
              <span className="font-ui text-[14.5px] text-wine opacity-60">
                {groupSections.length} sections
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 sm:gap-x-16 sm:gap-y-12">
              {groupSections.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSection(s.key)}
                  className="group flex w-[150px] cursor-pointer flex-col items-center text-center transition-transform duration-200 hover:-translate-y-1 sm:w-[170px]"
                >
                  <div
                    className={s.phase % 2 < 1 ? "anim-float" : "anim-float-slow"}
                  >
                    <MemorySphere
                      glyph={s.glyph}
                      size={120}
                      tone="wine"
                      speed={0.5}
                      phaseOffset={s.phase}
                    />
                  </div>
                  <span className="mt-3 font-display text-[21px] text-wine">{s.name}</span>
                  <span className="mt-0.5 font-ui text-[14px] text-wine opacity-65">{s.sub}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE C: THE OPEN SECTION                                      */}
        {/* ============================================================== */}
        {section !== null && openSectionMeta && (
          <div className="mt-7 anim-fade">
            <h2 className="mb-5 font-display text-[27px] text-wine">{openSectionMeta.name}</h2>

            {section === "projects" && <ProjectsSection projects={atlas.projects} />}
            {section === "hours" && <WorkClock />}
            {section === "money" && <MoneySection ledger={atlas.ledger} />}
            {section === "timetable" && <Timetable slots={atlas.timetable} />}
            {section === "deadlines" && <DeadlinesSection assignments={atlas.assignments} />}
            {section === "subjects" && <SubjectsSection courses={atlas.courses} />}
            {section === "sessions" && (
              <SessionsSection sessions={atlas.studySessions} courses={atlas.courses} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ================================================================== */
/*  SHARED SMALL PIECES                                               */
/* ================================================================== */

function Badge({ children, tone = "dim" }: { children: React.ReactNode; tone?: "dim" | "wine" | "gold" }) {
  return (
    <span
      className={`inline-flex rounded-pill border px-2.5 py-0.5 font-ui text-[13.5px] tracking-[0.05em] ${
        tone === "wine"
          ? "border-wine bg-wine text-marble"
          : tone === "gold"
            ? "border-wine bg-marbleDim text-wine"
            : "border-wine/45 bg-marble text-wine"
      }`}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-ui text-[14px] text-wine opacity-60">{label}</span>
      {children}
    </label>
  );
}

/* ================================================================== */
/*  1. PROJECTS                                                        */
/* ================================================================== */

function ProjectsSection({ projects }: { projects: Project[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Project["projectType"]>("client");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addProject(name, type);
    setName("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-ui text-[14.5px] text-wine opacity-65">{projects.length} projects</p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-pill border border-wine bg-wine px-4 py-1.5 font-ui text-[15px] text-marble"
        >
          {showAdd ? "Close" : "+ New project"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={submit}
          className="glass-card space-y-3 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className="field py-2.5"
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="Type">
              <select
                className="field py-2.5"
                value={type}
                onChange={(e) => setType(e.target.value as Project["projectType"])}
              >
                <option value="client">Client work</option>
                <option value="own product">Own product</option>
                <option value="side tool">Side tool</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-3">
            <AtlasHoldButton submit>Hold to add project</AtlasHoldButton>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="rounded-xl border border-wine/30 bg-marble p-6 text-center font-body text-[20px] text-wine opacity-65">
            No projects yet.
          </p>
        ) : (
          projects.map((p) => {
            const done = p.tasks.filter((t) => t.done).length;
            return (
              <article key={p.id} className="rounded-2xl border-2 border-wine bg-marble p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-[24px] text-wine">{p.name}</h3>
                      <Badge tone="dim">{p.projectType}</Badge>
                      <Badge tone={p.status === "active" ? "gold" : "dim"}>
                        {projectStatusLabel(p.status)}
                      </Badge>
                    </div>
                    {p.client && p.client !== "Own venture" && (
                      <p className="mt-1 font-ui text-[14.5px] text-wine opacity-60">{p.client}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 font-ui text-[14px] text-wine opacity-70">
                    {p.deadline ? (
                      <span>
                        Due {prettyDate(p.deadline)} · {relativeDue(p.deadline)}
                      </span>
                    ) : (
                      <span>No deadline</span>
                    )}
                    <span>{p.hours}h logged</span>
                  </div>
                </div>

                {p.notes && (
                  <p className="mt-3 whitespace-pre-wrap font-body text-[19px] leading-relaxed text-wine opacity-80">
                    {p.notes}
                  </p>
                )}

                {p.tasks.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {p.tasks.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => toggleTask(p.id, t.id)}
                          className="flex w-full items-center gap-3 rounded-lg border border-wine/30 bg-marbleDim/45 px-3.5 py-2.5 text-left transition-colors hover:border-wine"
                        >
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-wine text-[15px] ${
                              t.done ? "bg-wine text-marble" : "bg-marble text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span
                            className={`flex-1 font-body text-[19px] text-wine ${
                              t.done ? "opacity-45 line-through" : ""
                            }`}
                          >
                            {t.title}
                          </span>
                          <span className="font-ui text-[13.5px] text-wine opacity-60">
                            {relativeDue(t.due)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {p.tasks.length > 0 && (
                  <p className="mt-3 font-ui text-[14px] text-wine opacity-55">
                    {done}/{p.tasks.length} tasks done
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  3. MONEY                                                           */
/* ================================================================== */

function MoneySection({
  ledger,
}: {
  ledger: {
    id: string;
    label: string;
    amount: number;
    kind: "income" | "expense";
    date: string;
    bucket: string;
    client: string;
    status: "sent" | "paid" | "expense";
  }[];
}) {
  const [showInvoice, setShowInvoice] = useState(false);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");

  const invoices = ledger.filter((l) => l.kind === "income");
  const costs = ledger.filter((l) => l.kind === "expense");
  const income = invoices.reduce((a, l) => a + l.amount, 0);
  const expense = costs.reduce((a, l) => a + l.amount, 0);
  const owed = invoices
    .filter((l) => l.status === "sent")
    .reduce((a, l) => a + l.amount, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!client.trim() || !amt || amt <= 0) return;
    addInvoice(client.trim(), amt);
    setClient("");
    setAmount("");
    setShowInvoice(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-wine/40 bg-marbleDim/40 p-4">
          <p className="font-ui text-[14px] text-wine opacity-60">Invoiced</p>
          <p className="mt-1 font-display text-[26px] text-wine">${income.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-wine/40 bg-marbleDim/40 p-4">
          <p className="font-ui text-[14px] text-wine opacity-60">Owed to you</p>
          <p className="mt-1 font-display text-[26px] text-wine">${owed.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-wine/40 bg-marbleDim/40 p-4">
          <p className="font-ui text-[14px] text-wine opacity-60">Costs</p>
          <p className="mt-1 font-display text-[26px] text-wine">${expense.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-ui text-[15px] uppercase tracking-[0.12em] text-wine opacity-65">
          Invoices
        </h3>
        <button
          type="button"
          onClick={() => setShowInvoice((v) => !v)}
          className="rounded-pill border border-wine bg-wine px-4 py-1.5 font-ui text-[15px] text-marble"
        >
          {showInvoice ? "Close" : "+ Invoice"}
        </button>
      </div>

      {showInvoice && (
        <form
          onSubmit={submit}
          className="glass-card space-y-3 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client">
              <input
                className="field py-2.5"
                placeholder="Client or company"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="Amount">
              <input
                type="number"
                min="1"
                className="field py-2.5"
                placeholder="e.g. 2400"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <AtlasHoldButton submit>Hold to add invoice</AtlasHoldButton>
            <button
              type="button"
              onClick={() => setShowInvoice(false)}
              className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y-2 divide-wine/15">
        {invoices.length === 0 ? (
          <li className="py-6 text-center font-body text-[20px] text-wine opacity-65">
            No invoices yet.
          </li>
        ) : (
          invoices.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-[19.5px] text-wine">{l.label}</p>
                <p className="font-ui text-[14px] text-wine opacity-60">
                  {l.client} · {prettyDate(l.date)}
                </p>
              </div>
              <Badge tone={l.status === "paid" ? "gold" : "wine"}>{l.status}</Badge>
              <span className="font-display text-[21px] text-wine">
                ${l.amount.toLocaleString()}
              </span>
              {l.status === "sent" && (
                <span className="font-ui text-[14px] text-wine opacity-70">owed</span>
              )}
            </li>
          ))
        )}
      </ul>

      <div>
        <h3 className="font-ui text-[15px] uppercase tracking-[0.12em] text-wine opacity-65">
          Costs
        </h3>
        <ul className="divide-y-2 divide-wine/15">
          {costs.length === 0 ? (
            <li className="py-4 text-center font-body text-[19px] text-wine opacity-65">
              No costs recorded.
            </li>
          ) : (
            costs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-[19px] text-wine">{l.label}</p>
                  <p className="font-ui text-[14px] text-wine opacity-60">
                    {l.bucket} · {prettyDate(l.date)}
                  </p>
                </div>
                <span className="font-ui text-[16px] text-wine opacity-75">
                  −${l.amount.toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  5. DEADLINES                                                        */
/* ================================================================== */

function DeadlinesSection({ assignments }: { assignments: Assignment[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Assignment["kind"]>("assignment");
  const [subject, setSubject] = useState("");
  const [due, setDue] = useState(todayISO());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    // Add through the store shape used by Atlas AI (kept simple here)
    addDeadline(title, kind, subject, due);
    setTitle("");
    setSubject("");
    setShowAdd(false);
  };

  const sorted = [...assignments].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return a.due.localeCompare(b.due);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-ui text-[14.5px] text-wine opacity-65">
          {assignments.filter((a) => a.status === "open").length} not done yet
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-pill border border-wine bg-wine px-4 py-1.5 font-ui text-[15px] text-marble"
        >
          {showAdd ? "Close" : "+ New deadline"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={submit}
          className="glass-card space-y-3 p-4"
        >
          <Field label="Title">
            <input
              className="field py-2.5"
              placeholder="What's due?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type">
              <select
                className="field py-2.5"
                value={kind}
                onChange={(e) => setKind(e.target.value as Assignment["kind"])}
              >
                <option value="assignment">Assignment</option>
                <option value="CAT">CAT</option>
                <option value="exam">Exam</option>
                <option value="project">Project</option>
              </select>
            </Field>
            <Field label="Subject">
              <input
                className="field py-2.5"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                className="field py-2.5"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <AtlasHoldButton submit>Hold to add deadline</AtlasHoldButton>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-wine/30 bg-marble p-6 text-center font-body text-[20px] text-wine opacity-65">
          Nothing due.
        </p>
      ) : (
        <ul className="divide-y-2 divide-wine/15">
          {sorted.map((a) => {
            const done = a.status !== "open";
            const late = !done && a.due < todayISO();
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => toggleDeadline(a.id)}
                  className="flex w-full items-center gap-3.5 py-3.5 text-left"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-wine text-[15px] ${
                      done ? "bg-wine text-marble" : "bg-marble text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`font-body text-[19.5px] text-wine ${
                          done ? "opacity-45 line-through" : ""
                        }`}
                      >
                        {a.title}
                      </span>
                      <Badge tone="dim">{a.kind}</Badge>
                    </div>
                    <p className="font-ui text-[14px] text-wine opacity-60">
                      {a.course} · due {prettyDate(a.due)} · {relativeDue(a.due)}
                    </p>
                  </div>
                  {!done && late && (
                    <span className="font-ui text-[14px] text-wine">overdue</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ================================================================== */
/*  6. SUBJECTS                                                         */
/* ================================================================== */

function SubjectsSection({ courses }: { courses: Course[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Course["subjectType"]>("school");
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addSubject(name, type, code, Number(credits) || 0, notes);
    setName("");
    setCode("");
    setCredits("");
    setNotes("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-ui text-[14.5px] text-wine opacity-65">
          {courses.length} subjects · {courses.filter((c) => c.subjectType === "self-learning").length} self-learning
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-pill border border-wine bg-wine px-4 py-1.5 font-ui text-[15px] text-marble"
        >
          {showAdd ? "Close" : "+ New subject"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={submit}
          className="glass-card space-y-3 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className="field py-2.5"
                placeholder="Subject name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="Type">
              <select
                className="field py-2.5"
                value={type}
                onChange={(e) => setType(e.target.value as Course["subjectType"])}
              >
                <option value="school">School</option>
                <option value="self-learning">Self-learning</option>
              </select>
            </Field>
            {type === "school" && (
              <>
                <Field label="Course code">
                  <input
                    className="field py-2.5"
                    placeholder="e.g. GRK 204"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <Field label="Credits">
                  <input
                    type="number"
                    min="0"
                    className="field py-2.5"
                    placeholder="e.g. 3"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Notes">
              <input
                className="field py-2.5 sm:col-span-2"
                placeholder="What's the focus right now?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <AtlasHoldButton submit>Hold to add subject</AtlasHoldButton>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.length === 0 ? (
          <p className="col-span-full rounded-xl border border-wine/30 bg-marble p-6 text-center font-body text-[20px] text-wine opacity-65">
            No subjects yet.
          </p>
        ) : (
          courses.map((c) => (
            <article key={c.id} className="rounded-2xl border-2 border-wine bg-marble p-5">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-display text-[22px] text-wine">{c.title}</h3>
                    <Badge tone="dim">{c.subjectType}</Badge>
                  </div>
                  {c.code && (
                    <p className="mt-1 font-ui text-[14px] text-wine opacity-60">
                      {c.code} · {c.credits} credits
                    </p>
                  )}
                </div>
                <Badge tone={c.status === "active" ? "gold" : c.status === "complete" ? "wine" : "dim"}>
                  {courseStatusLabel(c.status)}
                </Badge>
              </div>

              {c.status !== "planned" && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-marbleDim">
                  <div
                    className="h-full bg-wine"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              )}

              {c.notes && (
                <p className="mt-3 whitespace-pre-wrap font-body text-[18px] leading-relaxed text-wine opacity-80">
                  {c.notes}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  7. STUDY SESSIONS                                                   */
/* ================================================================== */

function SessionsSection({
  sessions,
  courses,
}: {
  sessions: { id: string; subject: string; date: string; durationMin: number }[];
  courses: Course[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const min = Number(duration);
    if (!subject.trim() || !min || min <= 0) return;
    addStudySession(subject, min, date);
    setSubject("");
    setDuration("");
    setShowAdd(false);
  };

  const totalMin = sessions.reduce((a, s) => a + s.durationMin, 0);
  const subjectNames = courses.map((c) => c.title);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-[15px] text-wine">
          <span className="font-display text-[24px]">{fmtDuration(totalMin)}</span> of study logged
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-pill border border-wine bg-wine px-4 py-1.5 font-ui text-[15px] text-marble"
        >
          {showAdd ? "Close" : "+ Log session"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={submit}
          className="glass-card space-y-3 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject">
              <input
                className="field py-2.5"
                placeholder="Subject"
                list="subject-options"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <datalist id="subject-options">
                {subjectNames.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="field py-2.5"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="10"
                step="5"
                className="field py-2.5"
                placeholder="e.g. 50"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-pill bg-wine px-5 py-2 font-ui text-[15px] text-marble"
            >
              Log session
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-wine/30 bg-marble p-6 text-center font-body text-[20px] text-wine opacity-65">
          No sessions logged yet.
        </p>
      ) : (
        <ul className="divide-y-2 divide-wine/15">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3">
              <span className="w-24 shrink-0 font-ui text-[15px] text-wine opacity-70">
                {prettyDate(s.date)}
              </span>
              <span className="min-w-0 flex-1 truncate font-body text-[19.5px] text-wine">
                {s.subject}
              </span>
              <span className="font-ui text-[16px] text-wine opacity-75">
                {fmtDuration(s.durationMin)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
