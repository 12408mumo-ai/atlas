"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AtlasStage, { PILLARS } from "@/components/AtlasStage";
import { Stars, LaurelDivider, Meander } from "@/components/Ornaments";
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
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(900px 520px at 50% -8%, rgba(47,111,143,.16), transparent 62%), #070a10" }} />
      <Stars count={54} className="opacity-50" />
      <TopBar />

      <main className="relative">
        {/* ---------------- invocation ---------------- */}
        <section className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8">
          <div className="flex flex-col items-center text-center anim-fade-up">
            <p className="eyebrow !tracking-[.48em]">Ἄτλας · the bearer</p>
            <h1 className="mt-4 font-display text-[clamp(26px,3.6vw,44px)] leading-tight tracking-[.05em] text-marble/95">
              {greeting}
              {session?.name ? <span className="gold-text">, {session.name.split(" ")[0]}</span> : null}
            </h1>
            <p className="mt-3 max-w-[560px] font-body text-[14.5px] leading-relaxed text-marble/45">
              Five worlds orbit the one you carry. Touch a sphere and it opens into itself.
            </p>
          </div>
        </section>

        {/* ---------------- the stage ---------------- */}
        <section className="relative mt-4">
          <AtlasStage />
        </section>

        {/* ---------------- the day's ledger ---------------- */}
        <section className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-8">
          <LaurelDivider className="my-10" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              href="/work"
              eyebrow="Next deadline"
              value={nextDue ? nextDue.title : "Nothing pressing"}
              meta={nextDue ? `${relativeDue(nextDue.due)} · ${openTasks.length} open` : "Clear skies"}
              accent="#e2b563"
            />
            <Tile
              href="/people"
              eyebrow="Reach out"
              value={overdue.length ? `${overdue.length} drifting` : "All held"}
              meta={overdue.length ? overdue.map((p) => p.name.split(" ")[0]).join(" · ") : "Everyone spoken to recently"}
              accent="#d98f7a"
            />
            <Tile
              href="/life"
              eyebrow="Habit streak"
              value={`${s.habits.reduce((a, h) => Math.max(a, h.streak), 0)} days`}
              meta={s.habits.find((h) => !h.doneToday)?.name ?? "All done today"}
              accent="#7fae86"
            />
            <Tile
              href="/memories"
              eyebrow="Income logged"
              value={`$${income.toLocaleString()}`}
              meta={`${s.journal.length} memories kept`}
              accent="#b79bd6"
            />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_1fr]">
            {/* mood */}
            <div className="glass rounded-sm p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-ui text-[10px] uppercase tracking-[.3em] text-gold/85">How heavy is today?</h2>
                <span className="font-body text-[12px] italic text-marble/35">1 light · 5 crushing</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMoodToday(n)}
                    className={`grid h-11 w-11 place-items-center rounded-full border transition-all duration-300 ${
                      moodToday >= n
                        ? "border-gold/60 bg-gold/15 text-goldBright"
                        : "border-white/10 text-marble/30 hover:border-gold/35 hover:text-gold/70"
                    }`}
                    aria-label={`Mood ${n} of 5`}
                  >
                    <span className="font-display text-[15px]">{n}</span>
                  </button>
                ))}
                <div className="ml-auto flex items-end gap-1.5">
                  {s.mood.map((m) => (
                    <div key={m.day} className="flex flex-col items-center gap-1.5">
                      <div className="flex h-16 w-4 items-end overflow-hidden rounded-full bg-white/[.06]">
                        <div
                          className="w-full rounded-full transition-all duration-700"
                          style={{
                            height: `${(m.score / 5) * 100}%`,
                            background: "linear-gradient(180deg,#f3d79a,#a97b36)",
                            boxShadow: "0 0 10px rgba(226,181,99,.5)",
                          }}
                        />
                      </div>
                      <span className="font-ui text-[8px] uppercase tracking-[.12em] text-marble/30">{m.day.slice(0, 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* habits quick toggle */}
            <div className="glass rounded-sm p-5 sm:p-6">
              <h2 className="font-ui text-[10px] uppercase tracking-[.3em] text-gold/85">Today's rites</h2>
              <ul className="mt-4 space-y-2">
                {s.habits.slice(0, 4).map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => toggleHabit(h.id)}
                      className="flex w-full items-center gap-3 border border-white/[.05] bg-white/[.01] px-3 py-2.5 text-left transition hover:border-gold/30 hover:bg-gold/[.04]"
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] transition ${
                          h.doneToday ? "border-gold bg-gold text-[#1a1206]" : "border-white/25 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className={`flex-1 font-body text-[13.5px] ${h.doneToday ? "text-marble/40 line-through" : "text-marble/80"}`}>
                        {h.name}
                      </span>
                      <span className="font-ui text-[9px] tracking-[.16em] text-gold/70">{h.streak}d</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Meander className="mt-12" height={16} />
          <p className="mt-6 text-center font-ui text-[9px] uppercase tracking-[.4em] text-marble/20">
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
  accent,
}: {
  href: string;
  eyebrow: string;
  value: string;
  meta: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden border border-white/[.07] bg-white/[.015] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/[.03]"
    >
      <span className="absolute inset-x-0 top-0 h-px opacity-60 transition group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      <p className="font-ui text-[9px] uppercase tracking-[.28em]" style={{ color: `${accent}cc` }}>{eyebrow}</p>
      <p className="mt-2.5 truncate font-display text-[19px] tracking-[.02em] text-marble/90 group-hover:text-goldBright transition">
        {value}
      </p>
      <p className="mt-1.5 truncate font-body text-[12px] italic text-marble/35">{meta}</p>
    </Link>
  );
}
