"use client";

import { useEffect, useState } from "react";
import {
  getState,
  setState,
  todayISO,
  daysSince,
  prettyDate,
  type AtlasState,
  type Person,
} from "./store";

/* ------------------------------------------------------------------ */
/*  Memories Store & Intelligence Engine                              */
/*  Supports all 5 branches: Timeline, Gallery, Calendar, Journal,    */
/*  Milestones + Plain-language Search, Quick Atlas Log, Lock & Export*/
/* ------------------------------------------------------------------ */

export type MemoryBranchKey = "timeline" | "gallery" | "calendar" | "journal" | "milestones";

export type SectionTag = "Work" | "Study" | "People" | "Life";

export type EntryKind = "journal" | "media" | "milestone" | "autolog";

export type JournalSubtype = "daily" | "reflection" | "idea";

export type MilestoneCategory = "Achievement" | "Launch" | "Graduation" | "Trip" | "First";

export type MediaItem = {
  id: string;
  mediaType: "photo" | "video";
  src: string;
  poster?: string;
  duration?: string;
  album: string;
};

export type VoiceAttachment = {
  durationSec: number;
  audioUrl?: string;
  transcript?: string;
};

export type MemoryEntry = {
  id: string;
  kind: EntryKind;
  title: string;
  text: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  section?: SectionTag;
  peopleTags: string[];
  mood?: number; // 1..5
  location?: string;
  starred?: boolean; // Highlight
  linkedIds: string[]; // IDs of linked MemoryEntry items
  // Kind-specific payloads
  journalSubtype?: JournalSubtype;
  voice?: VoiceAttachment;
  media?: MediaItem;
   mediaAttachments?: MediaItem[]; // optional photos attached to journal/milestone
  milestoneCategory?: MilestoneCategory;
  pinned?: boolean;
};

export type MemoryLockConfig = {
  pinHash: string | null; // stored simple hash of PIN
  biometricCredentialId: string | null;
  locked: boolean;
};

export type MemoriesState = {
  entries: MemoryEntry[];
  customSummaries: Record<string, string>; // YYYY-MM-DD -> one-line summary override
  albums: string[];
  lock: MemoryLockConfig;
};

const MEM_KEY = "atlas.memories.v2";

const offsetISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const priorYearSameDayISO = (yearsBack: number): string => {
  const d = new Date();
  const yyyy = d.getFullYear() - yearsBack;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export function seedMemories(): MemoriesState {
  // Also ensure cousin Malik exists in main People registry on first hydrate
  return {
    albums: ["Trips", "Events", "Projects"],
    customSummaries: {},
    lock: {
      pinHash: null,
      biometricCredentialId: null,
      locked: false,
    },
    entries: [
      /* ---- TODAY ---- */
      {
        id: "m-j1",
        kind: "journal",
        journalSubtype: "daily",
        title: "Held the morning beneath the jacarandas",
        text: "Woke before the alarm and walked the long avenue while the purple blossoms were still damp on the pavement. Finished wordmark refinement v3 at the studio — the serifs finally carry weight like carved stone rather than drawn ink.",
        date: offsetISO(0),
        time: "08:25",
        section: "Work",
        peopleTags: [],
        mood: 5,
        location: "Nairobi · Studio",
        starred: true,
        linkedIds: ["m-ph1"],
        mediaAttachments: [
          {
            id: "att-jac",
            mediaType: "photo",
            src: "/assets/memories/jacaranda-walk.jpg",
            album: "Events",
          },
        ],
      },
      {
        id: "m-ph1",
        kind: "media",
        title: "Jacaranda canopy on the morning walk",
        text: "Early blue sky over the purple avenue on the way into the studio.",
        date: offsetISO(0),
        time: "07:18",
        section: "Life",
        peopleTags: [],
        mood: 5,
        location: "Nairobi · State House Rd",
        starred: false,
        linkedIds: ["m-j1"],
        media: {
          id: "med-1",
          mediaType: "photo",
          src: "/assets/memories/jacaranda-walk.jpg",
          album: "Events",
        },
      },
      {
        id: "m-auto1",
        kind: "autolog",
        title: "Kept morning walk (12-day streak) & Greek drills (21-day streak)",
        text: "Auto-logged from Life rites.",
        date: offsetISO(0),
        time: "07:50",
        section: "Life",
        peopleTags: [],
        mood: 4,
        linkedIds: [],
      },
      {
        id: "m-auto2",
        kind: "autolog",
        title: "Attended Classical Greek II — Unit 7 aorist drills",
        text: "50m session at Room 4 · Homer Hall.",
        date: offsetISO(0),
        time: "10:05",
        section: "Study",
        peopleTags: [],
        location: "Homer Hall",
        linkedIds: [],
      },

      /* ---- YESTERDAY ---- */
      {
        id: "m-j2",
        kind: "journal",
        journalSubtype: "reflection",
        title: "Forty minutes on the phone with Nia",
        text: "She sounded tired from the first month at her new studio, but steady and proud. Promised I would send over the Kilifi coast photographs tonight — keeping that promise.",
        date: offsetISO(-1),
        time: "20:15",
        section: "People",
        peopleTags: ["Nia Mwangi"],
        mood: 4,
        location: "Home",
        starred: true,
        linkedIds: ["m-ph2"],
      },
      {
        id: "m-auto3",
        kind: "autolog",
        title: "Completed task: Client review deck for Kavala Studio",
        text: "Shipped ahead of call · Marble & Mortar identity.",
        date: offsetISO(-1),
        time: "16:40",
        section: "Work",
        peopleTags: [],
        linkedIds: ["m-ph3"],
      },
      {
        id: "m-ph3",
        kind: "media",
        title: "Evening desk — type specimen & identity notes",
        text: "Quiet lamp light after shipping the Kavala Studio review deck.",
        date: offsetISO(-1),
        time: "19:05",
        section: "Work",
        peopleTags: [],
        mood: 4,
        location: "Nairobi · Studio",
        linkedIds: ["m-auto3"],
        media: {
          id: "med-3",
          mediaType: "photo",
          src: "/assets/memories/studio-desk.jpg",
          album: "Projects",
        },
      },

      /* ---- 3 DAYS AGO ---- */
      {
        id: "m-auto4",
        kind: "autolog",
        title: "Called Mum — 25 min check-in & kitchen shelf plan",
        text: "Logged from People circle.",
        date: offsetISO(-3),
        time: "18:30",
        section: "People",
        peopleTags: ["Mum"],
        mood: 4,
        linkedIds: [],
      },
      {
        id: "m-auto5",
        kind: "autolog",
        title: "Paid Studio rent — $420",
        text: "Recorded in Work ledger · Space.",
        date: offsetISO(-3),
        time: "11:10",
        section: "Work",
        peopleTags: [],
        linkedIds: [],
      },

      /* ---- 4 DAYS AGO (MILESTONE) ---- */
      {
        id: "m-ms1",
        kind: "milestone",
        milestoneCategory: "Achievement",
        pinned: true,
        title: "First annual retainer renewed — Delos Labs",
        text: "Delos renewed the cartography UI retainer for twelve more months without pitching. A whole year of quiet, deep craft now has solid marble underneath it.",
        date: offsetISO(-4),
        time: "15:00",
        section: "Work",
        peopleTags: ["Amara Osei"],
        mood: 5,
        location: "Nairobi · Studio",
        starred: true,
        linkedIds: ["m-ph3"],
        mediaAttachments: [
          {
            id: "att-desk",
            mediaType: "photo",
            src: "/assets/memories/studio-desk.jpg",
            album: "Projects",
          },
        ],
      },

      /* ---- 7 DAYS AGO (VOICE JOURNAL + VIDEO) ---- */
      {
        id: "m-j3",
        kind: "journal",
        journalSubtype: "idea",
        title: "Voice note walking home — smaller, slower studio",
        text: "Recorded on the walk back after dusk: fewer concurrent clients, deeper typographic craft, and publishing Fieldnotes every fortnight without fail.",
        date: offsetISO(-7),
        time: "19:45",
        section: "Work",
        peopleTags: ["Theo Kaneli"],
        mood: 4,
        location: "Kilimani",
        starred: false,
        linkedIds: ["m-vid1"],
        voice: {
          durationSec: 48,
          transcript:
            "In two years I want the studio to be smaller, slower, and sharper — three enduring commissions a year and Fieldnotes read by a thousand people who care.",
        },
      },
      {
        id: "m-vid1",
        kind: "media",
        title: "Dusk stone study — classical ruins motion reel",
        text: "Reference film loop captured for the Atlas sanctuary motion study.",
        date: offsetISO(-7),
        time: "18:12",
        section: "Work",
        peopleTags: [],
        mood: 4,
        location: "Studio Archive",
        linkedIds: ["m-j3"],
        media: {
          id: "med-vid1",
          mediaType: "video",
          src: "/assets/ruins-loop.mp4",
          poster: "/assets/ruins-poster.png",
          duration: "0:14",
          album: "Projects",
        },
      },

      /* ---- 12 DAYS AGO (COUSIN DINNER — answers "when did I last see my cousin?") ---- */
      {
        id: "m-ph4",
        kind: "media",
        title: "Candlelit dinner with cousin Malik & Mum",
        text: "Long evening catching up with my cousin Malik over dinner — laughed for three hours about childhood holidays.",
        date: offsetISO(-12),
        time: "20:30",
        section: "People",
        peopleTags: ["Malik Mwangi", "Mum"],
        mood: 5,
        location: "Nairobi · Kilimani",
        starred: true,
        linkedIds: [],
        media: {
          id: "med-4",
          mediaType: "photo",
          src: "/assets/memories/family-dinner.jpg",
          album: "Events",
        },
      },

      /* ---- 19 DAYS AGO (STUDY PHOTO + MILESTONE) ---- */
      {
        id: "m-ms2",
        kind: "milestone",
        milestoneCategory: "Graduation",
        pinned: true,
        title: "Completed GEO 260 — Cartography & Place (100%)",
        text: "Turned in the neighbourhood field map and closed the course with distinction.",
        date: offsetISO(-19),
        time: "14:20",
        section: "Study",
        peopleTags: [],
        mood: 5,
        location: "Homer Hall Library",
        starred: false,
        linkedIds: ["m-ph5"],
        mediaAttachments: [
          {
            id: "att-lib",
            mediaType: "photo",
            src: "/assets/memories/homer-library.jpg",
            album: "Projects",
          },
        ],
      },
      {
        id: "m-ph5",
        kind: "media",
        title: "Warm lamps over the classical library stacks",
        text: "Late afternoon in the reading room after submitting the final cartography map.",
        date: offsetISO(-19),
        time: "17:10",
        section: "Study",
        peopleTags: [],
        mood: 4,
        location: "Homer Hall Library",
        linkedIds: ["m-ms2"],
        media: {
          id: "med-5",
          mediaType: "photo",
          src: "/assets/memories/homer-library.jpg",
          album: "Projects",
        },
      },

      /* ---- 35 DAYS AGO (KILIFI TRIP MILESTONE + PHOTO) ---- */
      {
        id: "m-ms3",
        kind: "milestone",
        milestoneCategory: "Trip",
        pinned: true,
        title: "Kilifi Creek coastal retreat with Nia",
        text: "Four sunlit days overlooking the Indian Ocean cliffs before the new quarter began.",
        date: offsetISO(-35),
        time: "16:50",
        section: "People",
        peopleTags: ["Nia Mwangi"],
        mood: 5,
        location: "Kilifi Coast",
        starred: true,
        linkedIds: ["m-ph2"],
        mediaAttachments: [
          {
            id: "att-kilifi",
            mediaType: "photo",
            src: "/assets/memories/kilifi-coast.jpg",
            album: "Trips",
          },
        ],
      },
      {
        id: "m-ph2",
        kind: "media",
        title: "Indian Ocean horizon from the Kilifi ridge",
        text: "Afternoon sea breeze over the palms and white coral roofs.",
        date: offsetISO(-35),
        time: "17:05",
        section: "Life",
        peopleTags: ["Nia Mwangi"],
        mood: 5,
        location: "Kilifi Coast",
        starred: true,
        linkedIds: ["m-ms3", "m-j2"],
        media: {
          id: "med-2",
          mediaType: "photo",
          src: "/assets/memories/kilifi-coast.jpg",
          album: "Trips",
        },
      },

      /* ---- ON THIS DAY — 1 YEAR AGO ---- */
      {
        id: "m-otd-1",
        kind: "milestone",
        milestoneCategory: "First",
        pinned: true,
        title: "First morning beneath the Parthenon columns with Theo",
        text: "Stood at the Acropolis as the sun broke right between the Doric columns. Decided that morning to name this sanctuary Atlas.",
        date: priorYearSameDayISO(1),
        time: "08:40",
        section: "Life",
        peopleTags: ["Theo Kaneli"],
        mood: 5,
        location: "Athens · Acropolis",
        starred: true,
        linkedIds: ["m-ph6"],
        mediaAttachments: [
          {
            id: "att-ath",
            mediaType: "photo",
            src: "/assets/memories/athens-columns.jpg",
            album: "Trips",
          },
        ],
      },
      {
        id: "m-ph6",
        kind: "media",
        title: "Sunburst through the Parthenon marble columns",
        text: "Athens trip with Theo — exactly one year ago today.",
        date: priorYearSameDayISO(1),
        time: "08:45",
        section: "Life",
        peopleTags: ["Theo Kaneli"],
        mood: 5,
        location: "Athens · Acropolis",
        starred: true,
        linkedIds: ["m-otd-1"],
        media: {
          id: "med-6",
          mediaType: "photo",
          src: "/assets/memories/athens-columns.jpg",
          album: "Trips",
        },
      },

      /* ---- ON THIS DAY — 2 YEARS AGO ---- */
      {
        id: "m-otd-2",
        kind: "milestone",
        milestoneCategory: "Launch",
        pinned: true,
        title: "Launched Fieldnotes Issue #1",
        text: "Sent the very first dispatch to forty-two friends at midnight. None of us knew where the thread would lead.",
        date: priorYearSameDayISO(2),
        time: "23:15",
        section: "Work",
        peopleTags: ["Theo Kaneli", "Nia Mwangi"],
        mood: 5,
        location: "Nairobi",
        starred: false,
        linkedIds: [],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Observable Persistence                                            */
/* ------------------------------------------------------------------ */

let memState: MemoriesState = seedMemories();
const memListeners = new Set<() => void>();
let memHydrated = false;

function ensureCousinInPeople() {
  const s = getState();
  if (!s.people.some((p) => p.name.toLowerCase().includes("malik") || p.relation.toLowerCase() === "cousin")) {
    setState((prev) => ({
      people: [
        ...prev.people,
        {
          id: "pe-cousin",
          name: "Malik Mwangi",
          relation: "Cousin",
          lastSeen: offsetISO(-12),
          cadenceDays: 30,
          birthday: "08-11",
          promise: "Host rooftop roast next month",
          gift: "Kenyan AA pour-over set",
          notes: "Architecture graduate; last caught up over dinner in Kilimani.",
        },
      ],
    }));
  }
}

export function hydrateMemories() {
  if (memHydrated || typeof window === "undefined") return;
  memHydrated = true;
  ensureCousinInPeople();
  try {
    const raw = localStorage.getItem(MEM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MemoriesState>;
      const defaults = seedMemories();
      memState = {
        ...defaults,
        ...parsed,
        entries: Array.isArray(parsed.entries) && parsed.entries.length > 0 ? parsed.entries : defaults.entries,
        albums: Array.from(new Set([...defaults.albums, ...(parsed.albums ?? [])])),
        lock: { ...defaults.lock, ...(parsed.lock ?? {}) },
      };
    }
  } catch {
    memState = seedMemories();
  }
  memListeners.forEach((l) => l());
}

function persistMemories() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify(memState));
    } catch {}
  }
  memListeners.forEach((l) => l());
}

export function setMemories(
  patch: Partial<MemoriesState> | ((prev: MemoriesState) => Partial<MemoriesState>)
) {
  const next = typeof patch === "function" ? patch(memState) : patch;
  memState = { ...memState, ...next };
  persistMemories();
}

export function useMemories(): MemoriesState {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    memListeners.add(fn);
    hydrateMemories();
    return () => {
      memListeners.delete(fn);
    };
  }, []);
  return memState;
}

/* ------------------------------------------------------------------ */
/*  Mutations: Add Journal, Media, Milestone, Toggle Star, Link       */
/* ------------------------------------------------------------------ */

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function addMemoryEntry(entry: Omit<MemoryEntry, "id">): MemoryEntry {
  const created: MemoryEntry = {
    ...entry,
    id: `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
  };
  setMemories((prev) => {
    // Also back-link any referenced linkedIds
    const updated = prev.entries.map((e) =>
      created.linkedIds.includes(e.id) && !e.linkedIds.includes(created.id)
        ? { ...e, linkedIds: [...e.linkedIds, created.id] }
        : e
    );
    const nextAlbums =
      created.media?.album && !prev.albums.includes(created.media.album)
        ? [...prev.albums, created.media.album]
        : prev.albums;
    return {
      entries: [created, ...updated],
      albums: nextAlbums,
    };
  });

  // Also mirror journal/milestone into legacy store.journal so Atlas AI snapshot sees it!
  if (created.kind === "journal" || created.kind === "milestone" || created.kind === "autolog") {
    setState((s) => ({
      journal: [
        {
          id: created.id,
          date: created.date,
          title: created.title,
          text: created.text,
          mood: created.mood ?? 4,
          kind:
            created.kind === "milestone"
              ? "milestone"
              : created.voice
                ? "voice"
                : created.kind === "autolog"
                  ? "log"
                  : "journal",
          pillar: created.section,
        },
        ...s.journal,
      ],
    }));
  }

  return created;
}

export function toggleStarMemory(id: string) {
  setMemories((prev) => ({
    entries: prev.entries.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)),
  }));
}

export function togglePinMilestone(id: string) {
  setMemories((prev) => ({
    entries: prev.entries.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e)),
  }));
}

export function setCustomDailySummary(date: string, summary: string) {
  setMemories((prev) => ({
    customSummaries: { ...prev.customSummaries, [date]: summary },
  }));
}

/* ------------------------------------------------------------------ */
/*  Atlas Automatic Daily Summary Generator                           */
/* ------------------------------------------------------------------ */

export function generateAtlasDailySummary(
  date: string,
  dayEntries: MemoryEntry[],
  customSummaries: Record<string, string>
): string {
  if (customSummaries[date]?.trim()) return customSummaries[date];
  if (!dayEntries.length) return "A quiet page — nothing weighed upon the ledger.";

  const milestones = dayEntries.filter((e) => e.kind === "milestone");
  const journals = dayEntries.filter((e) => e.kind === "journal");
  const media = dayEntries.filter((e) => e.kind === "media");
  const autos = dayEntries.filter((e) => e.kind === "autolog");
  const people = Array.from(new Set(dayEntries.flatMap((e) => e.peopleTags)));
  const sections = Array.from(new Set(dayEntries.map((e) => e.section).filter(Boolean)));

  const parts: string[] = [];
  if (milestones.length > 0) {
    parts.push(`Pinned milestone “${milestones[0].title}”`);
  } else if (journals.length > 0) {
    parts.push(`Wrote “${journals[0].title}”`);
  }
  if (media.length > 0) {
    const vCount = media.filter((m) => m.media?.mediaType === "video").length;
    const pCount = media.length - vCount;
    const label = [pCount ? `${pCount} photo${pCount > 1 ? "s" : ""}` : "", vCount ? `${vCount} video${vCount > 1 ? "s" : ""}` : ""]
      .filter(Boolean)
      .join(" & ");
    parts.push(`kept ${label}`);
  }
  if (autos.length > 0) {
    parts.push(`${autos.length} automatic log${autos.length > 1 ? "s" : ""}`);
  }
  if (people.length > 0) {
    parts.push(`with ${people.slice(0, 2).join(" & ")}`);
  } else if (sections.length > 0) {
    parts.push(`across ${sections.join(" & ")}`);
  }

  return `${parts.join(", ")}.`;
}

export function averageDayMood(dayEntries: MemoryEntry[]): number {
  const moods = dayEntries.map((e) => e.mood).filter((m): m is number => typeof m === "number" && m >= 1 && m <= 5);
  if (!moods.length) return 4;
  return Math.round(moods.reduce((a, b) => a + b, 0) / moods.length);
}

/* ------------------------------------------------------------------ */
/*  Quick Log to Atlas ("spent 800 on lunch with Sam")                */
/*  Files into Work / Study / People / Life AND creates Timeline row! */
/* ------------------------------------------------------------------ */

export function logToAtlasQuick(rawInput: string): {
  entry: MemoryEntry;
  filedUnder: string[];
} {
  const text = rawInput.trim();
  const lower = text.toLowerCase();
  const s = getState();

  const filedUnder: string[] = [];
  const peopleTags: string[] = [];
  let section: SectionTag = "Life";

  // 1. Detect people mentioned (existing people OR "with <Name>" / "called <Name>" / "saw <Name>")
  for (const p of s.people) {
    const first = p.name.split(" ")[0].toLowerCase();
    if (lower.includes(p.name.toLowerCase()) || (first.length >= 3 && new RegExp(`\\b${first}\\b`, "i").test(text))) {
      if (!peopleTags.includes(p.name)) peopleTags.push(p.name);
    }
  }

  const withMatch = text.match(/\b(?:with|called|phoned|met|saw|visited)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (withMatch) {
    const mentioned = withMatch[1].trim();
    const existing = s.people.find(
      (p) => p.name.toLowerCase() === mentioned.toLowerCase() || p.name.split(" ")[0].toLowerCase() === mentioned.toLowerCase()
    );
    if (existing) {
      if (!peopleTags.includes(existing.name)) peopleTags.push(existing.name);
      setState((prev) => ({
        people: prev.people.map((p) => (p.id === existing.id ? { ...p, lastSeen: todayISO() } : p)),
      }));
    } else {
      peopleTags.push(mentioned);
      setState((prev) => ({
        people: [
          {
            id: `pe-${Date.now().toString(36)}`,
            name: mentioned,
            relation: "Circle",
            lastSeen: todayISO(),
            cadenceDays: 21,
            birthday: "06-15",
            promise: "—",
            gift: "—",
            notes: `Added from Atlas log: “${text}”`,
          },
          ...prev.people,
        ],
      }));
    }
    filedUnder.push(`People (${mentioned})`);
  } else if (peopleTags.length > 0) {
    setState((prev) => ({
      people: prev.people.map((p) => (peopleTags.includes(p.name) ? { ...p, lastSeen: todayISO() } : p)),
    }));
    filedUnder.push(`People (${peopleTags.join(", ")})`);
  }

  // 2. Detect spending / income ("spent 800 on lunch with Sam", "paid 45 for books", "earned 1200")
  const moneyMatch = text.match(/(?:spent|paid|bought|cost|earned|invoiced|received)?\s*\$?(\d[\d,]*(?:\.\d+)?)/i);
  const isMoney = /\b(spent|paid|bought|cost|lunch|dinner|coffee|groceries|uber|taxi|earned|invoiced|rent)\b/i.test(lower);

  if (isMoney && moneyMatch) {
    const amount = Number(moneyMatch[1].replace(/,/g, ""));
    const isIncome = /\b(earned|invoiced|received|client)\b/i.test(lower);
    if (Number.isFinite(amount) && amount > 0) {
      if (isIncome || /\b(client|studio|project|invoice)\b/i.test(lower)) {
        section = "Work";
        setState((prev) => ({
          ledger: [
            {
              id: `l-${Date.now().toString(36)}`,
              label: text,
              amount,
              kind: isIncome ? "income" : "expense",
              date: todayISO(),
              bucket: "Atlas Log",
            },
            ...prev.ledger,
          ],
        }));
        filedUnder.unshift(`Work Ledger ($${amount})`);
      } else {
        section = "Life";
        setState((prev) => ({
          money: { ...prev.money, spend: prev.money.spend + amount },
          ledger: [
            {
              id: `l-${Date.now().toString(36)}`,
              label: text,
              amount,
              kind: "expense",
              date: todayISO(),
              bucket: "Life",
            },
            ...prev.ledger,
          ],
        }));
        filedUnder.unshift(`Life Money (${amount})`);
      }
    }
  } else if (/\b(class|lecture|studied|course|exam|assignment|greek|statistics|read)\b/i.test(lower)) {
    section = "Study";
    filedUnder.unshift("Study");
  } else if (/\b(shipped|client|project|deck|meeting|design|work|task)\b/i.test(lower)) {
    section = "Work";
    filedUnder.unshift("Work");
  } else if (/\b(workout|ran|walk|walked|gym|slept|water|habit)\b/i.test(lower)) {
    section = "Life";
    if (/\b(workout|ran|gym)\b/i.test(lower)) {
      setState((prev) => ({ health: { ...prev.health, workouts: prev.health.workouts + 1 } }));
    }
    filedUnder.unshift("Life Health");
  } else if (peopleTags.length > 0) {
    section = "People";
  } else {
    filedUnder.unshift("Life");
  }

  const entry = addMemoryEntry({
    kind: "autolog",
    title: text.charAt(0).toUpperCase() + text.slice(1),
    text: `Filed under ${Array.from(new Set(filedUnder)).join(" · ")}`,
    date: todayISO(),
    time: nowHHMM(),
    section,
    peopleTags,
    mood: 4,
    linkedIds: [],
  });

  return { entry, filedUnder: Array.from(new Set(filedUnder)) };
}

/* ------------------------------------------------------------------ */
/*  Plain-Language Search & Conversational Q&A                        */
/*  Handles queries like "when did I last see my cousin?"             */
/* ------------------------------------------------------------------ */

export function searchMemoriesNaturalLanguage(
  rawQuery: string,
  entries: MemoryEntry[],
  atlasState: AtlasState
): { answer: string | null; results: MemoryEntry[] } {
  const q = rawQuery.trim();
  if (!q) return { answer: null, results: entries };

  const lower = q.toLowerCase();
  const stopWords = new Set([
    "when",
    "did",
    "i",
    "last",
    "see",
    "saw",
    "meet",
    "talk",
    "to",
    "with",
    "my",
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "what",
    "where",
    "who",
    "was",
    "is",
    "about",
    "show",
    "me",
    "all",
    "from",
  ]);

  // 1. Relation resolution ("cousin", "sister", "mum", "mother", "mentor", "friend")
  const matchedPeople: Person[] = atlasState.people.filter((p) => {
    const rel = p.relation.toLowerCase();
    const name = p.name.toLowerCase();
    const first = name.split(" ")[0];
    if (lower.includes(name) || (first.length >= 3 && lower.includes(first))) return true;
    if (lower.includes(rel)) return true;
    if (lower.includes("mother") && name === "mum") return true;
    if (lower.includes("friend") && rel.includes("friend")) return true;
    return false;
  });

  const tokens = lower
    .replace(/[?.,!"]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  const scored = entries
    .map((e) => {
      let score = 0;
      const hay = [
        e.title,
        e.text,
        e.location ?? "",
        e.section ?? "",
        e.kind,
        e.milestoneCategory ?? "",
        e.media?.album ?? "",
        ...e.peopleTags,
      ]
        .join(" ")
        .toLowerCase();

      // Match resolved person from relation (e.g. "cousin" -> "Malik Mwangi")
      for (const p of matchedPeople) {
        if (
          e.peopleTags.some((tag) => tag.toLowerCase().includes(p.name.split(" ")[0].toLowerCase())) ||
          hay.includes(p.name.toLowerCase())
        ) {
          score += 12;
        }
      }

      if (lower.includes("photo") && (e.media?.mediaType === "photo" || (e.mediaAttachments?.length ?? 0) > 0)) {
        score += 6;
      }
      if (lower.includes("video") && e.media?.mediaType === "video") {
        score += 8;
      }
      if ((lower.includes("star") || lower.includes("highlight")) && e.starred) {
        score += 8;
      }
      if (lower.includes("voice") && e.voice) {
        score += 8;
      }
      if (lower.includes("milestone") && e.kind === "milestone") {
        score += 8;
      }

      for (const tok of tokens) {
        if (hay.includes(tok)) score += 4;
      }

      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.e.date.localeCompare(a.e.date) || b.e.time.localeCompare(a.e.time));

  const results = scored.map((x) => x.e);

  // Build direct natural-language answer for questions ("when...", "who...", "how many...", matched person)
  let answer: string | null = null;
  const isQuestion = /^(when|where|what|who|how)\b/i.test(q) || q.endsWith("?");

  if (matchedPeople.length > 0) {
    const p = matchedPeople[0];
    const latestEntry = [...results].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latestEntry) {
      const ago = daysSince(latestEntry.date);
      answer = `Last recorded with ${p.name} (${p.relation}): ${prettyDate(latestEntry.date)} (${
        ago === 0 ? "today" : `${ago} days ago`
      }) — “${latestEntry.title}”${latestEntry.location ? ` at ${latestEntry.location}` : ""}.`;
    } else {
      const ago = daysSince(p.lastSeen);
      answer = `${p.name} (${p.relation}) was last seen on ${prettyDate(p.lastSeen)} (${ago} days ago).`;
    }
  } else if (isQuestion && results.length > 0) {
    const top = results[0];
    const ago = daysSince(top.date);
    answer = `Closest match (${results.length} found): ${prettyDate(top.date)} (${
      ago === 0 ? "today" : `${ago}d ago`
    }) — “${top.title}”${top.location ? ` · ${top.location}` : ""}.`;
  } else if (isQuestion && results.length === 0) {
    answer = "No matching memory found in the chronicle yet.";
  }

  return { answer, results };
}

/* ------------------------------------------------------------------ */
/*  Biometric (WebAuthn) & PIN Lock Helpers                           */
/* ------------------------------------------------------------------ */

export function hashPin(pin: string): string {
  let h = 2166136261;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `pin-${(h >>> 0).toString(16)}`;
}

export async function registerBiometricLock(): Promise<{ ok: boolean; credentialId?: string; error?: string }> {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !navigator.credentials?.create) {
    return { ok: false, error: "Biometric WebAuthn is not available on this device/browser — use a 4-digit PIN." };
  }
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Atlas Memories Sanctuary" },
        user: {
          id: userId,
          name: "bearer@atlas.local",
          displayName: "Atlas Bearer",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 30000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) return { ok: false, error: "Biometric enrollment was cancelled." };
    const idB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(cred.rawId))));
    return { ok: true, credentialId: idB64 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Biometric registration could not complete in this context — use PIN.",
    };
  }
}

export async function verifyBiometricLock(credentialIdB64: string): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.credentials?.get) return false;
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const rawId = Uint8Array.from(atob(credentialIdB64), (c) => c.charCodeAt(0));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: "public-key", id: rawId }],
        userVerification: "required",
        timeout: 30000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Export Whole Timeline (JSON & Markdown Chronicle)                 */
/* ------------------------------------------------------------------ */

export function exportMemoriesArchive(
  format: "json" | "markdown",
  state: MemoriesState
) {
  const sorted = [...state.entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)
  );
  const stamp = todayISO();

  if (format === "json") {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: sorted.length,
        albums: state.albums,
        entries: sorted,
      },
      null,
      2
    );
    triggerDownload(`atlas-memories-${stamp}.json`, payload, "application/json");
    return;
  }

  // Group by day for Markdown chronicle
  const byDay = new Map<string, MemoryEntry[]>();
  for (const e of sorted) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }

  const lines: string[] = [
    `# ATLAS — Memories Chronicle`,
    `Exported on ${prettyDate(stamp)} · ${sorted.length} entries`,
    ``,
  ];

  byDay.forEach((dayEntries, date) => {
    const summary = generateAtlasDailySummary(date, dayEntries, state.customSummaries);
    const mood = averageDayMood(dayEntries);
    lines.push(`## ${prettyDate(date)} · Mood ${mood}/5`);
    lines.push(`> **Atlas Daily Summary:** ${summary}`);
    lines.push(``);
    for (const e of dayEntries) {
      const meta = [
        e.time,
        e.kind.toUpperCase(),
        e.section ? `#${e.section}` : "",
        e.peopleTags.length ? `with ${e.peopleTags.join(", ")}` : "",
        e.location ? `@ ${e.location}` : "",
        e.starred ? "★ Highlight" : "",
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`### ${e.title}`);
      lines.push(`*${meta}*`);
      if (e.text) lines.push(``, e.text);
      if (e.media) lines.push(``, `Media (${e.media.mediaType} · Album: ${e.media.album}): ${e.media.src}`);
      lines.push(``);
    }
  });

  triggerDownload(`atlas-memories-${stamp}.md`, lines.join("\n"), "text/markdown");
}

function triggerDownload(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
