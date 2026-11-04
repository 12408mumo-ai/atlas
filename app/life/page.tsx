"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Bar, Ring, Badge, Tabs } from "@/components/ui";
import { Meander } from "@/components/Ornaments";
import { useAtlas, toggleHabit, setMoodToday } from "@/lib/store";

const GREEN = "#7fae86";
const GOLD = "#e2b563";
const BLUE = "#8fb3c9";

export default function LifePage() {
  const s = useAtlas();
  const [tab, setTab] = useState("health");

  const today = new Date().toLocaleDateString("en-GB", { weekday: "short" });
  const moodToday = s.mood.find((m) => m.day === today)?.score ?? 0;
  const subs = s.money.subscriptions.reduce((a, b) => a + b.cost, 0);

  return (
    <PageShell
      greek="Βίος · the third pillar"
      title="Life"
      subtitle="The measurable you. Sleep and water and steps, the money that passes through, the habits that hold, and the plain 1–5 of how you feel."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sleep" value={`${s.health.sleep}h`} sub="last night" accent={BLUE} />
        <Stat label="Workouts" value={`${s.health.workouts}`} sub="this week" accent={GREEN} />
        <Stat label="Water" value={`${s.health.water}/8`} sub="glasses today" accent="#8fb3c9" />
        <Stat label="Mood" value={`${moodToday}/5`} sub="right now" accent={GOLD} />
      </div>

      <div className="mt-8">
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: "health", label: "Health" },
          { key: "money", label: "Money" },
          { key: "habits", label: "Habits & streaks" },
          { key: "mood", label: "Mood & energy" },
        ]} />
      </div>

      <div className="mt-5">
        {tab === "health" && (
          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="Badges of the body" hint="This week" className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Ring value={s.health.sleep} max={9} label={`${s.health.sleep}h`} accent={BLUE} sub="sleep" />
                <Ring value={s.health.workouts} max={6} label={`${s.health.workouts}`} accent={GREEN} sub="workouts" />
                <Ring value={s.health.water} max={8} label={`${s.health.water}`} accent="#8fb3c9" sub="water" />
                <Ring value={s.health.meals} max={4} label={`${s.health.meals}`} accent={GOLD} sub="meals" />
              </div>
              <div className="mt-6 space-y-3">
                {[
                  ["Sleep", s.health.sleep, 9, BLUE],
                  ["Water", s.health.water, 8, "#8fb3c9"],
                  ["Workouts", s.health.workouts, 6, GREEN],
                  ["Meals", s.health.meals, 4, GOLD],
                ].map(([l, v, m, c]) => (
                  <div key={l as string}>
                    <div className="mb-1 flex justify-between font-ui text-[9px] uppercase tracking-[.2em] text-marble/40">
                      <span>{l as string}</span>
                      <span>{v as number}/{m as number}</span>
                    </div>
                    <Bar value={v as number} max={m as number} accent={c as string} />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Log the body" hint="Thirty seconds, once a day">
              <div className="space-y-3">
                <label className="block">
                  <span className="font-ui text-[9px] uppercase tracking-[.22em] text-marble/35">Hours slept</span>
                  <input className="field mt-1.5" type="number" step="0.5" defaultValue={s.health.sleep} />
                </label>
                <label className="block">
                  <span className="font-ui text-[9px] uppercase tracking-[.22em] text-marble/35">Glasses of water</span>
                  <input className="field mt-1.5" type="number" defaultValue={s.health.water} />
                </label>
                <label className="block">
                  <span className="font-ui text-[9px] uppercase tracking-[.22em] text-marble/35">Meals eaten</span>
                  <input className="field mt-1.5" type="number" defaultValue={s.health.meals} />
                </label>
                <button className="btn-gold w-full">Record</button>
              </div>
            </Panel>
          </div>
        )}

        {tab === "money" && (
          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="This month" hint="Personal, not business" className="md:col-span-2">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Spent" value={`$${s.money.spend}`} accent="#d98f7a" />
                <Stat label="Saved" value={`$${s.money.savings.toLocaleString()}`} accent={GREEN} />
                <Stat label="Subscriptions" value={`$${subs}/mo`} accent={GOLD} />
              </div>
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between font-ui text-[9px] uppercase tracking-[.2em] text-marble/40">
                  <span>Savings rate target</span>
                  <span>32% of income</span>
                </div>
                <Bar value={32} max={50} accent={GREEN} />
              </div>
            </Panel>
            <Panel title="Subscriptions" hint="The slow leak">
              <ul className="space-y-2">
                {s.money.subscriptions.map((x) => (
                  <li key={x.id} className="flex items-center justify-between border border-white/[.05] px-3 py-2">
                    <div>
                      <p className="font-body text-[13px] text-marble/85">{x.name}</p>
                      <p className="font-ui text-[8.5px] uppercase tracking-[.16em] text-marble/30">renews {x.renew}</p>
                    </div>
                    <span className="font-ui text-[11px] tracking-[.1em] text-gold/80">${x.cost}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-body text-[12px] italic text-marble/35">
                ${subs} a month, ${subs * 12} a year. Worth it?
              </p>
            </Panel>
          </div>
        )}

        {tab === "habits" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="The rites" hint="Tap to keep or break the chain">
              <ul className="space-y-2">
                {s.habits.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => toggleHabit(h.id)}
                      className={`flex w-full items-center gap-4 border px-4 py-3 text-left transition ${h.doneToday ? "border-gold/35 bg-gold/[.06]" : "border-white/[.06] hover:border-gold/25"}`}
                    >
                      <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${h.doneToday ? "border-gold bg-gold text-[#1a1206]" : "border-white/25 text-transparent"}`}>✓</span>
                      <span className={`flex-1 font-body text-[14px] ${h.doneToday ? "text-marble/60" : "text-marble/88"}`}>{h.name}</span>
                      <span className="font-display text-[15px] text-gold/85">{h.streak}<span className="ml-1 font-ui text-[8px] tracking-[.16em] text-marble/30">DAYS</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Consistency" hint="Last fourteen days, all rites">
              <div className="grid grid-cols-14 gap-1.5" style={{ gridTemplateColumns: "repeat(14,minmax(0,1fr))" }}>
                {Array.from({ length: 56 }).map((_, i) => {
                  const on = Math.sin(i * 2.7) > -0.25;
                  return (
                    <div
                      key={i}
                      className="aspect-square rounded-[2px]"
                      style={{
                        background: on ? "linear-gradient(160deg,#f3d79a,#a97b36)" : "rgba(255,255,255,.05)",
                        boxShadow: on ? "0 0 8px rgba(226,181,99,.35)" : "none",
                      }}
                    />
                  );
                })}
              </div>
              <p className="mt-4 font-body text-[12.5px] italic text-marble/40">
                Longest chain: {Math.max(...s.habits.map((h) => h.streak))} days. Missing a day is not breaking the habit — missing two is.
              </p>
            </Panel>
          </div>
        )}

        {tab === "mood" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="How is today?" hint="A single tap, no essay">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMoodToday(n)}
                    className={`flex-1 border py-4 transition ${moodToday >= n ? "border-gold/55 bg-gold/12 text-goldBright" : "border-white/10 text-marble/30 hover:border-gold/30"}`}
                  >
                    <span className="font-display text-[20px]">{n}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-between font-ui text-[8.5px] uppercase tracking-[.16em] text-marble/30">
                <span>Heavy</span><span>Even</span><span>Light</span>
              </div>
            </Panel>
            <Panel title="The week in feeling" hint="Mood beside energy">
              <div className="flex h-40 items-end gap-3">
                {s.mood.map((m) => (
                  <div key={m.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end gap-1">
                      <div className="flex-1 rounded-t-sm" style={{ height: `${(m.score / 5) * 100}%`, background: "linear-gradient(180deg,#f3d79a,#a97b36)" }} title={`mood ${m.score}`} />
                      <div className="flex-1 rounded-t-sm bg-[#8fb3c9]/45" style={{ height: `${((m.score + 1) / 6) * 100}%` }} title="energy" />
                    </div>
                    <span className="font-ui text-[8px] uppercase tracking-[.1em] text-marble/30">{m.day.slice(0, 1)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 font-ui text-[8.5px] uppercase tracking-[.18em] text-marble/30">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-gold" /> mood</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#8fb3c9]" /> energy</span>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <Meander className="mt-14" height={16} />
    </PageShell>
  );
}
