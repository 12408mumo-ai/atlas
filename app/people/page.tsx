"use client";

import { useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel, Stat, Badge, Tabs, Bar } from "@/components/ui";
import { Meander } from "@/components/Ornaments";
import { useAtlas, daysSince, prettyDate, touchPerson } from "@/lib/store";

const ROSE = "#d98f7a";

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="In your circle" value={`${s.people.length}`} sub="souls kept close" accent={ROSE} />
        <Stat label="Drifting" value={`${drifting.length}`} sub="past their cadence" accent="#e2b563" />
        <Stat label="Promises open" value={`${s.people.filter((p) => p.promise && p.promise !== "—").length}`} sub="things you said you'd do" accent="#8fb3c9" />
        <Stat label="Next birthday" value={nextBirthday(s.people)?.name.split(" ")[0] ?? "—"} sub={nextBirthday(s.people) ? `in ${daysToBirthday(nextBirthday(s.people)!.birthday)} days` : ""} accent="#7fae86" />
      </div>

      {drifting.length > 0 && (
        <div className="mt-6 border border-[#d98f7a]/25 bg-[#d98f7a]/[.06] p-4">
          <p className="eyebrow !text-[#e5a794]">The drifting</p>
          <p className="mt-2 font-body text-[13.5px] text-marble/65">
            {drifting.map((p) => `${p.name} — ${daysSince(p.lastSeen)} days`).join("  ·  ")}
          </p>
          <p className="mt-1 font-body text-[12px] italic text-marble/35">
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
          <div className="grid gap-3 md:grid-cols-2">
            {s.people.map((p) => {
              const since = daysSince(p.lastSeen);
              const late = since > p.cadenceDays;
              const open = openId === p.id;
              return (
                <div key={p.id} className={`glass rounded-sm p-5 transition-all ${open ? "border-gold/40" : ""}`}>
                  <div className="flex items-start gap-4">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-[16px] text-[#1a1206]"
                      style={{ background: `radial-gradient(circle at 32% 28%, #f6e2b4, ${ROSE} 78%)`, boxShadow: `0 0 22px ${ROSE}55` }}
                    >
                      {p.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display text-[18px] tracking-[.03em] text-marble/92">{p.name}</p>
                        <Badge tone="dim">{p.relation}</Badge>
                      </div>
                      <p className="mt-1 font-body text-[12px] italic text-marble/40">
                        Last spoke {since === 0 ? "today" : `${since} days ago`} · cadence {p.cadenceDays}d
                      </p>
                      <div className="mt-2.5">
                        <Bar value={Math.min(since, p.cadenceDays * 1.6)} max={p.cadenceDays * 1.6} accent={late ? "#d98f7a" : ROSE} />
                      </div>
                    </div>
                  </div>
                  {open && (
                    <div className="mt-4 space-y-2.5 border-t border-white/[.07] pt-4 anim-fade">
                      <Row k="Birthday" v={prettyDate(`2025-${p.birthday}`)} />
                      <Row k="Promise" v={p.promise} />
                      <Row k="Gift idea" v={p.gift} />
                      <p className="font-body text-[12.5px] leading-relaxed text-marble/55">{p.notes}</p>
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setOpenId(open ? null : p.id)} className="btn-ghost flex-1 !justify-center">
                      {open ? "Close" : "Open profile"}
                    </button>
                    <button onClick={() => touchPerson(p.id)} className="btn-ghost flex-1 !justify-center !border-gold/40 !text-goldBright hover:!bg-gold/10">
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
            <ul className="divide-y divide-white/[.05]">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3.5">
                  <span className="w-14 font-display text-[15px] text-gold/85">{daysToBirthday(p.birthday)}<span className="ml-1 font-ui text-[8px] tracking-[.16em] text-marble/35">DAYS</span></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[14px] text-marble/88">{p.name}</p>
                    <p className="font-ui text-[9px] uppercase tracking-[.2em] text-marble/30">{p.relation} · {prettyDate(`2025-${p.birthday}`)}</p>
                  </div>
                  <Badge tone="gold">gift: {p.gift.split(",")[0]}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {tab === "promises" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="Promises made" hint="Small debts of honour">
              <ul className="space-y-3">
                {s.people.filter((p) => p.promise).map((p) => (
                  <li key={p.id} className="border-l-2 border-gold/40 pl-3">
                    <p className="font-body text-[13.5px] text-marble/85">“{p.promise}”</p>
                    <p className="mt-1 font-ui text-[9px] uppercase tracking-[.2em] text-marble/35">to {p.name}</p>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Gift ideas" hint="Kept for the right moment">
              <ul className="space-y-3">
                {s.people.filter((p) => p.gift && p.gift !== "—").map((p) => (
                  <li key={p.id} className="flex items-center justify-between border border-white/[.05] px-3 py-2.5">
                    <span className="font-body text-[13px] text-marble/80">{p.gift}</span>
                    <span className="font-ui text-[9px] uppercase tracking-[.18em] text-marble/35">{p.name.split(" ")[0]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}

        {tab === "add" && (
          <Panel title="Someone new" hint="One profile, held properly">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" placeholder="Full name" />
              <input className="field" placeholder="Relation (sister, friend, mentor…)" />
              <input className="field" type="date" />
              <input className="field" placeholder="How often should you speak? (days)" />
              <input className="field sm:col-span-2" placeholder="A promise, a gift, or something to remember" />
            </div>
            <button className="btn-gold mt-4">Add to the circle</button>
          </Panel>
        )}
      </div>

      <Meander className="mt-14" height={16} />
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-ui text-[9px] uppercase tracking-[.22em] text-marble/30">{k}</span>
      <span className="text-right font-body text-[13px] text-marble/80">{v}</span>
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
