"use client";

import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Atlas — a tiny observable store. Everything is local-first: the    */
/*  whole world lives in localStorage under a single key.             */
/* ------------------------------------------------------------------ */

export type Session = { name: string; email: string; since: string };

export type Project = {
  id: string;
  name: string;
  client: string;
  rate: number;
  hours: number;
  status: "active" | "paused" | "done";
  tasks: { id: string; title: string; due: string; done: boolean }[];
};

export type Ledger = {
  id: string;
  label: string;
  amount: number;
  kind: "income" | "expense";
  date: string;
  bucket: string;
};

export type Course = {
  id: string;
  title: string;
  code: string;
  progress: number;
  status: "active" | "complete" | "planned";
  next: string;
};

export type Slot = { id: string; day: string; time: string; title: string; place: string };

export type Assignment = {
  id: string;
  title: string;
  course: string;
  due: string;
  status: "open" | "submitted" | "graded";
  weight: number;
};

export type Skill = { id: string; name: string; hours: number; sessions: number; status: string };

export type Person = {
  id: string;
  name: string;
  relation: string;
  lastSeen: string;
  cadenceDays: number;
  birthday: string;
  promise: string;
  gift: string;
  notes: string;
};

export type Habit = { id: string; name: string; streak: number; doneToday: boolean; glyph: string };

export type JournalEntry = {
  id: string;
  date: string;
  title: string;
  text: string;
  mood: number;
  kind: "journal" | "voice" | "photo" | "milestone" | "log";
  pillar?: string;
};

export type AtlasState = {
  session: Session | null;
  projects: Project[];
  ledger: Ledger[];
  courses: Course[];
  timetable: Slot[];
  assignments: Assignment[];
  skills: Skill[];
  people: Person[];
  habits: Habit[];
  health: { sleep: number; workouts: number; water: number; meals: number };
  money: { spend: number; savings: number; subscriptions: { id: string; name: string; cost: number; renew: string }[] };
  mood: { day: string; score: number }[];
  journal: JournalEntry[];
};

const KEY = "atlas.world.v1";
const SESSION_KEY = "atlas.session.v1";

export const todayISO = () => new Date().toISOString().slice(0, 10);

const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const seed = (): AtlasState => ({
  session: null,
  projects: [
    {
      id: "p1",
      name: "Marble & Mortar identity",
      client: "Kavala Studio",
      rate: 65,
      hours: 42.5,
      status: "active",
      tasks: [
        { id: "t1", title: "Wordmark refinement v3", due: dayOffset(2), done: false },
        { id: "t2", title: "Type specimen sheet", due: dayOffset(5), done: false },
        { id: "t3", title: "Client review deck", due: dayOffset(-1), done: true },
      ],
    },
    {
      id: "p2",
      name: "Fieldnotes — newsletter build",
      client: "Own venture",
      rate: 0,
      hours: 18,
      status: "active",
      tasks: [
        { id: "t4", title: "Substack → site sync", due: dayOffset(4), done: false },
        { id: "t5", title: "Issue #12 layout", due: dayOffset(9), done: false },
      ],
    },
    {
      id: "p3",
      name: "Aegean maps — cartography UI",
      client: "Delos Labs",
      rate: 80,
      hours: 61,
      status: "paused",
      tasks: [{ id: "t6", title: "Waiting on dataset access", due: dayOffset(12), done: false }],
    },
  ],
  ledger: [
    { id: "l1", label: "Kavala Studio — milestone 2", amount: 2400, kind: "income", date: dayOffset(-8), bucket: "Client" },
    { id: "l2", label: "Delos Labs — retainer", amount: 1600, kind: "income", date: dayOffset(-15), bucket: "Client" },
    { id: "l3", label: "Adobe CC + Figma", amount: 78, kind: "expense", date: dayOffset(-6), bucket: "Software" },
    { id: "l4", label: "Studio rent", amount: 420, kind: "expense", date: dayOffset(-3), bucket: "Space" },
    { id: "l5", label: "Domain + hosting", amount: 34, kind: "expense", date: dayOffset(-11), bucket: "Software" },
  ],
  courses: [
    { id: "c1", title: "Classical Greek — Level II", code: "GRK 204", progress: 62, status: "active", next: "Unit 7 · aorist tense" },
    { id: "c2", title: "Design Systems", code: "DES 310", progress: 41, status: "active", next: "Tokens & theming" },
    { id: "c3", title: "Statistics for Research", code: "STA 118", progress: 88, status: "active", next: "Regression review" },
    { id: "c4", title: "Cartography & Place", code: "GEO 260", progress: 100, status: "complete", next: "—" },
  ],
  timetable: [
    { id: "s1", day: "Mon", time: "09:00", title: "Greek II", place: "Room 4 · Homer Hall" },
    { id: "s2", day: "Mon", time: "14:00", title: "Design Systems", place: "Studio B" },
    { id: "s3", day: "Tue", time: "11:00", title: "Statistics", place: "Lab 2" },
    { id: "s4", day: "Wed", time: "09:00", title: "Greek II", place: "Room 4 · Homer Hall" },
    { id: "s5", day: "Thu", time: "16:00", title: "Cartography tutorial", place: "Map room" },
    { id: "s6", day: "Fri", time: "10:00", title: "Critique circle", place: "Studio A" },
  ],
  assignments: [
    { id: "a1", title: "Translation: Odyssey IX, 1–120", course: "GRK 204", due: dayOffset(3), status: "open", weight: 15 },
    { id: "a2", title: "Token architecture brief", course: "DES 310", due: dayOffset(6), status: "open", weight: 25 },
    { id: "a3", title: "Problem set 5", course: "STA 118", due: dayOffset(1), status: "submitted", weight: 10 },
    { id: "a4", title: "Field map: my neighbourhood", course: "GEO 260", due: dayOffset(-9), status: "graded", weight: 30 },
    { id: "a5", title: "Mid-term exam", course: "GRK 204", due: dayOffset(14), status: "open", weight: 30 },
  ],
  skills: [
    { id: "k1", name: "Ancient Greek translation", hours: 34, sessions: 22, status: "Compounding" },
    { id: "k2", name: "Type design", hours: 19, sessions: 11, status: "Practising" },
    { id: "k3", name: "Public speaking", hours: 6, sessions: 4, status: "Beginner" },
  ],
  people: [
    {
      id: "pe1",
      name: "Nia Mwangi",
      relation: "Sister",
      lastSeen: dayOffset(-35),
      cadenceDays: 14,
      birthday: "03-19",
      promise: "Send the photos from Kilifi",
      gift: "Fountain pen, brass nib",
      notes: "Started a new job at the studio. Ask how the first month went.",
    },
    {
      id: "pe2",
      name: "Theo Kaneli",
      relation: "Closest friend",
      lastSeen: dayOffset(-9),
      cadenceDays: 21,
      birthday: "07-02",
      promise: "Book the Athens trip",
      gift: "First-edition Cavafy",
      notes: "Reading the same book — compare notes at the end.",
    },
    {
      id: "pe3",
      name: "Mum",
      relation: "Family",
      lastSeen: dayOffset(-3),
      cadenceDays: 7,
      birthday: "11-28",
      promise: "Fix the kitchen shelf",
      gift: "Olive-wood board",
      notes: "Anniversary of the move: 12 Nov. Call.",
    },
    {
      id: "pe4",
      name: "Amara Osei",
      relation: "Mentor",
      lastSeen: dayOffset(-52),
      cadenceDays: 30,
      birthday: "01-14",
      promise: "Share the portfolio draft",
      gift: "—",
      notes: "Offered to introduce me to the Delos team.",
    },
  ],
  habits: [
    { id: "h1", name: "Morning walk", streak: 12, doneToday: true, glyph: "footsteps" },
    { id: "h2", name: "Read 20 pages", streak: 6, doneToday: false, glyph: "book" },
    { id: "h3", name: "No screens after 22:00", streak: 3, doneToday: false, glyph: "moon" },
    { id: "h4", name: "Greek drills", streak: 21, doneToday: true, glyph: "scroll" },
  ],
  health: { sleep: 7.2, workouts: 4, water: 5, meals: 3 },
  money: {
    spend: 1240,
    savings: 8600,
    subscriptions: [
      { id: "s1", name: "Figma", cost: 15, renew: "12 Nov" },
      { id: "s2", name: "Spotify", cost: 11, renew: "18 Nov" },
      { id: "s3", name: "iCloud", cost: 3, renew: "02 Nov" },
      { id: "s4", name: "Gym", cost: 42, renew: "01 Dec" },
    ],
  },
  mood: [
    { day: "Mon", score: 4 },
    { day: "Tue", score: 3 },
    { day: "Wed", score: 4 },
    { day: "Thu", score: 5 },
    { day: "Fri", score: 3 },
    { day: "Sat", score: 4 },
    { day: "Sun", score: 4 },
  ],
  journal: [
    {
      id: "j1",
      date: dayOffset(0),
      title: "Held the morning",
      text: "Woke before the alarm. Walked the long way to the studio past the jacaranda. Finished the wordmark and it finally looks like it has weight — like carved stone rather than drawn ink.",
      mood: 4,
      kind: "journal",
    },
    {
      id: "j2",
      date: dayOffset(-1),
      title: "A call with Nia",
      text: "Forty minutes on the phone. She is tired but good. I promised the Kilifi photos and I mean to keep it.",
      mood: 3,
      kind: "journal",
      pillar: "People",
    },
    {
      id: "j3",
      date: dayOffset(-4),
      title: "Milestone — first retainer renewed",
      text: "Delos renewed without being asked. Twelve months of work now has a floor under it.",
      mood: 5,
      kind: "milestone",
      pillar: "Work",
    },
    {
      id: "j4",
      date: dayOffset(-7),
      title: "Voice note, walking home",
      text: "Thinking about what I actually want the studio to be in two years. Smaller, slower, better. Fewer clients, deeper work.",
      mood: 4,
      kind: "voice",
    },
  ],
});

/* ------------------------------ storage ------------------------------ */

let state: AtlasState = seed();
const listeners = new Set<() => void>();
let hydrated = false;

function read(): AtlasState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as AtlasState;
    return { ...seed(), ...parsed };
  } catch {
    return seed();
  }
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = read();
  const s = localStorage.getItem(SESSION_KEY);
  if (s) {
    try {
      state.session = JSON.parse(s);
    } catch {}
  }
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function setState(patch: Partial<AtlasState> | ((s: AtlasState) => Partial<AtlasState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }
  listeners.forEach((l) => l());
}

export function useAtlas() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    hydrate();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

/* ------------------------------ session ------------------------------ */

export function signIn(email: string, password: string): { ok: boolean; error?: string } {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That is not a valid email address." };
  if (password.length < 4) return { ok: false, error: "The password is too short." };
  const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const session: Session = { name, email, since: todayISO() };
  if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setState({ session });
  return { ok: true };
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
  setState({ session: null });
}

/* ------------------------------ helpers ------------------------------ */

export function daysSince(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - then) / 86400000));
}

export function prettyDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function relativeDue(iso: string) {
  const diff = Math.round((new Date(iso).getTime() - new Date(todayISO()).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `in ${diff}d`;
}

export function addJournal(entry: Omit<JournalEntry, "id">) {
  setState((s) => ({ journal: [{ ...entry, id: `j${Date.now()}` }, ...s.journal] }));
}

export function toggleTask(projectId: string, taskId: string) {
  setState((s) => ({
    projects: s.projects.map((p) =>
      p.id !== projectId
        ? p
        : { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
    ),
  }));
}

export function toggleHabit(id: string) {
  setState((s) => ({
    habits: s.habits.map((h) =>
      h.id === id
        ? { ...h, doneToday: !h.doneToday, streak: h.doneToday ? Math.max(0, h.streak - 1) : h.streak + 1 }
        : h
    ),
  }));
}

export function setMoodToday(score: number) {
  setState((s) => {
    const day = new Date().toLocaleDateString("en-GB", { weekday: "short" });
    return { mood: s.mood.map((m) => (m.day === day ? { ...m, score } : m)) };
  });
}

export function touchPerson(id: string) {
  setState((s) => ({
    people: s.people.map((p) => (p.id === id ? { ...p, lastSeen: todayISO() } : p)),
  }));
}
