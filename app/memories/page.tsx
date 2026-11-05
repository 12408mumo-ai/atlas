"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MemorySphere, type SphereGlyph } from "@/components/MemorySphere";
import { Badge, Empty, Panel } from "@/components/ui";
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
/*  Branch Definitions (the 5 Spheres inside Memories)                */
/* ------------------------------------------------------------------ */

type BranchMeta = {
  key: MemoryBranchKey;
  name: string;
  greek: string;
  glyph: SphereGlyph;
  blurb: string;
  phase: number;
};

const BRANCHES: BranchMeta[] = [
  {
    key: "timeline",
    name: "Timeline",
    greek: "Χρόνος",
    glyph: "timeline",
    blurb: "Newest first · On this day, Atlas daily summaries, cards & auto-logs.",
    phase: 0.2,
  },
  {
    key: "gallery",
    name: "Gallery",
    greek: "Εἰκόνες",
    glyph: "gallery",
    blurb: "Photos & videos grouped by month, albums & media filters.",
    phase: 1.4,
  },
  {
    key: "calendar",
    name: "Calendar",
    greek: "Ἡμερολόγιον",
    glyph: "calendar",
    blurb: "Month view marked by daily activity — tap any day to jump to Timeline.",
    phase: 2.6,
  },
  {
    key: "journal",
    name: "Journal",
    greek: "Γραφή",
    glyph: "journal",
    blurb: "Daily writing, voice notes, reflections, ideas & starred highlights.",
    phase: 3.8,
  },
  {
    key: "milestones",
    name: "Milestones",
    greek: "Σταθμοί",
    glyph: "milestones",
    blurb: "Achievements, launches, graduations, trips & firsts with linked photos.",
    phase: 5.0,
  },
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
/*  Main Page Component                                               */
/* ------------------------------------------------------------------ */

export default function MemoriesPage() {
  const router = useRouter();
  const atlas = useAtlas();
  const mem = useMemories();

  // Spatial navigation state
  const [globeDocked, setGlobeDocked] = useState(false);
  const [activeBranch, setActiveBranch] = useState<MemoryBranchKey | null>(null);
  const [jumpDate, setJumpDate] = useState<string | null>(null);

  // Search, Quick Atlas Log, Lock, Export & Lightbox
  const [searchQuery, setSearchQuery] = useState("");
  const [quickLogInput, setQuickLogInput] = useState("");
  const [quickLogFeedback, setQuickLogFeedback] = useState<string | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [lightboxEntry, setLightboxEntry] = useState<MemoryEntry | null>(null);

  // Animate the Memories Globe from center -> left on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setGlobeDocked(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Count badges per branch sphere
  const branchCounts = useMemo(() => {
    const mediaCount = mem.entries.filter(
      (e) => e.kind === "media" || (e.mediaAttachments && e.mediaAttachments.length > 0)
    ).length;
    const daysCount = new Set(mem.entries.map((e) => e.date)).size;
    const journalCount = mem.entries.filter((e) => e.kind === "journal" || e.starred).length;
    const milestoneCount = mem.entries.filter((e) => e.kind === "milestone").length;
    return {
      timeline: `${mem.entries.length}`,
      gallery: `${mediaCount}`,
      calendar: `${daysCount}d`,
      journal: `${journalCount}`,
      milestones: `${milestoneCount}`,
    } as Record<MemoryBranchKey, string>;
  }, [mem.entries]);

  // Plain-language search results
  const searchResult = useMemo(
    () => searchMemoriesNaturalLanguage(searchQuery, mem.entries, atlas),
    [searchQuery, mem.entries, atlas]
  );

  const handleMemoriesGlobePress = () => {
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
    setQuickLogFeedback(`Logged to Timeline · Filed under ${res.filedUnder.join(" & ")}`);
    window.setTimeout(() => setQuickLogFeedback(null), 4500);
  };

  const openLinkedItem = (targetId: string) => {
    const found = mem.entries.find((x) => x.id === targetId);
    if (!found) return;
    setLightboxEntry(found);
  };

  /* ---- Vault Lock Curtain ---- */
  if (mem.lock.locked) {
    return (
      <VaultLockScreen
        pinHash={mem.lock.pinHash}
        biometricCredentialId={mem.lock.biometricCredentialId}
        onUnlock={() => setMemories((prev) => ({ lock: { ...prev.lock, locked: false } }))}
        onBack={() => router.push("/hub")}
      />
    );
  }

  return (
    <div className="relative min-h-[100svh] w-screen overflow-x-hidden bg-marble text-wine">
      {/* ================================================================ */}
      {/* 1. LEFT-GLIDING MEMORIES GLOBE (Center -> Left, Press to go back)*/}
      {/* ================================================================ */}
      <div
        style={{
          transition:
            "left 780ms cubic-bezier(0.22, 1, 0.36, 1), top 780ms cubic-bezier(0.22, 1, 0.36, 1), transform 780ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={
          globeDocked
            ? "fixed left-[38px] top-[92px] z-50 -translate-x-1/2 -translate-y-1/2 scale-100 sm:left-[54px] sm:top-[106px]"
            : "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 scale-[1.5]"
        }
      >
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handleMemoriesGlobePress}
            title={activeBranch ? "Back to Memories spheres" : "Back to Atlas World"}
            aria-label={activeBranch ? "Back to Memories branch spheres" : "Back to Atlas World"}
            className="group cursor-pointer rounded-full transition-transform duration-200 hover:scale-105 focus-visible:ring-4 focus-visible:ring-wine"
          >
            <div className="hidden sm:block">
              <MemorySphere glyph="memories" size={82} tone="wine" speed={0.55} />
            </div>
            <div className="sm:hidden">
              <MemorySphere glyph="memories" size={62} tone="wine" speed={0.55} />
            </div>
          </button>

          <button
            type="button"
            onClick={handleMemoriesGlobePress}
            className="mt-1.5 rounded-pill border-2 border-wine bg-wine px-2.5 py-0.5 font-ui text-[13px] uppercase tracking-[0.14em] text-marble transition-colors hover:bg-marble hover:text-wine sm:text-[14px]"
          >
            {activeBranch ? "← Spheres" : "← Back"}
          </button>

          {activeBranch && (
            <button
              type="button"
              onClick={() => router.push("/hub")}
              className="mt-1 font-ui text-[12.5px] uppercase tracking-[0.14em] text-wine opacity-65 hover:opacity-100"
            >
              ← World
            </button>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. RIGHT SCROLLABLE BRANCH SPHERE RAIL (other branches on right) */}
      {/* ================================================================ */}
      <aside
        aria-label="Other Memories branch spheres"
        style={{
          transition:
            "transform 680ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms ease",
        }}
        className={
          activeBranch !== null
            ? "fixed right-1.5 top-1/2 z-40 max-h-[78svh] w-[82px] -translate-y-1/2 translate-x-0 overflow-y-auto rounded-2xl border-2 border-wine bg-marble/95 px-1.5 py-3.5 opacity-100 shadow-lg backdrop-blur-sm sm:right-4 sm:w-[114px] sm:px-2.5 sm:py-4"
            : "pointer-events-none fixed right-4 top-1/2 z-40 max-h-[78svh] w-[114px] -translate-y-1/2 translate-x-40 opacity-0"
        }
      >
        <p className="mb-2.5 text-center font-ui text-[11.5px] uppercase tracking-[0.16em] text-wine opacity-65 sm:text-[13px]">
          Branches
        </p>
        <div className="flex flex-col items-center gap-4">
          {BRANCHES.filter((b) => b.key !== activeBranch).map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                if (b.key !== "timeline") setJumpDate(null);
                setActiveBranch(b.key);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="group relative flex w-full cursor-pointer flex-col items-center rounded-xl p-1 transition-transform duration-200 hover:scale-105"
            >
              <span className="absolute right-1 top-0.5 z-10 rounded-pill border border-marble bg-wine px-1.5 py-0 font-ui text-[10.5px] text-marble sm:text-[11.5px]">
                {branchCounts[b.key]}
              </span>
              <div className="hidden sm:block">
                <MemorySphere
                  glyph={b.glyph}
                  size={74}
                  tone="wine"
                  phaseOffset={b.phase}
                />
              </div>
              <div className="sm:hidden">
                <MemorySphere
                  glyph={b.glyph}
                  size={54}
                  tone="wine"
                  phaseOffset={b.phase}
                />
              </div>
              <span className="mt-1.5 w-full truncate rounded-pill border border-wine bg-marble px-1.5 py-0.5 text-center font-ui text-[11.5px] uppercase tracking-[0.1em] text-wine transition-colors group-hover:bg-wine group-hover:text-marble sm:text-[13px]">
                {b.name}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* ================================================================ */}
      {/* 3. CENTER MAIN WORKSPACE                                         */}
      {/* ================================================================ */}
      <main
        className={`mx-auto max-w-[1280px] pb-28 pl-20 pt-7 transition-all duration-500 sm:pl-32 sm:pt-9 ${
          activeBranch !== null ? "pr-[92px] sm:pr-[142px]" : "pr-5 sm:pr-10"
        }`}
      >
        {/* ---- Clean Page Title + Extras Bar (Lock & Export) ---- */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3.5">
            {activeBranch && (
              <div className="shrink-0">
                <MemorySphere
                  glyph={BRANCHES.find((b) => b.key === activeBranch)?.glyph ?? "timeline"}
                  size={54}
                  active
                  tone="wine"
                />
              </div>
            )}
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-[clamp(32px,4.8vw,54px)] leading-[1.05] tracking-[0.06em] text-wine">
                {activeBranch
                  ? BRANCHES.find((b) => b.key === activeBranch)?.name ?? "Memories"
                  : "Memories"}
              </h1>
              {activeBranch && (
                <span className="font-ui text-[16px] uppercase tracking-[0.2em] text-wine opacity-60">
                  · Memories
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (mem.lock.pinHash || mem.lock.biometricCredentialId) {
                  setMemories((prev) => ({ lock: { ...prev.lock, locked: true } }));
                } else {
                  setShowLockModal(true);
                }
              }}
              className="rounded-pill border-2 border-wine bg-marble px-4 py-2 font-ui text-[16px] uppercase tracking-[0.14em] text-wine transition-colors hover:bg-wine hover:text-marble"
            >
              {mem.lock.pinHash || mem.lock.biometricCredentialId ? "🔒 Lock" : "🔒 Set Lock"}
            </button>

            {(mem.lock.pinHash || mem.lock.biometricCredentialId) && (
              <button
                type="button"
                onClick={() => setShowLockModal(true)}
                aria-label="Lock settings"
                className="rounded-pill border-2 border-wine/60 bg-marble px-3 py-2 font-ui text-[15px] uppercase tracking-[0.12em] text-wine hover:bg-marbleDim"
              >
                PIN / Bio
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className="rounded-pill border-2 border-wine bg-wine px-4 py-2 font-ui text-[16px] uppercase tracking-[0.14em] text-marble transition-colors hover:bg-marble hover:text-wine"
              >
                ⬇ Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border-2 border-wine bg-marble p-2.5 shadow-xl anim-fade">
                  <p className="px-3 py-1.5 font-ui text-[15px] uppercase tracking-[0.18em] text-wine opacity-65">
                    Export whole timeline
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      exportMemoriesArchive("markdown", mem);
                      setShowExportMenu(false);
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2.5 text-left font-ui text-[16.5px] uppercase tracking-[0.12em] text-wine hover:bg-wine hover:text-marble"
                  >
                    Markdown Chronicle (.md)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportMemoriesArchive("json", mem);
                      setShowExportMenu(false);
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2.5 text-left font-ui text-[16.5px] uppercase tracking-[0.12em] text-wine hover:bg-wine hover:text-marble"
                  >
                    Full JSON Archive (.json)
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ---- Plain-Language Search + Quick "Log to Atlas" Bar ---- */}
        <div className="mt-6 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
          {/* Plain-language search */}
          <div className="relative flex items-center rounded-pill border-2 border-wine bg-marble px-4 py-1.5">
            <span className="mr-2.5 font-ui text-[18px] text-wine opacity-65">⌕</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in plain language — e.g. “when did I last see my cousin?”"
              className="w-full bg-transparent py-1.5 font-ui text-[18px] text-wine outline-none placeholder:text-wine/45"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="ml-2 rounded-full px-2 font-ui text-[17px] text-wine opacity-65 hover:opacity-100"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Log to Atlas */}
          <form
            onSubmit={handleQuickLogSubmit}
            className="flex items-center gap-2 rounded-pill border-2 border-wine bg-marbleDim/65 px-4 py-1.5"
          >
            <input
              type="text"
              value={quickLogInput}
              onChange={(e) => setQuickLogInput(e.target.value)}
              placeholder="Log to Atlas — “spent 800 on lunch with Sam”"
              className="w-full bg-transparent py-1.5 font-ui text-[18px] text-wine outline-none placeholder:text-wine/50"
            />
            <button
              type="submit"
              className="shrink-0 rounded-pill border-2 border-wine bg-wine px-4 py-1.5 font-ui text-[15.5px] uppercase tracking-[0.14em] text-marble transition-colors hover:bg-marble hover:text-wine"
            >
              Log
            </button>
          </form>
        </div>

        {quickLogFeedback && (
          <div className="mt-3 rounded-xl border-2 border-wine bg-wine px-4 py-2.5 font-ui text-[16.5px] uppercase tracking-[0.14em] text-marble anim-fade">
            ✓ {quickLogFeedback}
          </div>
        )}

        {/* ---- Conversational Plain-Language Search Overlay / Results ---- */}
        {searchQuery.trim() !== "" && (
          <section className="mt-5 rounded-2xl border-2 border-wine bg-marbleDim/55 p-5 anim-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-ui text-[16.5px] uppercase tracking-[0.18em] text-wine opacity-75">
                Atlas Memory Search · {searchResult.results.length} match
                {searchResult.results.length === 1 ? "" : "es"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "When did I last see my cousin?",
                  "Kilifi photos",
                  "Starred highlights",
                  "Voice notes",
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setSearchQuery(sample)}
                    className="rounded-pill border border-wine/50 bg-marble px-3 py-0.5 font-ui text-[14px] text-wine hover:bg-wine hover:text-marble"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {searchResult.answer && (
              <div className="mt-3 rounded-xl border-2 border-wine bg-wine px-4 py-3 text-marble">
                <p className="font-ui text-[14.5px] uppercase tracking-[0.2em] text-marble opacity-75">
                  Atlas Answer
                </p>
                <p className="mt-1 font-body text-[21px] leading-snug text-marble">
                  {searchResult.answer}
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {searchResult.results.length === 0 ? (
                <Empty>No memories match “{searchQuery}”.</Empty>
              ) : (
                searchResult.results.slice(0, 10).map((entry) => (
                  <TimelineEntryItem
                    key={entry.id}
                    entry={entry}
                    allEntries={mem.entries}
                    onOpenMedia={setLightboxEntry}
                    onOpenLinked={openLinkedItem}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE A: THE 5 BRANCHES IN SPHERE FORM (when no branch chosen) */}
        {/* ============================================================== */}
        {activeBranch === null && (
          <section className="mt-8 anim-fade-up">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-ui text-[16.5px] uppercase tracking-[0.22em] text-wine opacity-70">
                Choose a sphere to open its branch
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["When did I last see my cousin?", "Starred highlights"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSearchQuery(q)}
                    className="rounded-pill border border-wine/55 bg-marble px-3 py-1 font-ui text-[14.5px] text-wine transition-colors hover:bg-wine hover:text-marble"
                  >
                    Ask: “{q}”
                  </button>
                ))}
              </div>
            </div>

            {/* 5 Spinning Classical Branch Spheres Constellation */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BRANCHES.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setActiveBranch(b.key)}
                  className="group relative flex cursor-pointer flex-col items-center rounded-2xl border-2 border-wine bg-marble p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:bg-marbleDim/65"
                >
                  {/* Entry count badge */}
                  <span className="absolute right-4 top-4 rounded-pill border-2 border-wine bg-wine px-3 py-0.5 font-ui text-[14.5px] uppercase tracking-[0.14em] text-marble">
                    {branchCounts[b.key]}
                  </span>

                  <div className="transition-transform duration-300 group-hover:scale-105">
                    <MemorySphere
                      glyph={b.glyph}
                      size={138}
                      tone="wine"
                      speed={0.54}
                      phaseOffset={b.phase}
                    />
                  </div>

                  <p className="mt-4 font-ui text-[15.5px] uppercase tracking-[0.24em] text-wine opacity-65">
                    {b.greek}
                  </p>
                  <h2 className="mt-1 font-display text-[30px] tracking-[0.08em] text-wine">
                    {b.name}
                  </h2>
                  <p className="mt-2 max-w-[290px] font-body text-[19.5px] italic leading-snug text-wine opacity-80">
                    {b.blurb}
                  </p>
                  <span className="mt-4 inline-block rounded-pill border-2 border-wine px-4 py-1 font-ui text-[15px] uppercase tracking-[0.16em] text-wine transition-colors group-hover:bg-wine group-hover:text-marble">
                    Open sphere →
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STAGE B: OPENED BRANCH VIEW                                    */}
        {/* ============================================================== */}
        {activeBranch === "timeline" && (
          <div className="mt-7 anim-fade-up">
            <TimelineBranch
              entries={mem.entries}
              customSummaries={mem.customSummaries}
              jumpDate={jumpDate}
              onClearJumpDate={() => setJumpDate(null)}
              onOpenMedia={setLightboxEntry}
              onOpenLinked={openLinkedItem}
              onJumpToJournal={() => setActiveBranch("journal")}
              onJumpToGallery={() => setActiveBranch("gallery")}
            />
          </div>
        )}

        {activeBranch === "gallery" && (
          <div className="mt-7 anim-fade-up">
            <GalleryBranch
              entries={mem.entries}
              albums={mem.albums}
              peopleNames={atlas.people.map((p) => p.name)}
              onOpenLightbox={setLightboxEntry}
            />
          </div>
        )}

        {activeBranch === "calendar" && (
          <div className="mt-7 anim-fade-up">
            <CalendarBranch
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
          <div className="mt-7 anim-fade-up">
            <JournalBranch
              entries={mem.entries}
              peopleNames={atlas.people.map((p) => p.name)}
              onOpenMedia={setLightboxEntry}
              onOpenLinked={openLinkedItem}
            />
          </div>
        )}

        {activeBranch === "milestones" && (
          <div className="mt-7 anim-fade-up">
            <MilestonesBranch
              entries={mem.entries}
              peopleNames={atlas.people.map((p) => p.name)}
              onOpenMedia={setLightboxEntry}
              onOpenLinked={openLinkedItem}
            />
          </div>
        )}
      </main>

      {/* ================================================================ */}
      {/* 4. MEDIA / ENTRY LIGHTBOX MODAL                                  */}
      {/* ================================================================ */}
      {lightboxEntry && (
        <EntryLightboxModal
          entry={lightboxEntry}
          allEntries={mem.entries}
          onClose={() => setLightboxEntry(null)}
          onSelectLinked={(e) => setLightboxEntry(e)}
        />
      )}

      {/* ================================================================ */}
      {/* 5. BIOMETRIC / PIN LOCK CONFIGURATION MODAL                      */}
      {/* ================================================================ */}
      {showLockModal && (
        <LockConfigModal
          pinHash={mem.lock.pinHash}
          biometricCredentialId={mem.lock.biometricCredentialId}
          onClose={() => setShowLockModal(false)}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  BRANCH 1: TIMELINE (Newest first, On This Day, Atlas Summary)     */
/* ================================================================== */

function TimelineBranch({
  entries,
  customSummaries,
  jumpDate,
  onClearJumpDate,
  onOpenMedia,
  onOpenLinked,
  onJumpToJournal,
  onJumpToGallery,
}: {
  entries: MemoryEntry[];
  customSummaries: Record<string, string>;
  jumpDate: string | null;
  onClearJumpDate: () => void;
  onOpenMedia: (e: MemoryEntry) => void;
  onOpenLinked: (id: string) => void;
  onJumpToJournal: () => void;
  onJumpToGallery: () => void;
}) {
  const [sectionFilter, setSectionFilter] = useState<SectionTag | "All">("All");
  const [starredOnly, setStarredOnly] = useState(false);
  const [editingSummaryDate, setEditingSummaryDate] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");

  const today = todayISO();
  const todayMonthDay = today.slice(5); // MM-DD

  // "On this day" look-backs from prior years
  const onThisDayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.slice(5) === todayMonthDay && e.date.slice(0, 4) !== today.slice(0, 4))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, today, todayMonthDay]
  );

  // Filtered & sorted newest-first
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

  const groupedByDay = useMemo(() => {
    const map = new Map<string, MemoryEntry[]>();
    for (const e of filtered) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-7">
      {/* Quick actions + section filter strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["All", ...SECTIONS] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSectionFilter(sec)}
              className={`rounded-pill border-2 border-wine px-3.5 py-1.5 font-ui text-[15.5px] uppercase tracking-[0.14em] transition-colors ${
                sectionFilter === sec ? "bg-wine text-marble" : "bg-marble text-wine hover:bg-marbleDim"
              }`}
            >
              {sec}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStarredOnly((v) => !v)}
            className={`rounded-pill border-2 border-wine px-3.5 py-1.5 font-ui text-[15.5px] uppercase tracking-[0.14em] transition-colors ${
              starredOnly ? "bg-wine text-marble" : "bg-marble text-wine hover:bg-marbleDim"
            }`}
          >
            ★ Highlights
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onJumpToJournal} className="btn-ghost btn-sm">
            ✎ Write / Speak
          </button>
          <button type="button" onClick={onJumpToGallery} className="btn-wine btn-sm">
            ▣ Upload Media
          </button>
        </div>
      </div>

      {/* Active Calendar Jump Banner */}
      {jumpDate && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-wine bg-wine px-5 py-3.5 text-marble">
          <p className="font-ui text-[17px] uppercase tracking-[0.16em]">
            Jumped to {prettyDate(jumpDate)} ({filtered.length} {filtered.length === 1 ? "memory" : "memories"})
          </p>
          <button
            type="button"
            onClick={onClearJumpDate}
            className="rounded-pill border-2 border-marble px-4 py-1 font-ui text-[15px] uppercase tracking-[0.14em] text-marble hover:bg-marble hover:text-wine"
          >
            Show all days ×
          </button>
        </div>
      )}

      {/* 1. "ON THIS DAY" LOOK-BACKS AT THE TOP */}
      {!jumpDate && onThisDayEntries.length > 0 && (
        <section className="rounded-2xl border-2 border-wine bg-wine p-5 text-marble sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-ui text-[15.5px] uppercase tracking-[0.24em] text-marble opacity-75">
                On this day · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long" })}
              </p>
              <h2 className="mt-1 font-display text-[26px] tracking-[0.06em] text-marble">
                Look-backs across the years
              </h2>
            </div>
            <span className="rounded-pill border border-marble/60 px-3 py-0.5 font-ui text-[14.5px] uppercase tracking-[0.14em] text-marble">
              {onThisDayEntries.length} kept
            </span>
          </div>

          <div className="mt-4 grid gap-3.5 md:grid-cols-2">
            {onThisDayEntries.map((item) => {
              const yrsAgo = Number(today.slice(0, 4)) - Number(item.date.slice(0, 4));
              const previewImg = item.media?.src ?? item.mediaAttachments?.[0]?.src;
              return (
                <div
                  key={item.id}
                  onClick={() => onOpenMedia(item)}
                  className="group flex cursor-pointer gap-4 rounded-xl border-2 border-marble/75 bg-wineDeep p-4 transition-colors hover:bg-marble hover:text-wine"
                >
                  {previewImg && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImg}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-lg border border-marble/50 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-ui text-[14.5px] uppercase tracking-[0.18em] opacity-80">
                      {yrsAgo} {yrsAgo === 1 ? "year" : "years"} ago · {item.date.slice(0, 4)}
                    </p>
                    <p className="mt-1 truncate font-display text-[21px]">{item.title}</p>
                    <p className="mt-1 line-clamp-2 font-body text-[18.5px] opacity-85">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. CHRONOLOGICAL DAY GROUPS (Newest first) */}
      {groupedByDay.length === 0 ? (
        <Panel title="Timeline">
          <Empty>No memories on this filter yet.</Empty>
        </Panel>
      ) : (
        <div className="space-y-8">
          {groupedByDay.map(([date, dayEntries]) => {
            const mood = averageDayMood(dayEntries);
            const summary = generateAtlasDailySummary(date, dayEntries, customSummaries);
            const isToday = date === today;

            return (
              <section key={date} className="relative">
                {/* Day Header with Mood Dot + One-Line Atlas Daily Summary */}
                <div className="rounded-2xl border-2 border-wine bg-marbleDim/75 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Mood Dot */}
                    <span
                      title={`Day mood: ${mood}/5`}
                      className="flex items-center gap-2 rounded-pill border-2 border-wine bg-wine px-3 py-0.5 text-marble"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-marble" />
                      <span className="font-ui text-[14.5px] uppercase tracking-[0.14em]">
                        Mood {mood}/5
                      </span>
                    </span>

                    <h3 className="font-display text-[24px] tracking-[0.05em] text-wine">
                      {prettyDate(date)}
                      {isToday ? " · Today" : ""}
                    </h3>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSummaryDate(editingSummaryDate === date ? null : date);
                        setSummaryDraft(summary);
                      }}
                      className="ml-auto font-ui text-[14px] uppercase tracking-[0.14em] text-wine opacity-60 hover:opacity-100"
                    >
                      ✎ Atlas recap
                    </button>
                  </div>

                  {editingSummaryDate === date ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        className="field flex-1 py-2 text-[18px]"
                        value={summaryDraft}
                        onChange={(e) => setSummaryDraft(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDailySummary(date, summaryDraft);
                          setEditingSummaryDate(null);
                        }}
                        className="btn-wine btn-sm"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 font-body text-[20px] italic text-wine opacity-85">
                      <span className="not-italic font-ui text-[14.5px] uppercase tracking-[0.18em] opacity-70">
                        Atlas summary:{" "}
                      </span>
                      {summary}
                    </p>
                  )}
                </div>

                {/* Day Entries: Big Cards for written/recorded/media/milestone, Small Rows for auto-logs */}
                <div className="relative mt-4 space-y-3.5 pl-6 sm:pl-8">
                  <span className="absolute bottom-2 left-2.5 top-2 w-[2px] bg-wine/40 sm:left-3.5" />
                  {dayEntries.map((entry) => (
                    <TimelineEntryItem
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

function TimelineEntryItem({
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
  const linkedEntries = entry.linkedIds
    .map((id) => allEntries.find((x) => x.id === id))
    .filter((x): x is MemoryEntry => Boolean(x));

  /* ---- SMALL COMPACT ROW FOR AUTO-LOGGED ENTRIES ---- */
  if (entry.kind === "autolog") {
    return (
      <div className="relative flex flex-wrap items-center gap-3 rounded-xl border-2 border-wine/55 bg-marble px-4 py-2.5 transition-colors hover:bg-marbleDim/40">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-wine" />
        <span className="font-ui text-[15px] tabular-nums tracking-[0.1em] text-wine opacity-65">
          {entry.time}
        </span>
        {entry.section && <Badge tone="dim">{entry.section}</Badge>}
        <p className="min-w-0 flex-1 font-body text-[19.5px] text-wine">{entry.title}</p>
        {entry.peopleTags.map((person) => (
          <span
            key={person}
            className="rounded-pill border border-wine/50 px-2.5 py-0.5 font-ui text-[14px] text-wine"
          >
            @{person}
          </span>
        ))}
        <button
          type="button"
          onClick={() => toggleStarMemory(entry.id)}
          aria-label="Toggle highlight star"
          className={`font-display text-[20px] leading-none ${
            entry.starred ? "text-wine" : "text-wine opacity-30 hover:opacity-80"
          }`}
        >
          {entry.starred ? "★" : "☆"}
        </button>
      </div>
    );
  }

  /* ---- BIG CARD FOR WRITTEN / VOICE / MEDIA / MILESTONE ENTRIES ---- */
  const photos: MediaItem[] = [
    ...(entry.media ? [entry.media] : []),
    ...(entry.mediaAttachments ?? []),
  ];

  return (
    <article className="relative rounded-2xl border-2 border-wine bg-marble p-5 transition-colors hover:bg-marbleDim/30 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-ui text-[15.5px] tabular-nums uppercase tracking-[0.14em] text-wine opacity-70">
          {entry.time} · {prettyDate(entry.date)}
        </span>
        <Badge tone={entry.kind === "milestone" ? "wine" : "gold"}>
          {entry.kind === "milestone"
            ? `★ Milestone · ${entry.milestoneCategory ?? "Moment"}`
            : entry.kind === "media"
              ? entry.media?.mediaType === "video"
                ? "▶ Video"
                : "▣ Photo"
              : entry.voice
                ? "◎ Voice Journal"
                : `✎ Journal · ${entry.journalSubtype ?? "daily"}`}
        </Badge>
        {entry.section && <Badge tone="marble">{entry.section}</Badge>}
        {typeof entry.mood === "number" && (
          <span className="font-ui text-[15px] uppercase tracking-[0.12em] text-wine opacity-65">
            Mood {entry.mood}/5
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleStarMemory(entry.id)}
          title={entry.starred ? "Starred highlight" : "Star as highlight"}
          className={`ml-auto rounded-pill border-2 px-3 py-0.5 font-ui text-[14.5px] uppercase tracking-[0.12em] transition-colors ${
            entry.starred
              ? "border-wine bg-wine text-marble"
              : "border-wine/40 bg-marble text-wine opacity-70 hover:opacity-100"
          }`}
        >
          {entry.starred ? "★ Highlight" : "☆ Star"}
        </button>
      </div>

      <h4 className="mt-3 font-display text-[25px] leading-snug tracking-[0.03em] text-wine">
        {entry.title}
      </h4>

      {entry.text && (
        <p className="mt-2 whitespace-pre-wrap font-body text-[20.5px] leading-[1.68] text-wine opacity-90">
          {entry.text}
        </p>
      )}

      {/* Voice Note Player */}
      {entry.voice && (
        <div className="mt-4 rounded-xl border-2 border-wine bg-marbleDim p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-ui text-[15.5px] uppercase tracking-[0.16em] text-wine">
              ◎ Voice Recording · {entry.voice.durationSec}s
            </span>
            {entry.voice.audioUrl && (
              <audio controls src={entry.voice.audioUrl} className="h-9 max-w-[260px]" />
            )}
          </div>
          {entry.voice.transcript && (
            <p className="mt-2 font-body text-[19px] italic text-wine opacity-80">
              “{entry.voice.transcript}”
            </p>
          )}
        </div>
      )}

      {/* Attached Photos / Video */}
      {photos.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {photos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpenMedia(entry)}
              className="group relative overflow-hidden rounded-xl border-2 border-wine bg-wine text-left"
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
                    className="h-52 w-full object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-pill border border-marble bg-wine/90 px-3 py-0.5 font-ui text-[14px] uppercase tracking-[0.14em] text-marble">
                    ▶ Video {m.duration ? `· ${m.duration}` : ""}
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.src}
                  alt={entry.title}
                  className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {m.album && (
                <span className="absolute right-3 top-3 rounded-pill border border-marble bg-wine/85 px-2.5 py-0.5 font-ui text-[13px] uppercase tracking-[0.14em] text-marble">
                  {m.album}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Footer Tags: People, Location & Linked Items */}
      {(entry.peopleTags.length > 0 || entry.location || linkedEntries.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-wine/15 pt-3">
          {entry.location && (
            <span className="rounded-pill border border-wine/50 bg-marbleDim/60 px-3 py-0.5 font-ui text-[14.5px] text-wine">
              📍 {entry.location}
            </span>
          )}
          {entry.peopleTags.map((p) => (
            <span
              key={p}
              className="rounded-pill border border-wine bg-marble px-3 py-0.5 font-ui text-[14.5px] text-wine"
            >
              👤 {p}
            </span>
          ))}
          {linkedEntries.map((le) => (
            <button
              key={le.id}
              type="button"
              onClick={() => onOpenLinked(le.id)}
              className="rounded-pill border-2 border-wine bg-wine px-3 py-0.5 font-ui text-[14px] uppercase tracking-[0.1em] text-marble hover:bg-marble hover:text-wine"
            >
              ↔ {le.title.slice(0, 28)}
              {le.title.length > 28 ? "…" : ""}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/* ================================================================== */
/*  BRANCH 2: GALLERY (Month Grid, Albums, Filters: All/Photos/Videos)*/
/* ================================================================== */

function GalleryBranch({
  entries,
  albums,
  peopleNames,
  onOpenLightbox,
}: {
  entries: MemoryEntry[];
  albums: string[];
  peopleNames: string[];
  onOpenLightbox: (e: MemoryEntry) => void;
}) {
  const [mediaFilter, setMediaFilter] = useState<"all" | "photo" | "video">("all");
  const [selectedAlbum, setSelectedAlbum] = useState<string>("All");
  const [showUpload, setShowUpload] = useState(false);

  // Upload form state
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadAlbum, setUploadAlbum] = useState("Trips");
  const [customAlbum, setCustomAlbum] = useState("");
  const [uploadSection, setUploadSection] = useState<SectionTag>("Life");
  const [uploadPeople, setUploadPeople] = useState("");
  const [uploadLocation, setUploadLocation] = useState("");
  const [uploadLinkedId, setUploadLinkedId] = useState("");
  const [uploadPreview, setUploadPreview] = useState<{
    src: string;
    mediaType: "photo" | "video";
  } | null>(null);

  const mediaEntries = useMemo(() => {
    return entries
      .filter((e) => Boolean(e.media))
      .filter((e) => {
        if (mediaFilter !== "all" && e.media?.mediaType !== mediaFilter) return false;
        if (selectedAlbum !== "All" && e.media?.album !== selectedAlbum) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [entries, mediaFilter, selectedAlbum]);

  // Group by YYYY-MM month
  const byMonth = useMemo(() => {
    const map = new Map<string, MemoryEntry[]>();
    for (const e of mediaEntries) {
      const ym = e.date.slice(0, 7);
      const list = map.get(ym) ?? [];
      list.push(e);
      map.set(ym, list);
    }
    return Array.from(map.entries());
  }, [mediaEntries]);

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadPreview({
          src: reader.result,
          mediaType: isVideo ? "video" : "photo",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const submitUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPreview) return;
    const finalAlbum = (uploadAlbum === "__custom__" ? customAlbum.trim() : uploadAlbum) || "Trips";
    const pTags = uploadPeople
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    addMemoryEntry({
      kind: "media",
      title: uploadCaption.trim() || `Uploaded ${uploadPreview.mediaType}`,
      text: uploadCaption.trim(),
      date: todayISO(),
      time: nowHHMM(),
      section: uploadSection,
      peopleTags: pTags,
      mood: 5,
      location: uploadLocation.trim() || undefined,
      linkedIds: uploadLinkedId ? [uploadLinkedId] : [],
      media: {
        id: `med-${Date.now()}`,
        mediaType: uploadPreview.mediaType,
        src: uploadPreview.src,
        album: finalAlbum,
      },
    });

    setUploadCaption("");
    setUploadPeople("");
    setUploadLocation("");
    setUploadLinkedId("");
    setUploadPreview(null);
    setShowUpload(false);
  };

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar (All / Photos / Videos) + Upload Media Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All"],
              ["photo", "Photos"],
              ["video", "Videos"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMediaFilter(k)}
              className={`rounded-pill border-2 border-wine px-4 py-1.5 font-ui text-[16px] uppercase tracking-[0.15em] transition-colors ${
                mediaFilter === k ? "bg-wine text-marble" : "bg-marble text-wine hover:bg-marbleDim"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="btn-wine btn-sm"
        >
          {showUpload ? "Close Upload" : "+ Upload Photo / Video"}
        </button>
      </div>

      {/* Upload Drawer */}
      {showUpload && (
        <Panel
          title="Upload media to Gallery & Timeline"
          hint="Appears in both your Gallery album and chronological Timeline"
        >
          <form onSubmit={submitUpload} className="grid gap-3.5 sm:grid-cols-2">
            <label className="sm:col-span-2 block cursor-pointer rounded-xl border-2 border-dashed border-wine bg-marbleDim/45 p-5 text-center hover:bg-marbleDim">
              <span className="font-ui text-[17px] uppercase tracking-[0.16em] text-wine">
                {uploadPreview
                  ? `Selected ${uploadPreview.mediaType.toUpperCase()} — click to replace`
                  : "Choose Photo or Video file"}
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {uploadPreview && (
              <div className="sm:col-span-2">
                {uploadPreview.mediaType === "video" ? (
                  <video src={uploadPreview.src} controls className="h-48 rounded-xl border-2 border-wine" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadPreview.src}
                    alt="Preview"
                    className="h-48 rounded-xl border-2 border-wine object-cover"
                  />
                )}
              </div>
            )}

            <input
              className="field sm:col-span-2"
              placeholder="Caption — what moment is this?"
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              required
            />

            <select
              className="field"
              value={uploadAlbum}
              onChange={(e) => setUploadAlbum(e.target.value)}
            >
              {albums.map((a) => (
                <option key={a} value={a}>
                  Album: {a}
                </option>
              ))}
              <option value="__custom__">+ New Album…</option>
            </select>

            {uploadAlbum === "__custom__" ? (
              <input
                className="field"
                placeholder="New album name"
                value={customAlbum}
                onChange={(e) => setCustomAlbum(e.target.value)}
              />
            ) : (
              <select
                className="field"
                value={uploadSection}
                onChange={(e) => setUploadSection(e.target.value as SectionTag)}
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    Section: {s}
                  </option>
                ))}
              </select>
            )}

            <input
              className="field"
              placeholder={`Tagged people (e.g. ${peopleNames.slice(0, 2).join(", ")})`}
              value={uploadPeople}
              onChange={(e) => setUploadPeople(e.target.value)}
            />

            <input
              className="field"
              placeholder="Location (optional, e.g. Kilifi Coast)"
              value={uploadLocation}
              onChange={(e) => setUploadLocation(e.target.value)}
            />

            <select
              className="field sm:col-span-2"
              value={uploadLinkedId}
              onChange={(e) => setUploadLinkedId(e.target.value)}
            >
              <option value="">Link to a Journal or Milestone entry (optional)</option>
              {entries
                .filter((x) => x.kind === "journal" || x.kind === "milestone")
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {prettyDate(x.date)} — {x.title}
                  </option>
                ))}
            </select>

            <div className="sm:col-span-2">
              <button type="submit" disabled={!uploadPreview} className="btn-wine">
                Save to Gallery & Timeline
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Albums Strip (Trips, Events, Projects, ...) */}
      <div>
        <p className="mb-2.5 font-ui text-[15.5px] uppercase tracking-[0.2em] text-wine opacity-70">
          Albums
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["All", ...albums].map((alb) => {
            const items = entries.filter(
              (e) => e.media && (alb === "All" || e.media.album === alb)
            );
            const cover = items.find((i) => i.media?.mediaType === "photo")?.media?.src ??
              items[0]?.media?.poster;
            const active = selectedAlbum === alb;
            return (
              <button
                key={alb}
                type="button"
                onClick={() => setSelectedAlbum(alb)}
                className={`flex shrink-0 items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left transition-colors ${
                  active
                    ? "border-wine bg-wine text-marble"
                    : "border-wine bg-marble text-wine hover:bg-marbleDim"
                }`}
              >
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="h-11 w-11 rounded-lg border border-current object-cover"
                  />
                )}
                <div>
                  <p className="font-display text-[20px] leading-tight">
                    {alb === "All" ? "All Albums" : alb}
                  </p>
                  <p className="font-ui text-[13.5px] uppercase tracking-[0.14em] opacity-75">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Month-Grouped Media Grid */}
      {byMonth.length === 0 ? (
        <Panel title="Gallery">
          <Empty>No media in this view yet. Upload a photo or video above.</Empty>
        </Panel>
      ) : (
        <div className="space-y-8">
          {byMonth.map(([ym, list]) => (
            <section key={ym}>
              <div className="mb-3.5 flex items-baseline justify-between border-b-2 border-wine/25 pb-2">
                <h3 className="font-display text-[26px] tracking-[0.05em] text-wine">
                  {formatMonthLabel(ym)}
                </h3>
                <span className="font-ui text-[15px] uppercase tracking-[0.16em] text-wine opacity-65">
                  {list.length} {list.length === 1 ? "memory" : "memories"}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((item) => {
                  const m = item.media!;
                  return (
                    <div
                      key={item.id}
                      className="group overflow-hidden rounded-2xl border-2 border-wine bg-marble transition-transform duration-200 hover:-translate-y-1"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenLightbox(item)}
                        className="relative block h-56 w-full overflow-hidden bg-wine text-left"
                      >
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
                            <span className="absolute bottom-3 left-3 rounded-pill border border-marble bg-wine/90 px-3 py-0.5 font-ui text-[13.5px] uppercase tracking-[0.14em] text-marble">
                              ▶ Video {m.duration ? `· ${m.duration}` : ""}
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
                        <span className="absolute right-3 top-3 rounded-pill border border-marble bg-wine/85 px-2.5 py-0.5 font-ui text-[12.5px] uppercase tracking-[0.14em] text-marble">
                          {m.album}
                        </span>
                      </button>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-[20px] leading-snug text-wine">
                            {item.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleStarMemory(item.id)}
                            className="font-display text-[20px] text-wine"
                            aria-label="Star highlight"
                          >
                            {item.starred ? "★" : "☆"}
                          </button>
                        </div>
                        <p className="mt-1 font-ui text-[14px] uppercase tracking-[0.14em] text-wine opacity-65">
                          {prettyDate(item.date)}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                        {item.peopleTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.peopleTags.map((p) => (
                              <span
                                key={p}
                                className="rounded-pill border border-wine/60 px-2.5 py-0.5 font-ui text-[13px] text-wine"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
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
/*  BRANCH 3: CALENDAR (Month View, Activity Marks, Tap -> Timeline)  */
/* ================================================================== */

function CalendarBranch({
  entries,
  onSelectDate,
}: {
  entries: MemoryEntry[];
  onSelectDate: (iso: string) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(), // 0-indexed
  });

  const entriesByDate = useMemo(() => {
    const map = new Map<string, MemoryEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  // Monday-first offset (0=Mon .. 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthTitle = firstDay.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const today = todayISO();

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <Panel
      title={monthTitle}
      hint="Each day is marked by how much happened — tap any day to jump to it in Timeline"
      action={
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="btn-ghost btn-sm px-3.5">
            ←
          </button>
          <button
            type="button"
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
            className="btn-ghost btn-sm"
          >
            Today
          </button>
          <button type="button" onClick={() => shiftMonth(1)} className="btn-ghost btn-sm px-3.5">
            →
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-2 text-center font-ui text-[15px] uppercase tracking-[0.18em] text-wine opacity-70">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[82px] rounded-xl border border-wine/15 bg-marbleDim/25 sm:min-h-[104px]" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const list = entriesByDate.get(iso) ?? [];
          const count = list.length;
          const isToday = iso === today;
          const hasMilestone = list.some((x) => x.kind === "milestone");

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={`group flex min-h-[82px] flex-col justify-between rounded-xl border-2 p-2 text-left transition-all sm:min-h-[108px] sm:p-3 ${
                count >= 3
                  ? "border-wine bg-wine text-marble hover:opacity-90"
                  : count > 0
                    ? "border-wine bg-marbleDim text-wine hover:bg-wine hover:text-marble"
                    : "border-wine/35 bg-marble text-wine hover:border-wine"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`font-display text-[19px] sm:text-[22px] ${
                    isToday ? "underline decoration-2 underline-offset-4" : ""
                  }`}
                >
                  {dayNum}
                </span>
                {hasMilestone && <span className="text-[15px]">★</span>}
              </div>

              {count > 0 ? (
                <div className="w-full">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, count) }).map((__, dotIdx) => (
                      <span
                        key={dotIdx}
                        className="h-2 w-2 rounded-full bg-current"
                      />
                    ))}
                  </div>
                  <p className="mt-1 hidden truncate font-ui text-[12px] uppercase tracking-[0.1em] opacity-85 sm:block">
                    {count} {count === 1 ? "entry" : "entries"}
                  </p>
                </div>
              ) : (
                <span className="font-ui text-[12px] opacity-30">—</span>
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/* ================================================================== */
/*  BRANCH 4: JOURNAL (Daily entries, Voice, Reflections, Highlights) */
/* ================================================================== */

function JournalBranch({
  entries,
  peopleNames,
  onOpenMedia,
  onOpenLinked,
}: {
  entries: MemoryEntry[];
  peopleNames: string[];
  onOpenMedia: (e: MemoryEntry) => void;
  onOpenLinked: (id: string) => void;
}) {
  const [subFilter, setSubFilter] = useState<"all" | "daily" | "reflections" | "highlights">("all");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [subtype, setSubtype] = useState<JournalSubtype>("daily");
  const [mood, setMood] = useState(4);
  const [section, setSection] = useState<SectionTag>("Life");
  const [peopleInput, setPeopleInput] = useState("");
  const [location, setLocation] = useState("");
  const [starred, setStarred] = useState(false);
  const [photoAttach, setPhotoAttach] = useState<string | null>(null);

  // Voice Note recording state
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [voiceNote, setVoiceNote] = useState<VoiceAttachment | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<SpeechRecLike | null>(null);
  const timerRef = useRef<number | null>(null);
  const startSecRef = useRef(0);

  const startVoiceRecording = async () => {
    setVoiceNote(null);
    setRecSeconds(0);
    startSecRef.current = Date.now();
    setRecording(true);

    timerRef.current = window.setInterval(() => {
      setRecSeconds(Math.max(1, Math.round((Date.now() - startSecRef.current) / 1000)));
    }, 500);

    // Optional live SpeechRecognition transcript
    let heardTranscript = "";
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecLike;
      webkitSpeechRecognition?: new () => SpeechRecLike;
    };
    const SpeechCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (SpeechCtor) {
      try {
        const rec = new SpeechCtor();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (ev) => {
          const parts: string[] = [];
          for (let i = 0; i < ev.results.length; i++) {
            parts.push(ev.results[i]?.[0]?.transcript ?? "");
          }
          heardTranscript = parts.join(" ").trim();
          if (heardTranscript) {
            setText((prev) => (prev ? `${prev} ${heardTranscript}` : heardTranscript));
          }
        };
        rec.onerror = () => undefined;
        speechRef.current = rec;
        rec.start();
      } catch {}
    }

    // Audio blob capture via MediaRecorder if mic available
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
          const dur = Math.max(1, Math.round((Date.now() - startSecRef.current) / 1000));
          const blob = new Blob(chunks, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setVoiceNote({
            durationSec: dur,
            audioUrl: url,
            transcript: heardTranscript || undefined,
          });
        };
        mediaRecRef.current = mr;
        mr.start();
        return;
      } catch {
        // Fallback when sandbox/browser has no physical mic connected
      }
    }
  };

  const stopVoiceRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    speechRef.current?.stop();
    speechRef.current = null;

    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
      mediaRecRef.current = null;
    } else {
      const dur = Math.max(2, Math.round((Date.now() - startSecRef.current) / 1000));
      setVoiceNote({
        durationSec: dur,
        transcript: text.trim() || "Voice reflection recorded.",
      });
    }
    setRecording(false);
  };

  const handlePhotoPick = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoAttach(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !voiceNote) return;

    const pTags = peopleInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    addMemoryEntry({
      kind: "journal",
      journalSubtype: subtype,
      title:
        title.trim() ||
        (subtype === "idea"
          ? "Untitled idea"
          : subtype === "reflection"
            ? "Evening reflection"
            : "Daily entry"),
      text: text.trim(),
      date: todayISO(),
      time: nowHHMM(),
      section,
      peopleTags: pTags,
      mood,
      location: location.trim() || undefined,
      starred,
      linkedIds: [],
      voice: voiceNote ?? undefined,
      mediaAttachments: photoAttach
        ? [
            {
              id: `att-${Date.now()}`,
              mediaType: "photo",
              src: photoAttach,
              album: "Events",
            },
          ]
        : undefined,
    });

    setTitle("");
    setText("");
    setPeopleInput("");
    setLocation("");
    setStarred(false);
    setPhotoAttach(null);
    setVoiceNote(null);
  };

  const filteredJournals = useMemo(() => {
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
      {/* Sub-view filter pills */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All Writing"],
            ["daily", "Daily Entries"],
            ["reflections", "Reflections & Ideas"],
            ["highlights", "★ Starred Highlights"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSubFilter(k)}
            className={`rounded-pill border-2 border-wine px-4 py-1.5 font-ui text-[16px] uppercase tracking-[0.14em] transition-colors ${
              subFilter === k ? "bg-wine text-marble" : "bg-marble text-wine hover:bg-marbleDim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Write or Speak Journal Composer */}
      <Panel
        title="Write or speak a journal entry"
        hint={`${prettyDate(todayISO())} · Text or voice note, mood, tags & optional photo`}
      >
        <form onSubmit={saveJournalEntry} className="space-y-3.5">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["daily", "Daily Entry"],
                ["reflection", "Reflection"],
                ["idea", "Idea"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSubtype(k)}
                className={`rounded-pill border-2 border-wine px-3.5 py-1 font-ui text-[15px] uppercase tracking-[0.14em] ${
                  subtype === k ? "bg-wine text-marble" : "bg-marble text-wine"
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setStarred((v) => !v)}
              className={`ml-auto rounded-pill border-2 border-wine px-3.5 py-1 font-ui text-[15px] uppercase tracking-[0.14em] ${
                starred ? "bg-wine text-marble" : "bg-marble text-wine"
              }`}
            >
              {starred ? "★ Highlighted" : "☆ Star as Highlight"}
            </button>
          </div>

          <input
            className="field"
            placeholder="Title of this entry, reflection or idea"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="field min-h-[150px] resize-y leading-relaxed"
            placeholder="Write freely — or press Record Voice below to speak…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {voiceNote && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-wine bg-marbleDim px-4 py-2.5">
              <span className="font-ui text-[15.5px] uppercase tracking-[0.14em] text-wine">
                ◎ Voice note attached ({voiceNote.durationSec}s)
              </span>
              {voiceNote.audioUrl && (
                <audio controls src={voiceNote.audioUrl} className="h-8 max-w-[240px]" />
              )}
              <button
                type="button"
                onClick={() => setVoiceNote(null)}
                className="font-ui text-[14px] uppercase text-wine opacity-65 hover:opacity-100"
              >
                Remove ×
              </button>
            </div>
          )}

          {photoAttach && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoAttach}
                alt="Attached"
                className="h-20 w-20 rounded-lg border-2 border-wine object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoAttach(null)}
                className="font-ui text-[15px] uppercase text-wine opacity-70 hover:opacity-100"
              >
                Remove photo ×
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="field"
              value={section}
              onChange={(e) => setSection(e.target.value as SectionTag)}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  Section: {s}
                </option>
              ))}
            </select>

            <input
              className="field"
              placeholder={`People (${peopleNames.slice(0, 2).join(", ")})`}
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
            />

            <input
              className="field"
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="font-ui text-[16px] uppercase tracking-[0.16em] text-wine opacity-70">
              Mood
            </span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMood(n)}
                className={`h-9 w-9 rounded-full border-2 border-wine font-display text-[18px] transition-colors ${
                  mood >= n ? "bg-wine text-marble" : "bg-marble text-wine hover:bg-marbleDim"
                }`}
              >
                {n}
              </button>
            ))}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()}
                className={`rounded-pill border-2 border-wine px-4 py-2 font-ui text-[15.5px] uppercase tracking-[0.14em] ${
                  recording ? "bg-wine text-marble anim-breathe" : "bg-marble text-wine hover:bg-marbleDim"
                }`}
              >
                {recording ? `■ Stop (${recSeconds}s)` : "◎ Record Voice"}
              </button>

              <label className="cursor-pointer rounded-pill border-2 border-wine bg-marble px-4 py-2 font-ui text-[15.5px] uppercase tracking-[0.14em] text-wine hover:bg-marbleDim">
                ▣ Photo
                <input type="file" accept="image/*" onChange={handlePhotoPick} className="hidden" />
              </label>

              <button type="submit" className="btn-wine">
                Keep Entry
              </button>
            </div>
          </div>
        </form>
      </Panel>

      {/* Journal Feed */}
      <div className="space-y-4">
        {filteredJournals.length === 0 ? (
          <Panel title="Journal">
            <Empty>Nothing in this journal view yet.</Empty>
          </Panel>
        ) : (
          filteredJournals.map((entry) => (
            <TimelineEntryItem
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
/*  BRANCH 5: MILESTONES (Achievements, Launches, Trips, Firsts)      */
/* ================================================================== */

function MilestonesBranch({
  entries,
  peopleNames,
  onOpenMedia,
  onOpenLinked,
}: {
  entries: MemoryEntry[];
  peopleNames: string[];
  onOpenMedia: (e: MemoryEntry) => void;
  onOpenLinked: (id: string) => void;
}) {
  const [catFilter, setCatFilter] = useState<MilestoneCategory | "All">("All");
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [cat, setCat] = useState<MilestoneCategory>("Achievement");
  const [note, setNote] = useState("");
  const [section, setSection] = useState<SectionTag>("Work");
  const [peopleInput, setPeopleInput] = useState("");
  const [location, setLocation] = useState("");
  const [linkedPhotoEntryId, setLinkedPhotoEntryId] = useState("");

  const galleryPhotos = useMemo(
    () => entries.filter((e) => e.media?.mediaType === "photo"),
    [entries]
  );

  const milestones = useMemo(() => {
    return entries
      .filter((e) => e.kind === "milestone")
      .filter((e) => catFilter === "All" || e.milestoneCategory === catFilter)
      .sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
          b.date.localeCompare(a.date)
      );
  }, [entries, catFilter]);

  const submitMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const linkedPhoto = galleryPhotos.find((g) => g.id === linkedPhotoEntryId);
    const pTags = peopleInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    addMemoryEntry({
      kind: "milestone",
      milestoneCategory: cat,
      pinned: true,
      title: title.trim(),
      text: note.trim(),
      date,
      time: nowHHMM(),
      section,
      peopleTags: pTags,
      mood: 5,
      location: location.trim() || undefined,
      starred: true,
      linkedIds: linkedPhoto ? [linkedPhoto.id] : [],
      mediaAttachments: linkedPhoto?.media ? [linkedPhoto.media] : undefined,
    });

    setTitle("");
    setNote("");
    setPeopleInput("");
    setLocation("");
    setLinkedPhotoEntryId("");
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["All", ...MILESTONE_CATS] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={`rounded-pill border-2 border-wine px-4 py-1.5 font-ui text-[15.5px] uppercase tracking-[0.14em] transition-colors ${
                catFilter === c ? "bg-wine text-marble" : "bg-marble text-wine hover:bg-marbleDim"
              }`}
            >
              {c === "All" ? "All Moments" : `${c}s`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="btn-wine btn-sm"
        >
          {showCreate ? "Close" : "+ Pin Milestone"}
        </button>
      </div>

      {showCreate && (
        <Panel
          title="Pin a new Milestone"
          hint="Achievements, launches, graduations, trips & firsts — pinned with date, note & linked photos"
        >
          <form onSubmit={submitMilestone} className="grid gap-3.5 sm:grid-cols-2">
            <input
              className="field sm:col-span-2"
              placeholder="Milestone title (e.g. Shipped Atlas v2, Graduated Honours…)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <input
              type="date"
              className="field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <select
              className="field"
              value={cat}
              onChange={(e) => setCat(e.target.value as MilestoneCategory)}
            >
              {MILESTONE_CATS.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>

            <textarea
              className="field min-h-[110px] sm:col-span-2"
              placeholder="Note — why this moment mattered"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <select
              className="field"
              value={section}
              onChange={(e) => setSection(e.target.value as SectionTag)}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  Section: {s}
                </option>
              ))}
            </select>

            <input
              className="field"
              placeholder={`People (${peopleNames.slice(0, 2).join(", ")})`}
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
            />

            <input
              className="field"
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <select
              className="field"
              value={linkedPhotoEntryId}
              onChange={(e) => setLinkedPhotoEntryId(e.target.value)}
            >
              <option value="">Link a photo from Gallery (optional)</option>
              {galleryPhotos.map((p) => (
                <option key={p.id} value={p.id}>
                  {prettyDate(p.date)} — {p.title}
                </option>
              ))}
            </select>

            <div className="sm:col-span-2">
              <button type="submit" className="btn-wine">
                Pin Milestone
              </button>
            </div>
          </form>
        </Panel>
      )}

      {milestones.length === 0 ? (
        <Panel title="Milestones">
          <Empty>No milestones pinned in this category yet.</Empty>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {milestones.map((ms) => {
            const photos = [
              ...(ms.media ? [ms.media] : []),
              ...(ms.mediaAttachments ?? []),
            ];
            return (
              <article
                key={ms.id}
                className="flex flex-col justify-between rounded-2xl border-2 border-wine bg-marble p-6"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="wine">{ms.milestoneCategory ?? "Milestone"}</Badge>
                    {ms.section && <Badge tone="dim">{ms.section}</Badge>}
                    <span className="font-ui text-[15px] uppercase tracking-[0.14em] text-wine opacity-70">
                      {prettyDate(ms.date)}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePinMilestone(ms.id)}
                      className={`ml-auto rounded-pill border px-2.5 py-0.5 font-ui text-[13.5px] uppercase tracking-[0.12em] ${
                        ms.pinned
                          ? "border-wine bg-wine text-marble"
                          : "border-wine/40 text-wine opacity-65"
                      }`}
                    >
                      {ms.pinned ? "📌 Pinned" : "Pin"}
                    </button>
                  </div>

                  <h3 className="mt-3.5 font-display text-[26px] leading-snug text-wine">
                    {ms.title}
                  </h3>
                  {ms.text && (
                    <p className="mt-2 font-body text-[20px] leading-relaxed text-wine opacity-85">
                      {ms.text}
                    </p>
                  )}

                  {photos.length > 0 && (
                    <div className="mt-4 grid gap-2.5">
                      {photos.map((ph) => (
                        <button
                          key={ph.id}
                          type="button"
                          onClick={() => onOpenMedia(ms)}
                          className="overflow-hidden rounded-xl border-2 border-wine"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ph.src}
                            alt={ms.title}
                            className="h-48 w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-wine/15 pt-3">
                  {ms.location && (
                    <span className="rounded-pill border border-wine/50 px-3 py-0.5 font-ui text-[14px] text-wine">
                      📍 {ms.location}
                    </span>
                  )}
                  {ms.peopleTags.map((p) => (
                    <span
                      key={p}
                      className="rounded-pill border border-wine px-3 py-0.5 font-ui text-[14px] text-wine"
                    >
                      👤 {p}
                    </span>
                  ))}
                  {ms.linkedIds.map((lid) => {
                    const target = entries.find((x) => x.id === lid);
                    if (!target) return null;
                    return (
                      <button
                        key={lid}
                        type="button"
                        onClick={() => onOpenLinked(lid)}
                        className="rounded-pill border-2 border-wine bg-wine px-3 py-0.5 font-ui text-[13.5px] uppercase text-marble hover:bg-marble hover:text-wine"
                      >
                        ↔ Linked media
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MODALS: LIGHTBOX VIEWER + VAULT LOCK SCREEN & SETTINGS            */
/* ================================================================== */

function EntryLightboxModal({
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[980] grid place-items-center bg-wine/90 p-4 backdrop-blur-sm anim-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90svh] w-full max-w-3xl overflow-y-auto rounded-2xl border-2 border-marble bg-marble p-5 text-wine sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-ui text-[15px] uppercase tracking-[0.18em] text-wine opacity-70">
              {prettyDate(entry.date)} · {entry.time}
              {entry.section ? ` · ${entry.section}` : ""}
            </p>
            <h3 className="mt-1 font-display text-[28px] leading-snug text-wine">
              {entry.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-wine font-ui text-[18px] text-wine hover:bg-wine hover:text-marble"
          >
            ✕
          </button>
        </div>

        {media && (
          <div className="mt-4 overflow-hidden rounded-xl border-2 border-wine bg-wine">
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
          <p className="mt-4 whitespace-pre-wrap font-body text-[21px] leading-relaxed text-wine">
            {entry.text}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-wine/20 pt-4">
          {media?.album && <Badge tone="gold">Album: {media.album}</Badge>}
          {entry.location && <Badge tone="marble">📍 {entry.location}</Badge>}
          {entry.peopleTags.map((p) => (
            <Badge key={p} tone="dim">
              👤 {p}
            </Badge>
          ))}
          {linked.map((le) => (
            <button
              key={le.id}
              type="button"
              onClick={() => onSelectLinked(le)}
              className="rounded-pill border-2 border-wine bg-wine px-3.5 py-1 font-ui text-[14px] uppercase tracking-[0.12em] text-marble hover:bg-marble hover:text-wine"
            >
              ↔ Open linked: {le.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LockConfigModal({
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
      setMsg("Enter a 4–6 digit PIN.");
      return;
    }
    setMemories((prev) => ({
      lock: { ...prev.lock, pinHash: hashPin(pin), locked: true },
    }));
    onClose();
  };

  const enrollBiometrics = async () => {
    const res = await registerBiometricLock();
    if (!res.ok || !res.credentialId) {
      setMsg(res.error ?? "Biometric enrollment unavailable.");
      return;
    }
    setMemories((prev) => ({
      lock: {
        ...prev.lock,
        biometricCredentialId: res.credentialId!,
        locked: true,
      },
    }));
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[980] grid place-items-center bg-wine/85 p-4 backdrop-blur-sm anim-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border-2 border-marble bg-marble p-6 text-wine"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[26px] text-wine">Memories Vault Lock</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border-2 border-wine font-ui text-[17px]"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 font-body text-[19.5px] italic text-wine opacity-75">
          Protect your timeline, gallery and journal with a PIN or device biometrics.
        </p>

        <form onSubmit={savePin} className="mt-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder={pinHash ? "Replace 4–6 digit PIN" : "Set 4–6 digit PIN"}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="field text-center tracking-[0.4em]"
          />
          <button type="submit" className="btn-wine w-full">
            Save PIN & Lock Now
          </button>
        </form>

        <div className="mt-3">
          <button type="button" onClick={() => void enrollBiometrics()} className="btn-ghost w-full">
            {biometricCredentialId ? "✓ Biometrics Active · Re-enroll" : "Register Device Biometrics"}
          </button>
        </div>

        {(pinHash || biometricCredentialId) && (
          <button
            type="button"
            onClick={() => {
              setMemories({
                lock: { pinHash: null, biometricCredentialId: null, locked: false },
              });
              onClose();
            }}
            className="mt-3 w-full font-ui text-[15px] uppercase tracking-[0.14em] text-wine opacity-65 hover:opacity-100"
          >
            Remove Vault Lock
          </button>
        )}

        {msg && (
          <p className="mt-3 rounded-xl border-2 border-wine bg-marbleDim px-3.5 py-2 font-ui text-[15.5px] text-wine">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

function VaultLockScreen({
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
    setErr("Incorrect PIN.");
    setPin("");
  };

  const tryBio = async () => {
    if (!biometricCredentialId) return;
    const ok = await verifyBiometricLock(biometricCredentialId);
    if (ok) onUnlock();
    else setErr("Biometric check did not complete — enter your PIN.");
  };

  return (
    <main className="grid min-h-[100svh] w-screen place-items-center bg-wine px-6 py-12 pl-20 text-marble sm:px-28">
      <div className="w-full max-w-md rounded-2xl border-2 border-marble bg-wineDeep p-7 text-center anim-fade-up">
        <div className="mx-auto flex justify-center">
          <MemorySphere glyph="memories" size={96} tone="wine" />
        </div>
        <p className="mt-4 font-ui text-[16px] uppercase tracking-[0.26em] text-marble opacity-75">
          Sealed Sanctuary
        </p>
        <h1 className="mt-1 font-display text-[34px] tracking-[0.1em] text-marble">
          MEMORIES LOCKED
        </h1>

        {pinHash && (
          <form onSubmit={tryPin} className="mt-6 space-y-3.5">
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
              placeholder="••••"
              className="w-full rounded-xl border-2 border-marble bg-wine px-4 py-3 text-center font-display text-[28px] tracking-[0.5em] text-marble outline-none"
            />
            <button type="submit" className="btn-gold w-full">
              Unlock with PIN
            </button>
          </form>
        )}

        {biometricCredentialId && (
          <button
            type="button"
            onClick={() => void tryBio()}
            className="mt-3 w-full rounded-pill border-2 border-marble px-5 py-3 font-ui text-[16.5px] uppercase tracking-[0.16em] text-marble transition-colors hover:bg-marble hover:text-wine"
          >
            Unlock with Biometrics
          </button>
        )}

        {err && <p className="mt-3 font-ui text-[16px] text-marble opacity-85">{err}</p>}

        <button
          type="button"
          onClick={onBack}
          className="mt-6 font-ui text-[15px] uppercase tracking-[0.18em] text-marble opacity-65 hover:opacity-100"
        >
          ← Back to Atlas World
        </button>
      </div>
    </main>
  );
}
