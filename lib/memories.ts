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
import {
  getSupabaseBrowserClient,
  loadAtlasCloudRow,
  saveAtlasMemoriesState,
} from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Memories Store (Simple Everyday Language)                         */
/*  Branches: Timeline, Gallery, Calendar, Journal, Milestones        */
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
  linkedIds: string[];
  journalSubtype?: JournalSubtype;
  voice?: VoiceAttachment;
  media?: MediaItem;
  mediaAttachments?: MediaItem[];
  milestoneCategory?: MilestoneCategory;
  pinned?: boolean;
};

export type MemoryLockConfig = {
  pinHash: string | null;
  biometricCredentialId: string | null;
  locked: boolean;
};

export type MemoriesState = {
  entries: MemoryEntry[];
  customSummaries: Record<string, string>;
  albums: string[];
  lock: MemoryLockConfig;
};

const MEM_KEY = "atlas.memories.v3";

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
        title: "Morning walk and finished logo draft",
        text: "Woke up early for a quiet walk under the purple trees before heading to the studio. Finished version 3 of the client logo and sent it over.",
        date: offsetISO(0),
        time: "08:25",
        section: "Work",
        peopleTags: [],
        mood: 5,
        location: "Nairobi",
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
        title: "Morning walk down the avenue",
        text: "Clear morning sky on the walk to work.",
        date: offsetISO(0),
        time: "07:18",
        section: "Life",
        peopleTags: [],
        mood: 5,
        location: "Nairobi",
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
        title: "30-minute morning workout completed",
        text: "Logged from Life.",
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
        title: "Attended morning class — Unit 7 practice",
        text: "50-minute class session.",
        date: offsetISO(0),
        time: "10:05",
        section: "Study",
        peopleTags: [],
        location: "Room 4",
        linkedIds: [],
      },

      /* ---- YESTERDAY ---- */
      {
        id: "m-j2",
        kind: "journal",
        journalSubtype: "reflection",
        title: "Good catch-up call with Nia",
        text: "Talked for 40 minutes about her first month at her new job. Promised to send her our Kilifi trip photos tonight.",
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
        title: "Deadline met: Sent presentation deck to client",
        text: "Completed on time.",
        date: offsetISO(-1),
        time: "16:40",
        section: "Work",
        peopleTags: [],
        linkedIds: ["m-ph3"],
      },
      {
        id: "m-ph3",
        kind: "media",
        title: "Desk setup after finishing the presentation",
        text: "Wrapped up the slides before dinner.",
        date: offsetISO(-1),
        time: "19:05",
        section: "Work",
        peopleTags: [],
        mood: 4,
        location: "Studio",
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
        title: "Call with Mum (25 mins)",
        text: "Logged from People.",
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
        title: "Paid studio rent — $420",
        text: "Logged from Work.",
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
        title: "Signed 1-year contract renewal with Delos Labs",
        text: "They renewed our design contract for another full year.",
        date: offsetISO(-4),
        time: "15:00",
        section: "Work",
        peopleTags: ["Amara Osei"],
        mood: 5,
        location: "Nairobi",
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

      /* ---- 7 DAYS AGO (VOICE NOTE + VIDEO) ---- */
      {
        id: "m-j3",
        kind: "journal",
        journalSubtype: "idea",
        title: "Voice note: Take on fewer, bigger projects next year",
        text: "Recorded on the walk home: focus on 3 main clients at a time and publish a short newsletter every two weeks.",
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
            "Next year I want to take on fewer projects at once, do deeper work on each one, and write every two weeks.",
        },
      },
      {
        id: "m-vid1",
        kind: "media",
        title: "Short video clip for the Atlas homepage",
        text: "14-second background loop test.",
        date: offsetISO(-7),
        time: "18:12",
        section: "Work",
        peopleTags: [],
        mood: 4,
        location: "Studio",
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

      /* ---- 12 DAYS AGO (COUSIN DINNER) ---- */
      {
        id: "m-ph4",
        kind: "media",
        title: "Dinner with cousin Malik and Mum",
        text: "Great evening catching up with my cousin Malik over dinner in Kilimani.",
        date: offsetISO(-12),
        time: "20:30",
        section: "People",
        peopleTags: ["Malik Mwangi", "Mum"],
        mood: 5,
        location: "Kilimani",
        starred: true,
        linkedIds: [],
        media: {
          id: "med-4",
          mediaType: "photo",
          src: "/assets/memories/family-dinner.jpg",
          album: "Events",
        },
      },

      /* ---- 19 DAYS AGO (STUDY MILESTONE + PHOTO) ---- */
      {
        id: "m-ms2",
        kind: "milestone",
        milestoneCategory: "Graduation",
        pinned: true,
        title: "Finished Cartography course with 100%",
        text: "Submitted the final map project and passed with top marks.",
        date: offsetISO(-19),
        time: "14:20",
        section: "Study",
        peopleTags: [],
        mood: 5,
        location: "Library",
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
        title: "Afternoon study session in the library",
        text: "Right after handing in the final map assignment.",
        date: offsetISO(-19),
        time: "17:10",
        section: "Study",
        peopleTags: [],
        mood: 4,
        location: "Library",
        linkedIds: ["m-ms2"],
        media: {
          id: "med-5",
          mediaType: "photo",
          src: "/assets/memories/homer-library.jpg",
          album: "Projects",
        },
      },

      /* ---- 35 DAYS AGO (KILIFI TRIP) ---- */
      {
        id: "m-ms3",
        kind: "milestone",
        milestoneCategory: "Trip",
        pinned: true,
        title: "4-day Kilifi coast trip with Nia",
        text: "Rested by the ocean for four days before the new work quarter started.",
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
        title: "Ocean view in Kilifi",
        text: "Sunny afternoon overlooking the water.",
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
        title: "First trip to Athens with Theo",
        text: "Morning visit to the Acropolis — the day we came up with the name Atlas.",
        date: priorYearSameDayISO(1),
        time: "08:40",
        section: "Life",
        peopleTags: ["Theo Kaneli"],
        mood: 5,
        location: "Athens",
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
        title: "Morning sun in Athens",
        text: "One year ago today with Theo.",
        date: priorYearSameDayISO(1),
        time: "08:45",
        section: "Life",
        peopleTags: ["Theo Kaneli"],
        mood: 5,
        location: "Athens",
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
        title: "Sent out Newsletter Issue #1",
        text: "Published our very first issue to 42 readers.",
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
let memUserId: string | null = null;
let memSaveTimer: ReturnType<typeof setTimeout> | null = null;

function memoriesCacheKey() {
  return memUserId ? `${MEM_KEY}.${memUserId}` : MEM_KEY;
}

function normalizeMemories(parsed: Partial<MemoriesState>, keepEmptyEntries = false): MemoriesState {
  const defaults = seedMemories();
  return {
    ...defaults,
    ...parsed,
    entries: Array.isArray(parsed.entries) && (keepEmptyEntries || parsed.entries.length > 0) ? parsed.entries : defaults.entries,
    albums: Array.from(new Set([...defaults.albums, ...(parsed.albums ?? [])])),
    lock: { ...defaults.lock, ...(parsed.lock ?? {}) },
  };
}

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
          promise: "Host dinner next month",
          gift: "Kenyan coffee set",
          notes: "Last caught up over dinner in Kilimani.",
        },
      ],
    }));
  }
}

async function syncMemoriesFromCloud() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const userId = authData.session?.user.id;
  if (!userId) return;
  if (memUserId !== userId) memState = seedMemories();
  memUserId = userId;

  // Use only this authenticated user's cache while loading their cloud record.
  try {
    const cached = localStorage.getItem(memoriesCacheKey());
    if (cached) memState = normalizeMemories(JSON.parse(cached) as Partial<MemoriesState>, true);
  } catch {}
  memListeners.forEach((listener) => listener());

  const cloud = await loadAtlasCloudRow();
  if (!cloud) return;
  const remote = cloud.row?.memories_state;
  if (remote && Object.keys(remote).length > 0) {
    memState = normalizeMemories(remote as Partial<MemoriesState>, true);
  } else {
    memState = memState ?? seedMemories();
    await saveAtlasMemoriesState(memState as unknown as Record<string, unknown>, memUserId);
  }
  try {
    localStorage.setItem(memoriesCacheKey(), JSON.stringify(memState));
  } catch {}
  memListeners.forEach((listener) => listener());
}

export function hydrateMemories() {
  if (memHydrated || typeof window === "undefined") return;
  memHydrated = true;
  ensureCousinInPeople();
  const cloudConfigured = Boolean(getSupabaseBrowserClient());
  if (cloudConfigured) memState = seedMemories();
  try {
    const raw = cloudConfigured ? null : localStorage.getItem(memoriesCacheKey());
    if (raw) memState = normalizeMemories(JSON.parse(raw) as Partial<MemoriesState>);
  } catch {
    memState = seedMemories();
  }
  memListeners.forEach((l) => l());
  void syncMemoriesFromCloud().catch((error) => {
    console.error("Could not sync Memories with Supabase.", error);
  });
}

function persistMemories() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(memoriesCacheKey(), JSON.stringify(memState));
    } catch {}
  }
  if (memUserId && getSupabaseBrowserClient()) {
    if (memSaveTimer) clearTimeout(memSaveTimer);
    const userId = memUserId;
    memSaveTimer = setTimeout(() => {
      void saveAtlasMemoriesState(memState as unknown as Record<string, unknown>, userId).catch((error) => {
        console.error("Could not save Memories to Supabase.", error);
      });
    }, 400);
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
/*  Mutations                                                         */
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
/*  Daily Summary (Simple One-Line Recap)                             */
/* ------------------------------------------------------------------ */

export function generateAtlasDailySummary(
  date: string,
  dayEntries: MemoryEntry[],
  customSummaries: Record<string, string>
): string {
  if (customSummaries[date]?.trim()) return customSummaries[date];
  if (!dayEntries.length) return "Quiet day — nothing logged yet.";

  const milestones = dayEntries.filter((e) => e.kind === "milestone");
  const journals = dayEntries.filter((e) => e.kind === "journal");
  const media = dayEntries.filter((e) => e.kind === "media");
  const autos = dayEntries.filter((e) => e.kind === "autolog");
  const people = Array.from(new Set(dayEntries.flatMap((e) => e.peopleTags)));

  const parts: string[] = [];
  if (milestones.length > 0) {
    parts.push(milestones[0].title);
  } else if (journals.length > 0) {
    parts.push(journals[0].title);
  }
  if (media.length > 0) {
    const vCount = media.filter((m) => m.media?.mediaType === "video").length;
    const pCount = media.length - vCount;
    const label = [
      pCount ? `${pCount} photo${pCount > 1 ? "s" : ""}` : "",
      vCount ? `${vCount} video${vCount > 1 ? "s" : ""}` : "",
    ]
      .filter(Boolean)
      .join(" and ");
    parts.push(`added ${label}`);
  }
  if (autos.length > 0) {
    parts.push(`${autos.length} activity item${autos.length > 1 ? "s" : ""}`);
  }
  if (people.length > 0) {
    parts.push(`with ${people.slice(0, 2).join(" & ")}`);
  }

  const line = parts.join(", ");
  return line ? `${line.charAt(0).toUpperCase()}${line.slice(1)}.` : "Quiet day.";
}

export function averageDayMood(dayEntries: MemoryEntry[]): number {
  const moods = dayEntries.map((e) => e.mood).filter((m): m is number => typeof m === "number" && m >= 1 && m <= 5);
  if (!moods.length) return 4;
  return Math.round(moods.reduce((a, b) => a + b, 0) / moods.length);
}

/* ------------------------------------------------------------------ */
/*  Quick Log ("spent 800 on lunch with Sam")                         */
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
            relation: "Friend",
            lastSeen: todayISO(),
            cadenceDays: 21,
            birthday: "06-15",
            promise: "—",
            gift: "—",
            notes: `Added from quick log: “${text}”`,
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
              bucket: "Work",
              client: "—",
              status: isIncome ? "sent" : "expense",
            },
            ...prev.ledger,
          ],
        }));
        filedUnder.unshift(`Work ($${amount})`);
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
              client: "—",
              status: "expense",
            },
            ...prev.ledger,
          ],
        }));
        filedUnder.unshift(`Life (${amount})`);
      }
    }
  } else if (/\b(class|lecture|studied|course|exam|assignment|read)\b/i.test(lower)) {
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
    filedUnder.unshift("Life");
  } else if (peopleTags.length > 0) {
    section = "People";
  } else {
    filedUnder.unshift("Life");
  }

  const entry = addMemoryEntry({
    kind: "autolog",
    title: text.charAt(0).toUpperCase() + text.slice(1),
    text: `Saved to ${Array.from(new Set(filedUnder)).join(" & ")}`,
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
/*  Plain-Language Search                                             */
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

  let answer: string | null = null;
  const isQuestion = /^(when|where|what|who|how)\b/i.test(q) || q.endsWith("?");

  if (matchedPeople.length > 0) {
    const p = matchedPeople[0];
    const latestEntry = [...results].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latestEntry) {
      const ago = daysSince(latestEntry.date);
      answer = `You last saw ${p.name} (${p.relation}) ${
        ago === 0 ? "today" : `${ago} days ago`
      } on ${prettyDate(latestEntry.date)}${latestEntry.location ? ` in ${latestEntry.location}` : ""}.`;
    } else {
      const ago = daysSince(p.lastSeen);
      answer = `You last saw ${p.name} (${p.relation}) ${ago} days ago (${prettyDate(p.lastSeen)}).`;
    }
  } else if (isQuestion && results.length > 0) {
    const top = results[0];
    const ago = daysSince(top.date);
    answer = `${prettyDate(top.date)} (${ago === 0 ? "today" : `${ago} days ago`}) — ${top.title}.`;
  } else if (isQuestion && results.length === 0) {
    answer = "Nothing found yet.";
  }

  return { answer, results };
}

/* ------------------------------------------------------------------ */
/*  PIN & Biometric Lock                                              */
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
    return { ok: false, error: "Biometrics are not supported on this device. Please use a PIN." };
  }
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Atlas Memories" },
        user: {
          id: userId,
          name: "user@atlas.local",
          displayName: "Atlas User",
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

    if (!cred) return { ok: false, error: "Biometric setup was cancelled." };
    const idB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(cred.rawId))));
    return { ok: true, credentialId: idB64 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not set up biometrics here. Please use a PIN.",
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
/*  Export Whole Timeline                                             */
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
    triggerDownload(`memories-${stamp}.json`, payload, "application/json");
    return;
  }

  const byDay = new Map<string, MemoryEntry[]>();
  for (const e of sorted) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }

  const lines: string[] = [
    `# Memories`,
    `Exported on ${prettyDate(stamp)} (${sorted.length} items)`,
    ``,
  ];

  byDay.forEach((dayEntries, date) => {
    const summary = generateAtlasDailySummary(date, dayEntries, state.customSummaries);
    const mood = averageDayMood(dayEntries);
    lines.push(`## ${prettyDate(date)} · Mood ${mood}/5`);
    lines.push(`Summary: ${summary}`);
    lines.push(``);
    for (const e of dayEntries) {
      const meta = [
        e.time,
        e.section ?? "",
        e.peopleTags.length ? `with ${e.peopleTags.join(", ")}` : "",
        e.location ?? "",
        e.starred ? "Starred" : "",
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`### ${e.title}`);
      if (meta) lines.push(`*${meta}*`);
      if (e.text) lines.push(``, e.text);
      if (e.media) lines.push(``, `File (${e.media.album}): ${e.media.src}`);
      lines.push(``);
    }
  });

  triggerDownload(`memories-${stamp}.md`, lines.join("\n"), "text/markdown");
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
