"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AtlasStage from "@/components/AtlasStage";
import { MeanderWine, LaurelDivider } from "@/components/Ornaments";
import { TopBar } from "@/components/Chrome";
import {
  useAtlas,
  getSession,
  daysSince,
  relativeDue,
  setMoodToday,
  toggleHabit,
  type Session,
} from "@/lib/store";

export default function HubPage() {
  const s = useAtlas();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => setSession(getSession()), []);

  const openTasks = s.projects.flatMap((p) => p.tasks.filter((t) => !t.done));
  const nextDue = [...openTasks].sort((a, b) => a.due.localeCompare(b.due))[0];
  const overdue = s.people.filter((p) => daysSince(p.lastSeen) > p.cadenceDays);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short" });
  const moodToday = s.mood.find((m) => m.day === today)?.score ?? 0;
  const income = s.ledger.filter((l) => l.kind === "income").reduce((a, b) => a + b.amount, 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Still awake";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="relative min-h-screen bg-marble">
      <TopBar />

      <main>
        {/* ---------------- invocation ---------------- */}
        <section className="mx-auto max-w-[1240px] px-5 pt-9 sm:px-8">
          <div className="flex flex-col items-center text-center anim-fade-up">
            <p className="eyebrow">Ἄτλας · the bearer</p>
            <h1 className="mt-3 font-display text-[clamp(34px,4.2vw,52px)] leading-tight tracking-[0.04em] text-wine">
              {greeting}
              {session?.name ? <span className="italic">, {session.name.split(" ")[0]}</span> : null}
            </h1>
            <p className="mt-2.5 max-w-[640px] font-body text-[21.5px] leading-relaxed text-wine opacity-75">
              Five worlds orbit the one you carry. Touch a sphere and it opens into itself.
            </p>
          </div>
        </section>

        {/* ---------------- the stage ---------------- */}
        <section className="relative mt-6">
          <AtlasStage />
        </section>

        {/* ---------------- the day's ledger ---------------- */}
        <section className="mx-auto max-w-[1180px] px-5 pb-20 sm:px-8">
          <LaurelDivider className="my-9" />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              href="/work"
              image="/assets/emblems/work.png"
              eyebrow="Next deadline"
              value={nextDue ? nextDue.title : "Nothing pressing"}
              meta={nextDue ? `${relativeDue(nextDue.due)} · ${openTasks.length} open` : "Clear skies"}
            />
            <Tile
              href="/people"
              image="/assets/emblems/people.png"
              eyebrow="Reach out"
              value={overdue.length ? `${overdue.length} drifting` : "All held"}
              meta={overdue.length ? overdue.map((p) => p.name.split(" ")[0]).join(" · ") : "Everyone spoken to recently"}
            />
            <Tile
              href="/life"
              image="/assets/emblems/life.png"
              eyebrow="Habit streak"
              value={`${s.habits.reduce((a, h) => Math.max(a, h.streak), 0)} days`}
              meta={s.habits.find((h) => !h.doneToday)?.name ?? "All done today"}
            />
            <Tile
              href="/memories"
              image="/assets/emblems/memories.png"
              eyebrow="Income logged"
              value={`$${income.toLocaleString()}`}
              meta={`${s.journal.length} memories kept`}
            />
          </div>

          <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.35fr_1fr]">
            {/* mood */}
            <div className="rounded-2xl border-2 border-wine bg-marble p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-ui text-[18px] uppercase tracking-[0.2em] text-wine">How heavy is today?</h2>
                <span className="font-body text-[19.5px] italic text-wine opacity-65">1 light · 5 crushing</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMoodToday(n)}
                    className={`grid h-12 w-12 place-items-center rounded-full border-2 font-display text-[22px] transition-colors ${
                      moodToday >= n ? "border-wine bg-wine text-marble" : "border-wine bg-marble text-wine hover:bg-marbleDim"
                    }`}
                    aria-label={`Mood ${n} of 5`}
                  >
                    {n}
                  </button>
                ))}
                <div className="ml-auto flex items-end gap-2">
                  {s.mood.map((m) => (
                    <div key={m.day} className="flex flex-col items-center gap-1.5">
                      <div className="flex h-20 w-4 items-end overflow-hidden rounded-pill border border-wine bg-marbleDim">
                        <div className="w-full rounded-pill bg-wine" style={{ height: `${(m.score / 5) * 100}%` }} />
                      </div>
                      <span className="font-ui text-[16px] uppercase tracking-[0.08em] text-wine opacity-65">{m.day.slice(0, 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* habits */}
            <div className="rounded-2xl border-2 border-wine bg-marble p-5 sm:p-6">
              <h2 className="font-ui text-[18px] uppercase tracking-[0.2em] text-wine">Today&apos;s rites</h2>
              <ul className="mt-4 space-y-2.5">
                {s.habits.slice(0, 4).map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => toggleHabit(h.id)}
                      className="flex w-full items-center gap-3.5 rounded-pill border-2 border-wine px-4 py-2.5 text-left transition-colors hover:bg-marbleDim"
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-wine text-[16px] ${
                          h.doneToday ? "bg-wine text-marble" : "bg-marble text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className={`flex-1 font-body text-[21px] text-wine ${h.doneToday ? "opacity-45 line-through" : ""}`}>
                        {h.name}
                      </span>
                      <span className="font-ui text-[17px] tracking-[0.12em] text-wine opacity-75">{h.streak}d</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <MeanderWine className="mt-12" height={16} />
          <p className="mt-6 text-center font-ui text-[17px] uppercase tracking-[0.24em] text-wine opacity-55">
            He holds the sky so you can hold your life · ATLAS
          </p>
        </section>
      </main>
    </div>
  );
}

function Tile({
  href,
  eyebrow,
  value,
  meta,
  image,
}: {
  href: string;
  eyebrow: string;
  value: string;
  meta: string;
  image: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-2xl border-2 border-wine bg-marble p-4 transition-colors hover:bg-wine"
    >
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-wine group-hover:border-marble">
        <img src={image} alt="" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0">
        <span className="block font-ui text-[16.5px] uppercase tracking-[0.16em] text-wine opacity-75 group-hover:text-marble group-hover:opacity-90">
          {eyebrow}
        </span>
        <span className="mt-1 block truncate font-display text-[24px] tracking-[0.02em] text-wine group-hover:text-marble">
          {value}
        </span>
        <span className="mt-1 block truncate font-body text-[19px] italic text-wine opacity-65 group-hover:text-marble group-hover:opacity-80">
          {meta}
        </span>
      </span>
    </Link>
  );
}
