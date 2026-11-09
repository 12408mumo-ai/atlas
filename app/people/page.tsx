"use client";

import { AtlasHoldButton } from "@/components/AtlasHoldButton";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MemorySphere } from "@/components/MemorySphere";
import {
  addPerson,
  daysSince,
  prettyDate,
  touchPerson,
  updatePerson,
  useAtlas,
  type Person,
} from "@/lib/store";
import { useMemories } from "@/lib/memories";

/* ------------------------------------------------------------------ */
/*  People Page — Simple Sphere Navigation                           */
/*  • Opening /people glides the People sphere to the left           */
/*  • Each person you added floats as a sphere in the center          */
/*  • Opening one moves the rest to a scrollable rail on the right    */
/* ------------------------------------------------------------------ */

function daysToBirthday(b: string) {
  const [m, d] = b.split("-").map(Number);
  if (!m || !d) return -1;
  const now = new Date();
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next.getTime() < new Date(now.toDateString()).getTime()) {
    next = new Date(now.getFullYear() + 1, m - 1, d);
  }
  return Math.round((next.getTime() - new Date(now.toDateString()).getTime()) / 86400000);
}

function birthdayLabel(b: string) {
  if (!b) return "Not set";
  const [m, d] = b.split("-").map(Number);
  if (!m || !d) return "Not set";
  return new Date(2025, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
  });
}

/* Someone needs attention when their birthday is close or a promise is still open */
function needsAttention(p: Person) {
  if (p.promise && p.promise !== "—") return true;
  if (p.birthday) {
    const d = daysToBirthday(p.birthday);
    if (d >= 0 && d <= 7) return true;
  }
  return false;
}

export default function PeoplePage() {
  const router = useRouter();
  const atlas = useAtlas();
  const mem = useMemories();

  const [docked, setDocked] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Glide the People sphere from center to the left on open
  useEffect(() => {
    const id = requestAnimationFrame(() => setDocked(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const people = atlas.people;

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.relation.toLowerCase().includes(q)
    );
  }, [search, people]);

  const openPerson = people.find((p) => p.id === openId) ?? null;

  // Photos from Memories where this person is tagged
  const linkedPhotos = useMemo(() => {
    if (!openPerson) return [];
    const names = [openPerson.name, openPerson.name.split(" ")[0]].map((n) =>
      n.trim().toLowerCase()
    );
    return mem.entries
      .filter(
        (e) =>
          e.media &&
          e.media.mediaType === "photo" &&
          e.peopleTags.some((t) => names.includes(t.trim().toLowerCase()))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e) => ({ id: e.id, src: e.media!.src }));
  }, [mem.entries, openPerson]);

  const handleBackPress = () => {
    if (search.trim() !== "") {
      setSearch("");
      return;
    }
    if (openId !== null) {
      setOpenId(null);
      return;
    }
    router.push("/hub");
  };

  return (
    <div className="glass-page relative min-h-[100svh] w-screen overflow-x-hidden text-wine">
      {/* ================================================================ */}
      {/* 1. LEFT PEOPLE SPHERE (glides left on open; press to go back)  */}
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
            <MemorySphere glyph="people" size={78} tone="wine" speed={0.5} />
          </div>
          <div className="transition-transform duration-200 group-hover:scale-105 sm:hidden">
            <MemorySphere glyph="people" size={60} tone="wine" speed={0.5} />
          </div>
          <span className="mt-1 rounded-pill border border-wine bg-marble px-2.5 py-0.5 font-ui text-[13px] text-wine transition-colors group-hover:bg-wine group-hover:text-marble">
            ← Back
          </span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* 2. RIGHT SCROLLABLE SPHERE RAIL (other people glide right)     */}
      {/* ================================================================ */}
      <aside
        aria-label="Other people"
        style={{
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 450ms ease",
        }}
        className={
          openId !== null
            ? "glass-rail fixed right-2 top-1/2 z-40 max-h-[80svh] w-[78px] -translate-y-1/2 translate-x-0 overflow-y-auto py-3 opacity-100 sm:right-5 sm:w-[104px]"
            : "pointer-events-none fixed right-5 top-1/2 z-40 max-h-[80svh] w-[104px] -translate-y-1/2 translate-x-36 opacity-0"
        }
      >
        <div className="flex flex-col items-center gap-5">
          {people
            .filter((p) => p.id !== openId)
            .map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setOpenId(p.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group flex cursor-pointer flex-col items-center transition-transform duration-200 hover:scale-105"
              >
                <div className="hidden sm:block">
                  <MemorySphere
                    glyph="people"
                    size={72}
                    tone="wine"
                    initial={p.name.slice(0, 1)}
                    phaseOffset={i * 0.7}
                  />
                </div>
                <div className="sm:hidden">
                  <MemorySphere
                    glyph="people"
                    size={52}
                    tone="wine"
                    initial={p.name.slice(0, 1)}
                    phaseOffset={i * 0.7}
                  />
                </div>
                <span className="mt-1 max-w-[84px] truncate font-ui text-[13px] text-wine opacity-85 group-hover:opacity-100 sm:text-[14.5px]">
                  {p.name.split(" ")[0]}
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
          openId !== null ? "pr-24 sm:pr-36" : "pr-6 sm:pr-12"
        }`}
      >
        {/* ---- Simple header ---- */}
        <header className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <h1 className="font-display text-[clamp(30px,4.2vw,44px)] tracking-[0.03em] text-wine">
            People
          </h1>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="glass-button px-4 py-2 font-ui text-[15px]"
          >
            {showAdd ? "Close" : "+ Add someone"}
          </button>
        </header>

        {/* ---- Search ---- */}
        <div className="mt-5">
          <div className="glass-input flex items-center px-4 py-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people (e.g. cousin, Mum)"
              className="w-full bg-transparent py-1 font-ui text-[17px] text-wine outline-none placeholder:text-wine/45"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="ml-2 font-ui text-[16px] text-wine opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ---- Add person form ---- */}
        {showAdd && (
          <AddPersonForm
            onDone={() => {
              setShowAdd(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {/* ---- Search results ---- */}
        {searchResults && (
          <section className="mt-7 anim-fade">
            {searchResults.length === 0 ? (
              <p className="py-8 font-body text-[20px] text-wine opacity-65">
                No one matches “{search}”.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setOpenId(p.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl border border-wine/40 bg-marble px-4 py-3 text-left transition-colors hover:border-wine"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-wine bg-wine font-display text-[20px] text-marble">
                        {p.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[21px] text-wine">
                          {p.name}
                        </span>
                        <span className="block font-ui text-[14.5px] text-wine opacity-60">
                          {p.relation} · {p.birthday ? `Birthday ${birthdayLabel(p.birthday)}` : "No birthday yet"}
                        </span>
                      </span>
                      {needsAttention(p) && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-wine" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE A: THE PEOPLE SPHERES (floating constellation)           */}
        {/* ============================================================== */}
        {searchResults === null && openId === null && (
          <section className="mt-12 sm:mt-16 anim-fade">
            {people.length === 0 ? (
              <div className="rounded-2xl border border-wine/40 bg-marbleDim/45 p-8 text-center">
                <p className="font-body text-[21px] text-wine">
                  No one here yet.
                </p>
                <p className="mt-1.5 font-body text-[19px] text-wine opacity-65">
                  Add the first person who matters.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="mt-4 rounded-pill border border-wine bg-wine px-5 py-2 font-ui text-[15px] text-marble"
                >
                  + Add someone
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-10 gap-y-14 sm:grid-cols-3 sm:gap-x-14 sm:gap-y-16">
                {people.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex flex-col items-center text-center"
                    style={{ animationDelay: `${i * 0.7}s` }}
                  >
                    <div className={i % 2 === 0 ? "anim-float" : "anim-float-slow"}>
                      <button
                        type="button"
                        onClick={() => setOpenId(p.id)}
                        className="group block cursor-pointer transition-transform duration-200 hover:scale-105"
                        aria-label={`Open ${p.name}`}
                      >
                        <MemorySphere
                          glyph="people"
                          size={120}
                          tone="wine"
                          initial={p.name.slice(0, 1)}
                          speed={0.5}
                          phaseOffset={i * 0.8}
                        />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-display text-[21px] text-wine">
                        {p.name}
                      </span>
                      {needsAttention(p) && (
                        <span className="font-ui text-[14px] text-wine">
                          <span className="align-middle">·</span> needs a look
                          <span className="ml-1 inline-block h-2 w-2 rounded-full bg-wine align-middle" />
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 font-ui text-[14px] text-wine opacity-60">
                      {p.relation}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE B: OPENED PROFILE                                        */}
        {/* ============================================================== */}
        {searchResults === null && openId !== null && openPerson && (
          <div className="mt-7 anim-fade">
            <PersonProfile
              person={openPerson}
              photos={linkedPhotos}
              onSpokeToday={() => touchPerson(openPerson.id)}
              onClose={() => setOpenId(null)}
              onLightbox={setLightbox}
            />
          </div>
        )}
      </main>

      {/* ================================================================ */}
      {/* LIGHTBOX                                                        */}
      {/* ================================================================ */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[980] grid place-items-center bg-wine/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88svh] max-w-full rounded-xl border-2 border-marble object-contain"
          />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  ADD PERSON FORM                                                    */
/* ================================================================== */

function AddPersonForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [promise, setPromise] = useState("");
  const [gift, setGift] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addPerson(name, relation);
    setName("");
    setRelation("");
    setBirthday("");
    setPromise("");
    setGift("");
    setNotes("");
    onDone();
  };

  return (
    <form
      onSubmit={submit}
      className="glass-card mt-5 space-y-3 p-5 sm:p-6"
    >
      <h2 className="font-display text-[22px] text-wine">Someone new</h2>
      <p className="font-body text-[18px] text-wine opacity-70">
        Just a name is enough. Everything else can be filled in later.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="field py-2.5"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <input
          className="field py-2.5"
          placeholder="Relationship (sister, friend, mentor…)"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />
      </div>

      <details className="group">
        <summary className="cursor-pointer font-ui text-[15px] text-wine opacity-75 hover:opacity-100">
          + Add details (optional)
        </summary>
        <div className="mt-3 space-y-3">
          <input
            className="field py-2.5"
            placeholder="Birthday (e.g. 03-19)"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <input
            className="field py-2.5"
            placeholder="Reminder — something you promised?"
            value={promise}
            onChange={(e) => setPromise(e.target.value)}
          />
          <input
            className="field py-2.5"
            placeholder="Gift idea (optional)"
            value={gift}
            onChange={(e) => setGift(e.target.value)}
          />
          <textarea
            className="field min-h-[70px] py-2.5"
            placeholder="Notes — what they enjoy, where they work…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </details>

      <div className="flex items-center gap-3 pt-1">
        <AtlasHoldButton submit>Hold to add to People</AtlasHoldButton>
        <button
          type="button"
          onClick={onDone}
          className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  PERSON PROFILE                                                    */
/* ================================================================== */

function PersonProfile({
  person,
  photos,
  onSpokeToday,
  onClose,
  onLightbox,
}: {
  person: Person;
  photos: { id: string; src: string }[];
  onSpokeToday: () => void;
  onClose: () => void;
  onLightbox: (src: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [birthday, setBirthday] = useState(person.birthday);
  const [promise, setPromise] = useState(person.promise);
  const [gift, setGift] = useState(person.gift);
  const [notes, setNotes] = useState(person.notes);

  const since = daysSince(person.lastSeen);
  const bday = person.birthday ? daysToBirthday(person.birthday) : -1;

  const save = () => {
    updatePerson(person.id, { birthday, promise, gift, notes });
    setEditing(false);
  };

  return (
    <article className="glass-tile mx-auto max-w-2xl space-y-6 p-6 sm:p-8">
      {/* Photo + name */}
      <header className="flex items-start gap-5">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-wine bg-wine font-display text-[38px] text-marble">
          {person.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[30px] leading-tight text-wine">
            {person.name}
          </h2>
          <p className="mt-1 font-ui text-[15px] text-wine opacity-65">
            {person.relation}
          </p>
          <p className="mt-1 font-body text-[18px] text-wine opacity-70">
            {since === 0 ? "Spoke today" : `Last spoke ${since} days ago`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-ui text-[18px] text-wine opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </header>

      {/* Birthday */}
      <section className="rounded-xl border border-wine/40 bg-marbleDim/40 p-4">
        <h3 className="font-ui text-[14px] uppercase tracking-[0.16em] text-wine opacity-60">
          Birthday
        </h3>
        {!editing ? (
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-display text-[23px] text-wine">
              {person.birthday ? birthdayLabel(person.birthday) : "Not set"}
            </span>
            {bday >= 0 && (
              <span className="font-body text-[18px] text-wine opacity-70">
                {bday === 0
                  ? "· today"
                  : `· in ${bday} ${bday === 1 ? "day" : "days"}`}
              </span>
            )}
          </div>
        ) : (
          <input
            className="field mt-1.5 max-w-[160px] py-2"
            placeholder="MM-DD"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        )}
      </section>

      {/* Reminders */}
      <section>
        <h3 className="font-ui text-[14px] uppercase tracking-[0.16em] text-wine opacity-60">
          Reminders
        </h3>
        <div className="mt-2.5 space-y-2.5">
          <ReminderRow label="Promise" value={promise} editing={editing} onChange={setPromise} />
          <ReminderRow label="Gift idea" value={gift} editing={editing} onChange={setGift} />
        </div>
      </section>

      {/* Notes */}
      <section>
        <h3 className="font-ui text-[14px] uppercase tracking-[0.16em] text-wine opacity-60">
          Notes
        </h3>
        {!editing ? (
          person.notes ? (
            <p className="mt-2.5 whitespace-pre-wrap font-body text-[19px] leading-relaxed text-wine opacity-85">
              {person.notes}
            </p>
          ) : (
            <p className="mt-2.5 font-body text-[19px] text-wine opacity-55">
              No notes yet.
            </p>
          )
        ) : (
          <textarea
            className="field mt-2.5 min-h-[80px] py-2.5"
            placeholder="What do they enjoy? Where do they work?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </section>

      {/* Photos of the two of you */}
      {photos.length > 0 && (
        <section>
          <h3 className="font-ui text-[14px] uppercase tracking-[0.16em] text-wine opacity-60">
            Photos together
          </h3>
          <p className="mt-1 font-body text-[16px] text-wine opacity-55">
            From your Memories, tagged with {person.name.split(" ")[0]}.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {photos.slice(0, 8).map((ph) => (
              <button
                key={ph.id}
                type="button"
                onClick={() => onLightbox(ph.src)}
                className="group relative block aspect-square overflow-hidden rounded-lg border border-wine/35 bg-wine"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ph.src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-wine/15 pt-4">
        <button
          type="button"
          onClick={onSpokeToday}
          className="rounded-pill border border-wine bg-wine px-5 py-2 font-ui text-[15px] text-marble"
        >
          Spoke today
        </button>
        {editing ? (
          <>
            <button
              type="button"
              onClick={save}
              className="rounded-pill border border-wine bg-marble px-5 py-2 font-ui text-[15px] text-wine"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setBirthday(person.birthday);
                setPromise(person.promise);
                setGift(person.gift);
                setNotes(person.notes);
                setEditing(false);
              }}
              className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-pill border border-wine/45 px-4 py-2 font-ui text-[15px] text-wine"
          >
            Edit details
          </button>
        )}
      </div>
    </article>
  );
}

function ReminderRow({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-marbleDim/40 px-4 py-2.5">
      <span className="font-ui text-[14px] uppercase tracking-[0.16em] text-wine opacity-60">
        {label}
      </span>
      {editing ? (
        <input
          className="field w-full py-1.5 text-[17px] sm:w-[220px]"
          placeholder="—"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <span className="text-right font-body text-[19px] text-wine">
          {value && value !== "—" ? value : "—"}
        </span>
      )}
    </div>
  );
}
