"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MemorySphere, type SphereGlyph } from "@/components/MemorySphere";
import { prettyDate, todayISO, useAtlas } from "@/lib/store";
import {
  addMemoryEntry,
  averageDayMood,
  exportMemoriesArchive,
  generateAtlasDailySummary,
  hashPin,
  logToAtlasQuick,
  nowHHMM,
  registerBiometricLock,
  searchMemoriesNaturalLanguage,
  setCustomDailySummary,
  setMemories,
  togglePinMilestone,
  toggleStarMemory,
  useMemories,
  verifyBiometricLock,
  type JournalSubtype,
  type MediaItem,
  type MemoryBranchKey,
  type MemoryEntry,
  type MilestoneCategory,
  type SectionTag,
  type VoiceAttachment,
} from "@/lib/memories";

/* ------------------------------------------------------------------ */
/*  The 5 Memory Branches (Simple Everyday Labels)                    */
/* ------------------------------------------------------------------ */

type BranchMeta = {
  key: MemoryBranchKey;
  name: string;
  sub: string;
  glyph: SphereGlyph;
  phase: number;
};

const BRANCHES: BranchMeta[] = [
  { key: "timeline", name: "Timeline", sub: "Main feed", glyph: "timeline", phase: 0.2 },
  { key: "gallery", name: "Gallery", sub: "Photos & videos", glyph: "gallery", phase: 1.4 },
  { key: "calendar", name: "Calendar", sub: "Month view", glyph: "calendar", phase: 2.6 },
  { key: "journal", name: "Journal", sub: "Notes & voice", glyph: "journal", phase: 3.8 },
  { key: "milestones", name: "Milestones", sub: "Big moments", glyph: "milestones", phase: 5.0 },
];

const SECTIONS: SectionTag[] = ["Work", "Study", "People", "Life"];
const MILESTONE_CATS: MilestoneCategory[] = ["Achievement", "Launch", "Graduation", "Trip", "First"];

type SpeechRecLike = {
  start: () => void;
  stop: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
};

/* ------------------------------------------------------------------ */
/*  Memories Page                                                     */
/* ------------------------------------------------------------------ */

export default function MemoriesPage() {
  const router = useRouter();
  const atlas = useAtlas();
  const mem = useMemories();

  const [globeDocked, setGlobeDocked] = useState(false);
  const [activeBranch, setActiveBranch] = useState<MemoryBranchKey | null>(null);
  const [jumpDate, setJumpDate] = useState<string | null>(null);

  // Top bar controls
  const [barMode, setBarMode] = useState<"search" | "log">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickLogInput, setQuickLogInput] = useState("");
  const [quickLogNotice, setQuickLogNotice] = useState<string | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [lightboxEntry, setLightboxEntry] = useState<MemoryEntry | null>(null);

  // Move Memories Globe from center to left on open
  useEffect(() => {
    const id = requestAnimationFrame(() => setGlobeDocked(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const searchResult = useMemo(
    () => searchMemoriesNaturalLanguage(searchQuery, mem.entries, atlas),
    [searchQuery, mem.entries, atlas]
  );

  const handleBackPress = () => {
    if (activeBranch !== null) {
      setActiveBranch(null);
      setJumpDate(null);
      return;
    }
    router.push("/hub");
  };

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLogInput.trim()) return;
    const res = logToAtlasQuick(quickLogInput);
    setQuickLogInput("");
    setQuickLogNotice(`Saved to Timeline and ${res.filedUnder.join(" & ")}`);
    window.setTimeout(() => setQuickLogNotice(null), 4000);
  };

  const openLinkedItem = (id: string) => {
    const found = mem.entries.find((x) => x.id === id);
    if (found) setLightboxEntry(found);
  };

  if (mem.lock.locked) {
    return (
      <LockScreen
        pinHash={mem.lock.pinHash}
        biometricCredentialId={mem.lock.biometricCredentialId}
        onUnlock={() => setMemories((prev) => ({ lock: { ...prev.lock, locked: false } }))}
        onBack={() => router.push("/hub")}
      />
    );
  }

  const currentBranchMeta = BRANCHES.find((b) => b.key === activeBranch);

  return (
    <div className="relative min-h-[100svh] w-screen overflow-x-hidden bg-marble text-wine">
      {/* ================================================================ */}
      {/* 1. LEFT MEMORIES GLOBE (Moves left on open; tap to go back)      */}
      {/* ================================================================ */}
      <div
        style={{
          transition:
            "left 700ms cubic-bezier(0.22, 1, 0.36, 1), top 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={
          globeDocked
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
            <MemorySphere glyph="memories" size={78} tone="wine" speed={0.5} />
          </div>
          <div className="transition-transform duration-200 group-hover:scale-105 sm:hidden">
            <MemorySphere glyph="memories" size={60} tone="wine" speed={0.5} />
          </div>
          <span className="mt-1 rounded-pill border border-wine bg-marble px-2.5 py-0.5 font-ui text-[13px] text-wine transition-colors group-hover:bg-wine group-hover:text-marble">
            ← Back
          </span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* 2. RIGHT SCROLLABLE SPHERE RAIL (Other branches move right)      */}
      {/* ================================================================ */}
      <aside
        aria-label="Other branches"
        style={{
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 450ms ease",
        }}
        className={
          activeBranch !== null
            ? "fixed right-2 top-1/2 z-40 max-h-[80svh] w-[78px] -translate-y-1/2 translate-x-0 overflow-y-auto py-3 opacity-100 sm:right-5 sm:w-[104px]"
            : "pointer-events-none fixed right-5 top-1/2 z-40 max-h-[80svh] w-[104px] -translate-y-1/2 translate-x-36 opacity-0"
        }
      >
        <div className="flex flex-col items-center gap-5">
          {BRANCHES.filter((b) => b.key !== activeBranch).map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                if (b.key !== "timeline") setJumpDate(null);
                setActiveBranch(b.key);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="group flex cursor-pointer flex-col items-center transition-transform duration-200 hover:scale-105"
            >
              <div className="hidden sm:block">
                <MemorySphere glyph={b.glyph} size={72} tone="wine" phaseOffset={b.phase} />
              </div>
              <div className="sm:hidden">
                <MemorySphere glyph={b.glyph} size={52} tone="wine" phaseOffset={b.phase} />
              </div>
              <span className="mt-1 font-ui text-[13px] text-wine opacity-85 group-hover:opacity-100 sm:text-[14.5px]">
                {b.name}
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
          activeBranch !== null ? "pr-24 sm:pr-36" : "pr-6 sm:pr-12"
        }`}
      >
        {/* ---- Simple Header ---- */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-[clamp(30px,4.2vw,44px)] tracking-[0.03em] text-wine">
            {currentBranchMeta ? currentBranchMeta.name : "Memories"}
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (mem.lock.pinHash || mem.lock.biometricCredentialId) {
                  setMemories((prev) => ({ lock: { ...prev.lock, locked: true } }));
                } else {
                  setShowLockModal(true);
                }
              }}
              className="rounded-pill border border-wine/50 px-3.5 py-1.5 font-ui text-[15px] text-wine transition-colors hover:border-wine hover:bg-wine hover:text-marble"
            >
              Lock
            </button>

            {(mem.lock.pinHash || mem.lock.biometricCredentialId) && (
              <button
                type="button"
                onClick={() => setShowLockModal(true)}
                className="rounded-pill border border-wine/35 px-3 py-1.5 font-ui text-[14.5px] text-wine opacity-75 hover:opacity-100"
              >
                PIN
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className="rounded-pill border border-wine/50 px-3.5 py-1.5 font-ui text-[15px] text-wine transition-colors hover:border-wine hover:bg-wine hover:text-marble"
              >
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border-2 border-wine bg-marble p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      exportMemoriesArchive("markdown", mem);
                      setShowExportMenu(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left font-ui text-[15.5px] text-wine hover:bg-wine hover:text-marble"
                  >
                    Download Text (.md)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportMemoriesArchive("json", mem);
                      setShowExportMenu(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left font-ui text-[15.5px] text-wine hover:bg-wine hover:text-marble"
                  >
                    Download Data (.json)
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ---- Single Clean Bar: Search OR Quick Log ---- */}
        <div className="mt-5">
          {barMode === "search" ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-pill border border-wine/60 bg-marble px-4 py-1.5 focus-within:border-wine">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories (e.g. when did I last see my cousin?)"
                  className="w-full bg-transparent py-1 font-ui text-[17px] text-wine outline-none placeholder:text-wine/45"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="ml-2 font-ui text-[16px] text-wine opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setBarMode("log");
                }}
                className="shrink-0 rounded-pill border border-wine bg-wine px-4 py-2 font-ui text-[15px] text-marble transition-opacity hover:opacity-90"
              >
                + Quick log
              </button>
            </div>
          ) : (
            <form onSubmit={handleQuickLogSubmit} className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-pill border-2 border-wine bg-marble px-4 py-1.5">
                <input
                  type="text"
                  autoFocus
                  value={quickLogInput}
                  onChange={(e) => setQuickLogInput(e.target.value)}
                  placeholder="Log to Atlas (e.g. spent 800 on lunch with Sam)"
                  className="w-full bg-transparent py-1 font-ui text-[17px] text-wine outline-none placeholder:text-wine/45"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-pill border border-wine bg-wine px-4 py-2 font-ui text-[15px] text-marble"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setBarMode("search")}
                className="shrink-0 rounded-pill border border-wine/45 px-3.5 py-2 font-ui text-[15px] text-wine"
              >
                Cancel
              </button>
            </form>
          )}

          {quickLogNotice && (
            <p className="mt-2.5 font-ui text-[15.5px] text-wine">
              ✓ {quickLogNotice}
            </p>
          )}
        </div>

        {/* ---- Search Results (only when typing in Search) ---- */}
        {searchQuery.trim() !== "" && (
          <section className="mt-6 space-y-4 border-b border-wine/20 pb-8">
            {searchResult.answer && (
              <div className="rounded-xl border border-wine bg-marbleDim/70 px-4 py-3">
                <p className="font-body text-[20px] text-wine">{searchResult.answer}</p>
              </div>
            )}

            {searchResult.results.length === 0 ? (
              <p className="font-body text-[19px] text-wine opacity-70">
                No memories matched “{searchQuery}”.
              </p>
            ) : (
              <div className="space-y-3">
                {searchResult.results.slice(0, 8).map((entry) => (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    allEntries={mem.entries}
                    onOpenMedia={setLightboxEntry}
                    onOpenLinked={openLinkedItem}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE A: THE 5 SPHERES (Clean, Open, Unboxed)                  */}
        {/* ============================================================== */}
        {activeBranch === null && searchQuery.trim() === "" && (
          <section className="mt-12 sm:mt-16 anim-fade">
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 sm:gap-x-16 sm:gap-y-12">
              {BRANCHES.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setActiveBranch(b.key)}
                  className="group flex w-[150px] cursor-pointer flex-col items-center text-center transition-transform duration-200 hover:-translate-y-1 sm:w-[170px]"
                >
                  <div className="transition-transform duration-200 group-hover:scale-105">
                    <MemorySphere
                      glyph={b.glyph}
                      size={132}
                      tone="wine"
                      speed={0.5}
                      phaseOffset={b.phase}
                    />
                  </div>
                  <span className="mt-3 font-display text-[23px] text-wine">
                    {b.name}
                  </span>
                  <span className="mt-0.5 font-ui text-[14.5px] text-wine opacity-65">
                    {b.sub}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE B: OPENED BRANCH PAGE                                    */}
        {/* ============================================================== */}
        {activeBranch === "timeline" && (
          <div className="mt-7 anim-fade">
            <TimelineView
              entries={mem.entries}
              customSummaries={mem.customSummaries}
              jumpDate={jumpDate}
              onClearJumpDate={() => setJumpDate(null)}
              onOpenMedia={setLightboxEntry}
              onOpenLinked={openLinkedItem}
            />
          </div>
        )}

        {activeBranch === "gallery" && (
          <div className="mt-7 anim-fade">
            <GalleryView
              entries={mem.entries}
              albums={mem.albums}
              onOpenLightbox={setLightboxEntry}
            />
          </div>
        )}

        {activeBranch === "calendar" && (
          <div className="mt-7 anim-fade">
            <CalendarView
              entries={mem.entries}
              onSelectDate={(iso) => {
                setJumpDate(iso);
                setActiveBranch("timeline");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}

        {activeBranch === "journal" && (
          <div className="mt-7 anim-fade">
            <JournalView
              entries={mem.entries}
              onOpenMedia={setLightboxEntry}
              onOpenLinked={openLinkedItem}
            />
          </div>
        )}

        {activeBranch === "milestones" && (
          <div className="mt-7 anim-fade">
            <MilestonesView
              entries={mem.entries}
              onOpenMedia={setLightboxEntry}
              onOpenLinked={openLinkedItem}
            />
          </div>
        )}
      </main>

      {/* ================================================================ */}
      {/* MODALS                                                           */}
      {/* ================================================================ */}
      {lightboxEntry && (
        <LightboxModal
          entry={lightboxEntry}
          allEntries={mem.entries}
          onClose={() => setLightboxEntry(null)}
          onSelectLinked={setLightboxEntry}
        />
      )}

      {showLockModal && (
        <LockSetupModal
          pinHash={mem.lock.pinHash}
          biometricCredentialId={mem.lock.biometricCredentialId}
          onClose={() => setShowLockModal(false)}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  1. TIMELINE VIEW                                                  */
/* ================================================================== */

function TimelineView({
  entries,
  customSummaries,
  jumpDate,
  onClearJumpDate,
  onOpenMedia,
  onOpenLinked,
}: {
  entries: MemoryEntry[];
  customSummaries: Record<string, string>;
  jumpDate: string | null;
  onClearJumpDate: () => void;
  onOpenMedia: (e: MemoryEntry) => void;
  onOpenLinked: (id: string) => void;
}) {
  const [sectionFilter, setSectionFilter] = useState<SectionTag | "All">("All");
  const [starredOnly, setStarredOnly] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");

  const today = todayISO();
  const monthDay = today.slice(5);

  const onThisDay = useMemo(
    () =>
      entries
        .filter((e) => e.date.slice(5) === monthDay && e.date.slice(0, 4) !== today.slice(0, 4))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, monthDay, today]
  );

  const filtered = useMemo(() => {
    return [...entries]
      .filter((e) => {
        if (jumpDate && e.date !== jumpDate) return false;
        if (sectionFilter !== "All" && e.section !== sectionFilter) return false;
        if (starredOnly && !e.starred) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [entries, jumpDate, sectionFilter, starredOnly]);

  const byDay = useMemo(() => {
    const map = new Map<string, MemoryEntry[]>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-7">
      {/* Simple filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {(["All", ...SECTIONS] as const).map((sec) => (
          <FilterPill
            key={sec}
            active={sectionFilter === sec}
            onClick={() => setSectionFilter(sec)}
          >
            {sec}
          </FilterPill>
        ))}
        <FilterPill active={starredOnly} onClick={() => setStarredOnly((v) => !v)}>
          ★ Starred
        </FilterPill>
      </div>

      {/* Selected date notice from Calendar */}
      {jumpDate && (
        <div className="flex items-center justify-between rounded-xl border border-wine bg-marbleDim/70 px-4 py-3">
          <span className="font-ui text-[16px] text-wine">
            Showing {prettyDate(jumpDate)}
          </span>
          <button
            type="button"
            onClick={onClearJumpDate}
            className="font-ui text-[15px] underline text-wine"
          >
            Show all days
          </button>
        </div>
      )}

      {/* On this day */}
      {!jumpDate && onThisDay.length > 0 && (
        <section className="rounded-2xl border border-wine/45 bg-marbleDim/55 p-4 sm:p-5">
          <p className="font-ui text-[15px] text-wine opacity-75">On this day</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {onThisDay.map((item) => {
              const yrs = Number(today.slice(0, 4)) - Number(item.date.slice(0, 4));
              const thumb = item.media?.src ?? item.mediaAttachments?.[0]?.src;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenMedia(item)}
                  className="flex items-center gap-3.5 rounded-xl border border-wine/35 bg-marble p-3 text-left transition-colors hover:border-wine"
                >
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-ui text-[13.5px] text-wine opacity-65">
                      {yrs} {yrs === 1 ? "year" : "years"} ago
                    </p>
                    <p className="truncate font-display text-[19px] text-wine">{item.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Days */}
      {byDay.length === 0 ? (
        <p className="py-8 font-body text-[20px] text-wine opacity-65">No entries for this view.</p>
      ) : (
        <div className="space-y-9">
          {byDay.map(([date, dayEntries]) => {
            const mood = averageDayMood(dayEntries);
            const summary = generateAtlasDailySummary(date, dayEntries, customSummaries);
            return (
              <section key={date}>
                {/* Day Header: Date + Mood Dot + 1-line Summary */}
                <div className="border-b border-wine/25 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-display text-[22px] text-wine">
                      {date === today ? "Today" : prettyDate(date)}
                    </h2>
                    {date === today && (
                      <span className="font-ui text-[15px] text-wine opacity-60">
                        · {prettyDate(date)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 font-ui text-[14.5px] text-wine opacity-75">
                      <span className="h-2.5 w-2.5 rounded-full bg-wine" />
                      Mood {mood}/5
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDate(editingDate === date ? null : date);
                        setSummaryDraft(summary);
                      }}
                      className="ml-auto font-ui text-[13.5px] text-wine opacity-55 hover:opacity-100"
                    >
                      Edit summary
                    </button>
                  </div>

                  {editingDate === date ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="field flex-1 py-1.5 text-[17px]"
                        value={summaryDraft}
                        onChange={(e) => setSummaryDraft(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDailySummary(date, summaryDraft);
                          setEditingDate(null);
                        }}
                        className="rounded-pill bg-wine px-4 py-1.5 font-ui text-[14.5px] text-marble"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 font-body text-[19px] text-wine opacity-75">
                      {summary}
                    </p>
                  )}
                </div>

                {/* Day items */}
                <div className="mt-3.5 space-y-3">
                  {dayEntries.map((entry) => (
                    <EntryItem
                      key={entry.id}
                      entry={entry}
                      allEntries={entries}
                      onOpenMedia={onOpenMedia}
                      onOpenLinked={onOpenLinked}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EntryItem({
  entry,
  allEntries,
  onOpenMedia,
  onOpenLinked,
}: {
  entry: MemoryEntry;
  allEntries: MemoryEntry[];
  onOpenMedia: (e: MemoryEntry) => void;
  onOpenLinked: (id: string) => void;
}) {
  const linked = entry.linkedIds
    .map((id) => allEntries.find((x) => x.id === id))
    .filter((x): x is MemoryEntry => Boolean(x));

  /* Small row for auto-logged entries */
  if (entry.kind === "autolog") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-marbleDim/45 px-3.5 py-2">
        <span className="font-ui text-[14px] tabular-nums text-wine opacity-60">
          {entry.time}
        </span>
        <p className="min-w-0 flex-1 truncate font-body text-[19px] text-wine">
          {entry.title}
        </p>
        {entry.section && (
          <span className="font-ui text-[13.5px] text-wine opacity-60">{entry.section}</span>
        )}
        <button
          type="button"
          onClick={() => toggleStarMemory(entry.id)}
          aria-label="Star"
          className="font-ui text-[17px] text-wine opacity-55 hover:opacity-100"
        >
          {entry.starred ? "★" : "☆"}
        </button>
      </div>
    );
  }

  /* Big card for notes, media, and milestones */
  const photos: MediaItem[] = [
    ...(entry.media ? [entry.media] : []),
    ...(entry.mediaAttachments ?? []),
  ];

  const metaParts = [
    entry.time,
    entry.kind === "milestone" ? `Milestone (${entry.milestoneCategory ?? "Moment"})` : "",
    entry.section ?? "",
    entry.location ?? "",
    entry.peopleTags.length ? `with ${entry.peopleTags.join(", ")}` : "",
  ].filter(Boolean);

  return (
    <article className="rounded-xl border border-wine/40 bg-marble p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[22px] leading-snug text-wine">{entry.title}</h3>
          <p className="mt-0.5 font-ui text-[14px] text-wine opacity-60">
            {metaParts.join(" · ")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleStarMemory(entry.id)}
          title={entry.starred ? "Starred" : "Star"}
          className="shrink-0 font-ui text-[20px] text-wine opacity-75 hover:opacity-100"
        >
          {entry.starred ? "★" : "☆"}
        </button>
      </div>

      {entry.text && (
        <p className="mt-2.5 whitespace-pre-wrap font-body text-[20px] leading-relaxed text-wine opacity-90">
          {entry.text}
        </p>
      )}

      {entry.voice && (
        <div className="mt-3 rounded-lg bg-marbleDim/65 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-ui text-[14.5px] text-wine">
              Voice note ({entry.voice.durationSec}s)
            </span>
            {entry.voice.audioUrl && (
              <audio controls src={entry.voice.audioUrl} className="h-8 max-w-[230px]" />
            )}
          </div>
          {entry.voice.transcript && (
            <p className="mt-1.5 font-body text-[18.5px] italic text-wine opacity-80">
              “{entry.voice.transcript}”
            </p>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          {photos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpenMedia(entry)}
              className="group relative overflow-hidden rounded-lg border border-wine/30 bg-wine text-left"
            >
              {m.mediaType === "video" ? (
                <div className="relative">
                  <video
                    src={m.src}
                    poster={m.poster}
                    muted
                    playsInline
                    loop
                    onMouseEnter={(ev) => void ev.currentTarget.play().catch(() => undefined)}
                    onMouseLeave={(ev) => ev.currentTarget.pause()}
                    className="h-48 w-full object-cover"
                  />
                  <span className="absolute bottom-2.5 left-2.5 rounded-pill bg-wine/85 px-2.5 py-0.5 font-ui text-[13px] text-marble">
                    ▶ Video {m.duration ?? ""}
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.src}
                  alt={entry.title}
                  className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {linked.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {linked.map((le) => (
            <button
              key={le.id}
              type="button"
              onClick={() => onOpenLinked(le.id)}
              className="font-ui text-[14px] underline text-wine opacity-70 hover:opacity-100"
            >
              Linked: {le.title}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/* ================================================================== */
/*  2. GALLERY VIEW                                                   */
/* ================================================================== */

function GalleryView({
  entries,
  albums,
  onOpenLightbox,
}: {
  entries: MemoryEntry[];
  albums: string[];
  onOpenLightbox: (e: MemoryEntry) => void;
}) {
  const [mediaFilter, setMediaFilter] = useState<"all" | "photo" | "video">("all");
  const [selectedAlbum, setSelectedAlbum] = useState("All");
  const [showUpload, setShowUpload] = useState(false);

  const [caption, setCaption] = useState("");
  const [album, setAlbum] = useState("Trips");
  const [people, setPeople] = useState("");
  const [preview, setPreview] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);

  const mediaList = useMemo(() => {
    return entries
      .filter((e) => Boolean(e.media))
      .filter((e) => {
        if (mediaFilter !== "all" && e.media?.mediaType !== mediaFilter) return false;
        if (selectedAlbum !== "All" && e.media?.album !== selectedAlbum) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [entries, mediaFilter, selectedAlbum]);

  const byMonth = useMemo(() => {
    const map = new Map<string, MemoryEntry[]>();
    for (const e of mediaList) {
      const ym = e.date.slice(0, 7);
      const list = map.get(ym) ?? [];
      list.push(e);
      map.set(ym, list);
    }
    return Array.from(map.entries());
  }, [mediaList]);

  const onPickFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreview({ src: reader.result, mediaType: isVideo ? "video" : "photo" });
      }
    };
    reader.readAsDataURL(file);
  };

  const saveMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    addMemoryEntry({
      kind: "media",
      title: caption.trim() || `Uploaded ${preview.mediaType}`,
      text: "",
      date: todayISO(),
      time: nowHHMM(),
      section: "Life",
      peopleTags: people
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      mood: 5,
      linkedIds: [],
      media: {
        id: `med-${Date.now()}`,
        mediaType: preview.mediaType,
        src: preview.src,
        album,
      },
    });
    setCaption("");
    setPeople("");
    setPreview(null);
    setShowUpload(false);
  };

  const monthTitle = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Type filter + Upload button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              ["all", "All"],
              ["photo", "Photos"],
              ["video", "Videos"],
            ] as const
          ).map(([k, label]) => (
            <FilterPill key={k} active={mediaFilter === k} onClick={() => setMediaFilter(k)}>
              {label}
            </FilterPill>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="rounded-pill bg-wine px-4 py-1.5 font-ui text-[15px] text-marble"
        >
          {showUpload ? "Close" : "+ Add photo / video"}
        </button>
      </div>

      {/* Albums row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-ui text-[14.5px] text-wine opacity-65">Albums:</span>
        {["All", ...albums].map((alb) => (
          <FilterPill key={alb} active={selectedAlbum === alb} onClick={() => setSelectedAlbum(alb)}>
            {alb}
          </FilterPill>
        ))}
      </div>

      {/* Simple upload form */}
      {showUpload && (
        <form
          onSubmit={saveMedia}
          className="space-y-3 rounded-xl border border-wine/50 bg-marbleDim/45 p-4"
        >
          <label className="block cursor-pointer rounded-lg border border-dashed border-wine p-4 text-center font-ui text-[16px] text-wine">
            {preview ? `Selected ${preview.mediaType} (click to change)` : "Choose a photo or video"}
            <input type="file" accept="image/*,video/*" onChange={onPickFile} className="hidden" />
          </label>
          <input
            className="field py-2"
            placeholder="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field py-2" value={album} onChange={(e) => setAlbum(e.target.value)}>
              {albums.map((a) => (
                <option key={a} value={a}>
                  Album: {a}
                </option>
              ))}
            </select>
            <input
              className="field py-2"
              placeholder="People in this (optional)"
              value={people}
              onChange={(e) => setPeople(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!preview}
            className="rounded-pill bg-wine px-5 py-2 font-ui text-[15px] text-marble disabled:opacity-40"
          >
            Save
          </button>
        </form>
      )}

      {/* Month-grouped grid */}
      {byMonth.length === 0 ? (
        <p className="py-8 font-body text-[20px] text-wine opacity-65">No photos or videos here yet.</p>
      ) : (
        <div className="space-y-8">
          {byMonth.map(([ym, list]) => (
            <section key={ym}>
              <h2 className="mb-3 font-display text-[22px] text-wine">{monthTitle(ym)}</h2>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {list.map((item) => {
                  const m = item.media!;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenLightbox(item)}
                      className="group text-left"
                    >
                      <div className="relative h-48 overflow-hidden rounded-xl border border-wine/35 bg-wine">
                        {m.mediaType === "video" ? (
                          <>
                            <video
                              src={m.src}
                              poster={m.poster}
                              muted
                              loop
                              playsInline
                              onMouseEnter={(ev) => void ev.currentTarget.play().catch(() => undefined)}
                              onMouseLeave={(ev) => ev.currentTarget.pause()}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-2 left-2 rounded-pill bg-wine/85 px-2.5 py-0.5 font-ui text-[12.5px] text-marble">
                              ▶ Video
                            </span>
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.src}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <p className="mt-2 truncate font-body text-[19px] text-wine">{item.title}</p>
                      <p className="font-ui text-[13.5px] text-wine opacity-60">
                        {prettyDate(item.date)} · {m.album}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  3. CALENDAR VIEW                                                  */
/* ================================================================== */

function CalendarView({
  entries,
  onSelectDate,
}: {
  entries: MemoryEntry[];
  onSelectDate: (iso: string) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const byDate = useMemo(() => {
    const map = new Map<string, MemoryEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const label = firstDay.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const today = todayISO();

  const shift = (delta: number) => {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-[24px] text-wine">{label}</h2>
          <p className="font-ui text-[14.5px] text-wine opacity-65">
            Tap any day to open it in Timeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterPill active={false} onClick={() => shift(-1)}>
            ← Prev
          </FilterPill>
          <FilterPill
            active={false}
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
          >
            Today
          </FilterPill>
          <FilterPill active={false} onClick={() => shift(1)}>
            Next →
          </FilterPill>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center font-ui text-[14px] text-wine opacity-65">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} className="h-16 sm:h-20" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = byDate.get(iso)?.length ?? 0;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={`flex h-16 flex-col justify-between rounded-xl border p-2 text-left transition-colors sm:h-20 sm:p-2.5 ${
                count >= 3
                  ? "border-wine bg-wine text-marble"
                  : count > 0
                    ? "border-wine/65 bg-marbleDim text-wine hover:bg-wine hover:text-marble"
                    : "border-wine/25 bg-marble text-wine hover:border-wine"
              }`}
            >
              <span className={`font-ui text-[16px] ${isToday ? "font-bold underline" : ""}`}>
                {day}
              </span>
              {count > 0 && (
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(4, count) }).map((__, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-current" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  4. JOURNAL VIEW                                                   */
/* ================================================================== */

function JournalView({
  entries,
  onOpenMedia,
  onOpenLinked,
}: {
  entries: MemoryEntry[];
  onOpenMedia: (e: MemoryEntry) => void;
  onOpenLinked: (id: string) => void;
}) {
  const [subFilter, setSubFilter] = useState<"all" | "daily" | "reflections" | "highlights">("all");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [subtype, setSubtype] = useState<JournalSubtype>("daily");
  const [mood, setMood] = useState(4);
  const [starred, setStarred] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [section, setSection] = useState<SectionTag>("Life");
  const [people, setPeople] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [voiceNote, setVoiceNote] = useState<VoiceAttachment | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<SpeechRecLike | null>(null);
  const timerRef = useRef<number | null>(null);
  const t0Ref = useRef(0);

  const startRecording = async () => {
    setVoiceNote(null);
    setRecSec(0);
    t0Ref.current = Date.now();
    setRecording(true);
    timerRef.current = window.setInterval(() => {
      setRecSec(Math.max(1, Math.round((Date.now() - t0Ref.current) / 1000)));
    }, 500);

    let transcript = "";
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecLike;
      webkitSpeechRecognition?: new () => SpeechRecLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (Ctor) {
      try {
        const rec = new Ctor();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (ev) => {
          const parts: string[] = [];
          for (let i = 0; i < ev.results.length; i++) {
            parts.push(ev.results[i]?.[0]?.transcript ?? "");
          }
          transcript = parts.join(" ").trim();
          if (transcript) setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        };
        rec.onerror = () => undefined;
        speechRef.current = rec;
        rec.start();
      } catch {}
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const dur = Math.max(1, Math.round((Date.now() - t0Ref.current) / 1000));
          const blob = new Blob(chunks, { type: "audio/webm" });
          setVoiceNote({
            durationSec: dur,
            audioUrl: URL.createObjectURL(blob),
            transcript: transcript || undefined,
          });
        };
        mrRef.current = mr;
        mr.start();
      } catch {}
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    speechRef.current?.stop();
    speechRef.current = null;
    if (mrRef.current && mrRef.current.state !== "inactive") {
      mrRef.current.stop();
      mrRef.current = null;
    } else {
      setVoiceNote({
        durationSec: Math.max(2, Math.round((Date.now() - t0Ref.current) / 1000)),
        transcript: text.trim() || "Voice note recorded.",
      });
    }
    setRecording(false);
  };

  const onPhotoPick = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !voiceNote) return;

    addMemoryEntry({
      kind: "journal",
      journalSubtype: subtype,
      title: title.trim() || (subtype === "idea" ? "Idea" : subtype === "reflection" ? "Reflection" : "Daily note"),
      text: text.trim(),
      date: todayISO(),
      time: nowHHMM(),
      section,
      peopleTags: people
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      mood,
      location: location.trim() || undefined,
      starred,
      linkedIds: [],
      voice: voiceNote ?? undefined,
      mediaAttachments: photo
        ? [{ id: `att-${Date.now()}`, mediaType: "photo", src: photo, album: "Events" }]
        : undefined,
    });

    setTitle("");
    setText("");
    setPeople("");
    setLocation("");
    setStarred(false);
    setPhoto(null);
    setVoiceNote(null);
    setShowMore(false);
  };

  const list = useMemo(() => {
    return entries
      .filter((e) => {
        if (subFilter === "highlights") return Boolean(e.starred);
        if (e.kind !== "journal") return false;
        if (subFilter === "daily") return (e.journalSubtype ?? "daily") === "daily";
        if (subFilter === "reflections")
          return e.journalSubtype === "reflection" || e.journalSubtype === "idea";
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [entries, subFilter]);

  return (
    <div className="space-y-6">
      {/* Sub-filters */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["daily", "Daily"],
            ["reflections", "Reflections & Ideas"],
            ["highlights", "★ Starred"],
          ] as const
        ).map(([k, label]) => (
          <FilterPill key={k} active={subFilter === k} onClick={() => setSubFilter(k)}>
            {label}
          </FilterPill>
        ))}
      </div>

      {/* Simple clean composer */}
      <form
        onSubmit={saveEntry}
        className="space-y-3 rounded-xl border border-wine/45 bg-marble p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["daily", "Daily"],
              ["reflection", "Reflection"],
              ["idea", "Idea"],
            ] as const
          ).map(([k, label]) => (
            <FilterPill key={k} active={subtype === k} onClick={() => setSubtype(k)}>
              {label}
            </FilterPill>
          ))}
          <button
            type="button"
            onClick={() => setStarred((v) => !v)}
            className="ml-auto font-ui text-[15px] text-wine opacity-75 hover:opacity-100"
          >
            {starred ? "★ Starred" : "☆ Star"}
          </button>
        </div>

        <input
          className="w-full border-b border-wine/20 bg-transparent py-1.5 font-display text-[21px] text-wine outline-none placeholder:text-wine/40"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="min-h-[110px] w-full resize-y bg-transparent font-body text-[20px] leading-relaxed text-wine outline-none placeholder:text-wine/45"
          placeholder="Write a note, or tap Voice below to speak..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {voiceNote && (
          <div className="flex items-center justify-between rounded-lg bg-marbleDim px-3 py-2 font-ui text-[14.5px]">
            <span>Voice note ({voiceNote.durationSec}s)</span>
            <button type="button" onClick={() => setVoiceNote(null)} className="underline">
              Remove
            </button>
          </div>
        )}

        {photo && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="font-ui text-[14px] underline text-wine"
            >
              Remove photo
            </button>
          </div>
        )}

        {showMore && (
          <div className="grid gap-2.5 pt-1 sm:grid-cols-3">
            <select
              className="field py-2 text-[16px]"
              value={section}
              onChange={(e) => setSection(e.target.value as SectionTag)}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              className="field py-2 text-[16px]"
              placeholder="People"
              value={people}
              onChange={(e) => setPeople(e.target.value)}
            />
            <input
              className="field py-2 text-[16px]"
              placeholder="Place"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-wine/15 pt-3">
          <span className="font-ui text-[14.5px] text-wine opacity-65">Mood:</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMood(n)}
              className={`h-7 w-7 rounded-full border border-wine font-ui text-[14px] ${
                mood >= n ? "bg-wine text-marble" : "text-wine"
              }`}
            >
              {n}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={recording ? stopRecording : () => void startRecording()}
              className={`rounded-pill border border-wine/50 px-3.5 py-1.5 font-ui text-[14.5px] ${
                recording ? "bg-wine text-marble" : "text-wine"
              }`}
            >
              {recording ? `Stop (${recSec}s)` : "Voice"}
            </button>

            <label className="cursor-pointer rounded-pill border border-wine/50 px-3.5 py-1.5 font-ui text-[14.5px] text-wine">
              Photo
              <input type="file" accept="image/*" onChange={onPhotoPick} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="rounded-pill border border-wine/35 px-3 py-1.5 font-ui text-[14.5px] text-wine opacity-75"
            >
              {showMore ? "Less" : "+ Tags"}
            </button>

            <button
              type="submit"
              className="rounded-pill bg-wine px-5 py-1.5 font-ui text-[15px] text-marble"
            >
              Save
            </button>
          </div>
        </div>
      </form>

      {/* Entries */}
      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="py-6 font-body text-[20px] text-wine opacity-65">No notes here yet.</p>
        ) : (
          list.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              allEntries={entries}
              onOpenMedia={onOpenMedia}
              onOpenLinked={onOpenLinked}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  5. MILESTONES VIEW                                                */
/* ================================================================== */

function MilestonesView({
  entries,
  onOpenMedia,
  onOpenLinked,
}: {
  entries: MemoryEntry[];
  onOpenMedia: (e: MemoryEntry) => void;
  onOpenLinked: (id: string) => void;
}) {
  const [catFilter, setCatFilter] = useState<MilestoneCategory | "All">("All");
  const [showAdd, setShowAdd] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [cat, setCat] = useState<MilestoneCategory>("Achievement");
  const [note, setNote] = useState("");
  const [linkedPhotoId, setLinkedPhotoId] = useState("");

  const galleryPhotos = useMemo(
    () => entries.filter((e) => e.media?.mediaType === "photo"),
    [entries]
  );

  const list = useMemo(() => {
    return entries
      .filter((e) => e.kind === "milestone")
      .filter((e) => catFilter === "All" || e.milestoneCategory === catFilter)
      .sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
          b.date.localeCompare(a.date)
      );
  }, [entries, catFilter]);

  const addMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const photoEntry = galleryPhotos.find((g) => g.id === linkedPhotoId);

    addMemoryEntry({
      kind: "milestone",
      milestoneCategory: cat,
      pinned: true,
      title: title.trim(),
      text: note.trim(),
      date,
      time: nowHHMM(),
      section: "Life",
      peopleTags: [],
      mood: 5,
      starred: true,
      linkedIds: photoEntry ? [photoEntry.id] : [],
      mediaAttachments: photoEntry?.media ? [photoEntry.media] : undefined,
    });

    setTitle("");
    setNote("");
    setLinkedPhotoId("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["All", ...MILESTONE_CATS] as const).map((c) => (
            <FilterPill key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
              {c}
            </FilterPill>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-pill bg-wine px-4 py-1.5 font-ui text-[15px] text-marble"
        >
          {showAdd ? "Close" : "+ Add milestone"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={addMilestone}
          className="space-y-3 rounded-xl border border-wine/50 bg-marbleDim/45 p-4"
        >
          <input
            className="field py-2"
            placeholder="Milestone title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              className="field py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <select
              className="field py-2"
              value={cat}
              onChange={(e) => setCat(e.target.value as MilestoneCategory)}
            >
              {MILESTONE_CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="field min-h-[85px] py-2"
            placeholder="Short note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <select
            className="field py-2"
            value={linkedPhotoId}
            onChange={(e) => setLinkedPhotoId(e.target.value)}
          >
            <option value="">Link a photo from Gallery (optional)</option>
            {galleryPhotos.map((p) => (
              <option key={p.id} value={p.id}>
                {prettyDate(p.date)} — {p.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-pill bg-wine px-5 py-2 font-ui text-[15px] text-marble"
          >
            Save milestone
          </button>
        </form>
      )}

      {list.length === 0 ? (
        <p className="py-8 font-body text-[20px] text-wine opacity-65">No milestones here yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((ms) => {
            const photo = ms.media ?? ms.mediaAttachments?.[0];
            return (
              <article
                key={ms.id}
                className="flex flex-col justify-between rounded-xl border border-wine/40 bg-marble p-4 sm:p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 font-ui text-[14px] text-wine opacity-70">
                    <span>
                      {ms.milestoneCategory ?? "Milestone"} · {prettyDate(ms.date)}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePinMilestone(ms.id)}
                      className="hover:opacity-100"
                    >
                      {ms.pinned ? "📌 Pinned" : "Pin"}
                    </button>
                  </div>

                  <h3 className="mt-2 font-display text-[22px] text-wine">{ms.title}</h3>
                  {ms.text && (
                    <p className="mt-1.5 font-body text-[19.5px] leading-relaxed text-wine opacity-85">
                      {ms.text}
                    </p>
                  )}

                  {photo && (
                    <button
                      type="button"
                      onClick={() => onOpenMedia(ms)}
                      className="mt-3 block w-full overflow-hidden rounded-lg border border-wine/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt={ms.title}
                        className="h-44 w-full object-cover"
                      />
                    </button>
                  )}
                </div>

                {ms.linkedIds.length > 0 && (
                  <div className="mt-3 pt-2">
                    {ms.linkedIds.map((lid) => {
                      const target = entries.find((x) => x.id === lid);
                      if (!target) return null;
                      return (
                        <button
                          key={lid}
                          type="button"
                          onClick={() => onOpenLinked(lid)}
                          className="font-ui text-[14px] underline text-wine opacity-70 hover:opacity-100"
                        >
                          Linked: {target.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  SIMPLE SHARED PILL + LIGHTBOX & LOCK MODALS                       */
/* ================================================================== */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill border px-3.5 py-1 font-ui text-[14.5px] transition-colors ${
        active
          ? "border-wine bg-wine text-marble"
          : "border-wine/40 bg-marble text-wine hover:border-wine"
      }`}
    >
      {children}
    </button>
  );
}

function LightboxModal({
  entry,
  allEntries,
  onClose,
  onSelectLinked,
}: {
  entry: MemoryEntry;
  allEntries: MemoryEntry[];
  onClose: () => void;
  onSelectLinked: (e: MemoryEntry) => void;
}) {
  const media = entry.media ?? entry.mediaAttachments?.[0];
  const linked = entry.linkedIds
    .map((id) => allEntries.find((x) => x.id === id))
    .filter((x): x is MemoryEntry => Boolean(x));

  const details = [
    prettyDate(entry.date),
    entry.time,
    entry.section ?? "",
    entry.location ?? "",
    entry.peopleTags.length ? `with ${entry.peopleTags.join(", ")}` : "",
  ].filter(Boolean);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[980] grid place-items-center bg-wine/85 p-4 backdrop-blur-sm anim-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-marble bg-marble p-5 text-wine sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-[24px] text-wine">{entry.title}</h3>
            <p className="mt-0.5 font-ui text-[14.5px] text-wine opacity-65">
              {details.join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-ui text-[20px] text-wine opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>

        {media && (
          <div className="mt-4 overflow-hidden rounded-xl bg-wine">
            {media.mediaType === "video" ? (
              <video
                src={media.src}
                poster={media.poster}
                controls
                autoPlay
                playsInline
                className="max-h-[52svh] w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.src}
                alt={entry.title}
                className="max-h-[52svh] w-full object-contain"
              />
            )}
          </div>
        )}

        {entry.text && (
          <p className="mt-4 whitespace-pre-wrap font-body text-[20px] leading-relaxed text-wine">
            {entry.text}
          </p>
        )}

        {linked.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-wine/15 pt-3">
            {linked.map((le) => (
              <button
                key={le.id}
                type="button"
                onClick={() => onSelectLinked(le)}
                className="font-ui text-[14.5px] underline text-wine"
              >
                Open linked: {le.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LockSetupModal({
  pinHash,
  biometricCredentialId,
  onClose,
}: {
  pinHash: string | null;
  biometricCredentialId: string | null;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const savePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) {
      setMsg("Please enter a 4 to 6 digit PIN.");
      return;
    }
    setMemories((prev) => ({
      lock: { ...prev.lock, pinHash: hashPin(pin), locked: true },
    }));
    onClose();
  };

  const setupBio = async () => {
    const res = await registerBiometricLock();
    if (!res.ok || !res.credentialId) {
      setMsg(res.error ?? "Biometrics not available.");
      return;
    }
    setMemories((prev) => ({
      lock: { ...prev.lock, biometricCredentialId: res.credentialId!, locked: true },
    }));
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[980] grid place-items-center bg-wine/80 p-4 backdrop-blur-sm anim-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border-2 border-marble bg-marble p-6 text-wine"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[23px] text-wine">Lock Memories</h3>
          <button type="button" onClick={onClose} className="font-ui text-[18px]">
            ✕
          </button>
        </div>

        <p className="mt-1.5 font-body text-[19px] text-wine opacity-75">
          Set a PIN or use device biometrics.
        </p>

        <form onSubmit={savePin} className="mt-4 space-y-2.5">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="4–6 digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="field py-2.5 text-center tracking-[0.35em]"
          />
          <button
            type="submit"
            className="w-full rounded-pill bg-wine py-2.5 font-ui text-[15.5px] text-marble"
          >
            Save PIN & Lock
          </button>
        </form>

        <button
          type="button"
          onClick={() => void setupBio()}
          className="mt-2.5 w-full rounded-pill border border-wine py-2 font-ui text-[15px] text-wine"
        >
          {biometricCredentialId ? "Update Biometrics" : "Use Biometrics"}
        </button>

        {(pinHash || biometricCredentialId) && (
          <button
            type="button"
            onClick={() => {
              setMemories({ lock: { pinHash: null, biometricCredentialId: null, locked: false } });
              onClose();
            }}
            className="mt-3 w-full font-ui text-[14px] underline text-wine opacity-70"
          >
            Remove lock
          </button>
        )}

        {msg && <p className="mt-3 font-ui text-[14.5px] text-wine">{msg}</p>}
      </div>
    </div>
  );
}

function LockScreen({
  pinHash,
  biometricCredentialId,
  onUnlock,
  onBack,
}: {
  pinHash: string | null;
  biometricCredentialId: string | null;
  onUnlock: () => void;
  onBack: () => void;
}) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const tryPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinHash && hashPin(pin) === pinHash) {
      onUnlock();
      return;
    }
    setErr("Wrong PIN. Try again.");
    setPin("");
  };

  const tryBio = async () => {
    if (!biometricCredentialId) return;
    const ok = await verifyBiometricLock(biometricCredentialId);
    if (ok) onUnlock();
    else setErr("Biometric check cancelled.");
  };

  return (
    <main className="grid min-h-[100svh] w-screen place-items-center bg-wine px-6 text-marble">
      <div className="w-full max-w-sm rounded-2xl border border-marble/40 bg-wineDeep p-7 text-center">
        <div className="mx-auto flex justify-center">
          <MemorySphere glyph="memories" size={84} tone="wine" />
        </div>
        <h1 className="mt-4 font-display text-[28px] text-marble">Memories Locked</h1>

        {pinHash && (
          <form onSubmit={tryPin} className="mt-5 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => {
                setErr(null);
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="Enter PIN"
              className="w-full rounded-xl border border-marble/50 bg-wine px-4 py-2.5 text-center font-ui text-[22px] tracking-[0.3em] text-marble outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-pill bg-marble py-2.5 font-ui text-[16px] text-wine"
            >
              Unlock
            </button>
          </form>
        )}

        {biometricCredentialId && (
          <button
            type="button"
            onClick={() => void tryBio()}
            className="mt-2.5 w-full rounded-pill border border-marble/60 py-2.5 font-ui text-[15.5px] text-marble"
          >
            Use Biometrics
          </button>
        )}

        {err && <p className="mt-3 font-ui text-[15px] text-marble opacity-85">{err}</p>}

        <button
          type="button"
          onClick={onBack}
          className="mt-5 font-ui text-[14.5px] text-marble opacity-65 hover:opacity-100"
        >
          ← Back
        </button>
      </div>
    </main>
  );
}
