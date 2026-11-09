"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Tabs } from "@/components/ui";
import { AtlasHoldButton } from "@/components/AtlasHoldButton";
import { addLifeVision, removeLifeVision, updateLifeVision, useAtlas, type LifeVisionCategory, type LifeVisionEntry } from "@/lib/store";

const categories: { key: LifeVisionCategory; label: string; heading: string; prompt: string; placeholder: string; doneLabel: string }[] = [
  { key: "goals", label: "Goals", heading: "My goals", prompt: "The things you want to work towards, big or small.", placeholder: "What do you want to achieve?", doneLabel: "Achieved" },
  { key: "places", label: "Places", heading: "Places I want to go", prompt: "Places you dream of seeing and returning to.", placeholder: "Where do you want to go?", doneLabel: "Visited" },
  { key: "experiences", label: "Things to do", heading: "Things I want to do", prompt: "Experiences, adventures, and ideas you want to try.", placeholder: "What do you want to do?", doneLabel: "Done" },
  { key: "becoming", label: "Who I want to become", heading: "Who I want to become", prompt: "The qualities and ways of living you want to grow into.", placeholder: "Who do you want to become?", doneLabel: "Living it" },
];

export default function LifePage() {
  const world = useAtlas();
  const [tab, setTab] = useState<LifeVisionCategory>("goals");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  useEffect(() => {
    const select = (value: unknown) => {
      if (typeof value === "string" && categories.some((category) => category.key === value)) setTab(value as LifeVisionCategory);
    };
    select(new URLSearchParams(window.location.search).get("view"));
    const listener = (event: Event) => select((event as CustomEvent).detail);
    const history = () => select(new URLSearchParams(window.location.search).get("view"));
    window.addEventListener("atlas:show-view", listener);
    window.addEventListener("popstate", history);
    return () => { window.removeEventListener("atlas:show-view", listener); window.removeEventListener("popstate", history); };
  }, []);
  useEffect(() => { setShowAdd(false); setTitle(""); setNotes(""); setEditing(null); }, [tab]);

  const active = categories.find((category) => category.key === tab)!;
  const entries = (world.lifeVision || []).filter((entry) => entry.category === tab);

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    addLifeVision(tab, title, notes);
    setTitle(""); setNotes(""); setShowAdd(false);
  }
  function edit(entry: LifeVisionEntry) {
    setEditing(entry.id); setEditTitle(entry.title); setEditNotes(entry.notes);
  }
  function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editTitle.trim()) return;
    updateLifeVision(editing, { title: editTitle, notes: editNotes });
    setEditing(null);
  }

  return (
    <PageShell title="Life">
      <div className="max-w-4xl">
        <p className="font-ui text-xs uppercase tracking-[0.2em] text-wine/70">The life you imagine</p>
        <h2 className="mt-2 font-display text-[clamp(28px,5vw,46px)] leading-tight text-wine">A place for what matters to you.</h2>
        <p className="mt-3 max-w-2xl font-body text-xl italic text-wine/75">Dream freely. Keep the places, experiences, goals, and qualities you want to carry forward.</p>
        <div className="mt-7"><Tabs label="Life categories" value={tab} onChange={(key) => setTab(key as LifeVisionCategory)} tabs={categories.map(({ key, label }) => ({ key, label }))} /></div>
        <section aria-labelledby="life-category" className="mt-7">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-wine/20 pb-4">
            <div><h3 id="life-category" className="font-display text-[28px] text-wine">{active.heading}</h3><p className="mt-1 font-body text-lg italic text-wine/75">{active.prompt}</p></div>
            <button type="button" onClick={() => setShowAdd((value) => !value)} className="rounded-full bg-wine px-5 py-2.5 font-ui text-sm text-marble focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine">{showAdd ? "Close" : "+ Add"}</button>
          </div>
          {showAdd && <form onSubmit={add} className="glass-card mt-4 space-y-3 p-4 sm:p-5">
            <label className="block font-ui text-sm text-wine">Title<input className="field mt-1" placeholder={active.placeholder} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required autoFocus /></label>
            <label className="block font-ui text-sm text-wine">Notes <span className="opacity-60">(optional)</span><textarea className="field mt-1 min-h-[85px]" placeholder="Add a little more, if you like" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} /></label>
            <div className="flex flex-wrap gap-2"><AtlasHoldButton submit disabled={!title.trim()}>Add to {active.label}</AtlasHoldButton><button type="button" onClick={() => setShowAdd(false)} className="rounded-full border border-wine/50 px-4 py-2 font-ui text-sm text-wine">Cancel</button></div>
          </form>}
          {entries.length === 0 ? <p className="py-8 font-body text-xl italic text-wine/65">Nothing here yet. Add your first idea when you are ready.</p> : <ul className="divide-y divide-wine/20">
            {entries.map((entry) => <li key={entry.id} className="py-4">
              {editing === entry.id ? <form onSubmit={saveEdit} className="space-y-3 rounded-xl border border-wine/30 bg-marbleDim/50 p-4">
                <label className="block font-ui text-sm text-wine">Title<input className="field mt-1" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={200} required autoFocus /></label>
                <label className="block font-ui text-sm text-wine">Notes<textarea className="field mt-1 min-h-[80px]" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} maxLength={4000} /></label>
                <div className="flex gap-2"><button type="submit" className="rounded-full bg-wine px-4 py-2 font-ui text-sm text-marble">Save changes</button><button type="button" onClick={() => setEditing(null)} className="rounded-full border border-wine/50 px-4 py-2 font-ui text-sm text-wine">Cancel</button></div>
              </form> : <div className="flex flex-wrap items-start gap-3">
                <label className="flex min-w-[150px] flex-1 cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={entry.done} onChange={(event) => updateLifeVision(entry.id, { done: event.target.checked })} aria-label={`${active.doneLabel}: ${entry.title}`} className="mt-1.5 h-5 w-5 shrink-0 accent-[#36454F]" />
                  <span className="min-w-0"><span className={`block break-words font-body text-[21px] text-wine ${entry.done ? "line-through opacity-60" : ""}`}>{entry.title}</span>{entry.notes && <span className="mt-1 block whitespace-pre-wrap break-words font-body text-[17px] text-wine/75">{entry.notes}</span>}{entry.done && <span className="mt-1 block font-ui text-xs uppercase tracking-wider text-wine/70">{active.doneLabel}</span>}</span>
                </label>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => edit(entry)} aria-label={`Edit ${entry.title}`} className="rounded-full border border-wine/50 px-4 py-2 font-ui text-sm text-wine">Edit</button><AtlasHoldButton label={`Delete ${entry.title}`} action={() => removeLifeVision(entry.id)}>Delete</AtlasHoldButton></div>
              </div>}
            </li>)}
          </ul>}
        </section>
      </div>
    </PageShell>
  );
}
