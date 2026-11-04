"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Bar, Ring, Badge, Tabs } from "@/components/ui";
import { MeanderWine } from "@/components/Ornaments";
import { useAtlas, toggleHabit, setMoodToday } from "@/lib/store";

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
        <Stat label="Sleep" value={`${s.health.sleep}h`} sub="last night" />
        <Stat label="Workouts" value={`${s.health.workouts}`} sub="this week" tone="gold" />
        <Stat label="Water" value={`${s.health.water}/8`} sub="glasses today" />
        <Stat label="Mood" value={`${moodToday}/5`} sub="right now" tone="wine" />
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
                <Ring value={s.health.sleep} max={9} label={`${s.health.sleep}h`} sub="sleep" />
                <Ring value={s.health.workouts} max={6} label={`${s.health.workouts}`} color="gold" sub="workouts" />
                <Ring value={s.health.water} max={8} label={`${s.health.water}`} sub="water" />
                <Ring value={s.health.meals} max={4} label={`${s.health.meals}`} color="gold" sub="meals" />
              </div>
              <div className="mt-6 space-y-3">
                {[
                  ["Sleep", s.health.sleep, 9, "wine"],
                  ["Water", s.health.water, 8, "wine"],
                  ["Workouts", s.health.workouts, 6, "gold"],
                  ["Meals", s.health.meals, 4, "gold"],
                ].map(([l, v, m, c]) => (
                  <div key={l as string}>
                    <div className="mb-1 flex justify-between font-ui text-[9px] uppercase tracking-[0.18em] text-wine opacity-65">
                      <span>{l as string}</span>
                      <span>{v as number}/{m as number}</span>
                    </div>
                    <Bar value={v as number} max={m as number} color={(c as "wine" | "gold")} />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Log the body" hint="Thirty seconds, once a day">
              <div className="space-y-3">
                <label className="block">
                  <span className="font-ui text-[9px] uppercase tracking-[0.2em] text-wine opacity-60">Hours slept</span>
                  <input className="field mt-1.5" type="number" step="0.5" defaultValue={s.health.sleep} />
                </label>
                <label className="block">
                  <span className="font-ui text-[9px] uppercase tracking-[0.2em] text-wine opacity-60">Glasses of water</span>
                  <input className="field mt-1.5" type="number" defaultValue={s.health.water} />
                </label>
                <label className="block">
                  <span className="font-ui text-[9px] uppercase tracking-[0.2em] text-wine opacity-60">Meals eaten</span>
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
                <Stat label="Spent" value={`$${s.money.spend}`} />
                <Stat label="Saved" value={`$${s.money.savings.toLocaleString()}`} tone="wine" />
                <Stat label="Subscriptions" value={`$${subs}/mo`} tone="gold" />
              </div>
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between font-ui text-[9px] uppercase tracking-[0.18em] text-wine opacity-60">
                  <span>Savings rate target</span>
                  <span>32% of income</span>
                </div>
                <Bar value={32} max={50} color="gold" />
              </div>
            </Panel>
            <Panel title="Subscriptions" hint="The slow leak">
              <ul className="space-y-2">
                {s.money.subscriptions.map((x) => (
                  <li key={x.id} className="flex items-center justify-between rounded-pill border-2 border-wine px-3 py-2">
                    <div>
                      <p className="font-body text-[13px] text-wine">{x.name}</p>
                      <p className="font-ui text-[8.5px] uppercase tracking-[0.14em] text-wine opacity-55">renews {x.renew}</p>
                    </div>
                    <span className="font-ui text-[11px] tracking-[0.08em] text-wine">${x.cost}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-body text-[12px] italic text-wine opacity-55">
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
                      className={`flex w-full items-center gap-4 rounded-pill border-2 border-wine px-4 py-3 text-left transition-colors ${h.doneToday ? "bg-gold" : "bg-marble hover:bg-wine/10"}`}
                    >
                      <span className={`grid h-6 w-6 place-items-center rounded-full border-2 border-wine text-[11px] ${h.doneToday ? "bg-wine text-marble" : "bg-marble text-transparent"}`}>✓</span>
                      <span className="flex-1 font-body text-[14px] text-wine">{h.name}</span>
                      <span className="font-display text-[15px] text-wine">{h.streak}<span className="ml-1 font-ui text-[8px] tracking-[0.14em] text-wine opacity-55">DAYS</span></span>
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
                      style={{ background: on ? "#5a1220" : "#ded6c7" }}
                    />
                  );
                })}
              </div>
              <p className="mt-4 font-body text-[12.5px] italic text-wine opacity-60">
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
                    className={`flex-1 rounded-xl border-2 py-4 font-display text-[20px] transition-colors ${moodToday >= n ? "border-wine bg-wine text-marble" : "border-wine bg-marble text-wine hover:bg-gold"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-between font-ui text-[8.5px] uppercase tracking-[0.14em] text-wine opacity-55">
                <span>Heavy</span><span>Even</span><span>Light</span>
              </div>
            </Panel>
            <Panel title="The week in feeling" hint="Mood beside energy">
              <div className="flex h-40 items-end gap-3">
                {s.mood.map((m) => (
                  <div key={m.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end gap-1">
                      <div className="flex-1 rounded-t-sm bg-wine" style={{ height: `${(m.score / 5) * 100}%` }} title={`mood ${m.score}`} />
                      <div className="flex-1 rounded-t-sm bg-gold" style={{ height: `${((m.score + 1) / 6) * 100}%` }} title="energy" />
                    </div>
                    <span className="font-ui text-[8px] uppercase tracking-[0.1em] text-wine opacity-55">{m.day.slice(0, 1)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 font-ui text-[8.5px] uppercase tracking-[0.16em] text-wine opacity-60">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-gold" /> mood</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-gold" /> energy</span>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <MeanderWine className="mt-14" height={16} />
    </PageShell>
  );
}
