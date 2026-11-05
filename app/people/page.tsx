"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Badge, Tabs, Bar } from "@/components/ui";
import { MeanderWine } from "@/components/Ornaments";
import { useAtlas, daysSince, prettyDate, touchPerson } from "@/lib/store";

export default function PeoplePage() {
  const s = useAtlas();
  const [tab, setTab] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const drifting = s.people.filter((p) => daysSince(p.lastSeen) > p.cadenceDays);
  const upcoming = [...s.people].sort((a, b) => a.birthday.localeCompare(b.birthday));

  return (
    <PageShell
      greek="Ἄνθρωποι · the second pillar"
      title="People"
      subtitle="Everyone who matters, one profile each. Dates held, promises kept, and the quiet work of staying close."
    >
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="In your circle" value={`${s.people.length}`} sub="souls kept close" />
        <Stat label="Drifting" value={`${drifting.length}`} sub="past their cadence" tone="wine" />
        <Stat label="Promises open" value={`${s.people.filter((p) => p.promise && p.promise !== "—").length}`} sub="things you said you'd do" tone="gold" />
        <Stat label="Next birthday" value={nextBirthday(s.people)?.name.split(" ")[0] ?? "—"} sub={nextBirthday(s.people) ? `in ${daysToBirthday(nextBirthday(s.people)!.birthday)} days` : ""} />
      </div>

      {drifting.length > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-wine bg-wine p-5 text-marble">
          <p className="font-ui text-[18px] uppercase tracking-[0.24em] text-marble">The drifting</p>
          <p className="mt-2 font-body text-[21px] text-marble">
            {drifting.map((p) => `${p.name} — ${daysSince(p.lastSeen)} days`).join("  ·  ")}
          </p>
          <p className="mt-1 font-body text-[19.5px] italic text-marble opacity-75">
            A message costs nothing and holds a great deal.
          </p>
        </div>
      )}

      <div className="mt-8">
        <Tabs value={tab} onChange={setTab} tabs={[
          { key: "all", label: "The circle" },
          { key: "dates", label: "Dates & birthdays" },
          { key: "promises", label: "Promises & gifts" },
          { key: "add", label: "Add someone" },
        ]} />
      </div>

      <div className="mt-5">
        {tab === "all" && (
          <div className="grid gap-3.5 md:grid-cols-2">
            {s.people.map((p) => {
              const since = daysSince(p.lastSeen);
              const late = since > p.cadenceDays;
              const open = openId === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border-2 p-5 transition-colors ${
                    open ? "border-wine bg-marbleDim/55" : "border-wine bg-marble"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-wine bg-wine font-display text-[23px] text-marble">
                      {p.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="truncate font-display text-[25px] tracking-[0.03em] text-wine">{p.name}</p>
                        <Badge tone="dim">{p.relation}</Badge>
                      </div>
                      <p className="mt-1 font-body text-[19.5px] italic text-wine opacity-65">
                        Last spoke {since === 0 ? "today" : `${since} days ago`} · cadence {p.cadenceDays}d
                      </p>
                      <div className="mt-3">
                        <Bar value={Math.min(since, p.cadenceDays * 1.6)} max={p.cadenceDays * 1.6} color={late ? "gold" : "wine"} />
                      </div>
                    </div>
                  </div>
                  {open && (
                    <div className="mt-4 space-y-2.5 border-t-2 border-wine/20 pt-4 anim-fade">
                      <Row k="Birthday" v={prettyDate(`2025-${p.birthday}`)} />
                      <Row k="Promise" v={p.promise} />
                      <Row k="Gift idea" v={p.gift} />
                      <p className="font-body text-[20px] leading-relaxed text-wine opacity-80">{p.notes}</p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button onClick={() => setOpenId(open ? null : p.id)} className="btn-ghost btn-sm flex-1">
                      {open ? "Close" : "Open profile"}
                    </button>
                    <button onClick={() => touchPerson(p.id)} className="btn-wine btn-sm flex-1">
                      Spoke today
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "dates" && (
          <Panel title="The calendar of people" hint="Birthdays and anniversaries in the order they arrive">
            <ul className="divide-y-2 divide-wine/20">
              {upcoming.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-4 py-3.5">
                  <span className="w-24 shrink-0 font-display text-[22px] text-wine">
                    {daysToBirthday(p.birthday)}
                    <span className="ml-1 font-ui text-[16px] tracking-[0.1em] text-wine opacity-60">DAYS</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[20.5px] text-wine">{p.name}</p>
                    <p className="font-ui text-[17px] uppercase tracking-[0.15em] text-wine opacity-60">{p.relation} · {prettyDate(`2025-${p.birthday}`)}</p>
                  </div>
                  <Badge tone="gold">gift: {p.gift.split(",")[0]}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {tab === "promises" && (
          <div className="grid gap-3.5 md:grid-cols-2">
            <Panel title="Promises made" hint="Small debts of honour">
              <ul className="space-y-3.5">
                {s.people.filter((p) => p.promise).map((p) => (
                  <li key={p.id} className="border-l-4 border-wine pl-3.5">
                    <p className="font-body text-[21px] text-wine">“{p.promise}”</p>
                    <p className="mt-1 font-ui text-[17px] uppercase tracking-[0.15em] text-wine opacity-60">to {p.name}</p>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Gift ideas" hint="Kept for the right moment">
              <ul className="space-y-3">
                {s.people.filter((p) => p.gift && p.gift !== "—").map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-pill border-2 border-wine px-4 py-2.5">
                    <span className="font-body text-[20.5px] text-wine">{p.gift}</span>
                    <span className="font-ui text-[17px] uppercase tracking-[0.14em] text-wine opacity-60">{p.name.split(" ")[0]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}

        {tab === "add" && (
          <Panel title="Someone new" hint="One profile, held properly">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <input className="field" placeholder="Full name" />
              <input className="field" placeholder="Relation (sister, friend, mentor…)" />
              <input className="field" type="date" />
              <input className="field" placeholder="How often should you speak? (days)" />
              <input className="field sm:col-span-2" placeholder="A promise, a gift, or something to remember" />
            </div>
            <button className="btn-wine mt-4">Add to the circle</button>
          </Panel>
        )}
      </div>

      <MeanderWine className="mt-14" height={16} />
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-ui text-[17px] uppercase tracking-[0.16em] text-wine opacity-60">{k}</span>
      <span className="text-right font-body text-[20px] text-wine">{v}</span>
    </div>
  );
}

function daysToBirthday(b: string) {
  const [m, d] = b.split("-").map(Number);
  const now = new Date();
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next.getTime() < new Date(now.toDateString()).getTime()) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - new Date(now.toDateString()).getTime()) / 86400000);
}

function nextBirthday(people: { name: string; birthday: string }[]) {
  return [...people].sort((a, b) => daysToBirthday(a.birthday) - daysToBirthday(b.birthday))[0];
}
