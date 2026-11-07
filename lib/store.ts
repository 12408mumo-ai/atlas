"use client";

import { useEffect, useState } from "react";
import {
  getSupabaseBrowserClient,
  loadAtlasCloudRow,
  saveAtlasWorldState,
} from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Atlas — a tiny observable store. Everything is local-first: the    */
/*  whole world lives in localStorage under a single key.             */
/* ------------------------------------------------------------------ */

export type Session = { name: string; email: string; since: string; userId?: string };

export type Project = {
  id: string;
  name: string;
  client: string;
  projectType: "client" | "own product" | "side tool";
  rate: number;
  hours: number;
  status: "active" | "paused" | "done";
  deadline: string;
  notes: string;
  tasks: { id: string; title: string; due: string; done: boolean }[];
};

export type Ledger = {
  id: string;
  label: string;
  amount: number;
  kind: "income" | "expense";
  date: string;
  bucket: string;
  client: string;
  status: "sent" | "paid" | "expense";
};

export type Course = {
  id: string;
  title: string;
  code: string;
  progress: number;
  status: "active" | "complete" | "planned";
  next: string;
  subjectType: "school" | "self-learning";
  credits: number;
  notes: string;
};

export type HoursLog = { id: string; projectId: string; date: string; hours: number };

export type StudySession = { id: string; subject: string; date: string; durationMin: number };

export type Slot = {
  id: string;
  day: string;
  time: string;
  title: string;
  place: string;
  lecturer: string;
};

export type Assignment = {
  id: string;
  title: string;
  course: string;
  due: string;
  status: "open" | "submitted" | "graded";
  weight: number;
  kind: "assignment" | "CAT" | "exam" | "project";
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

export type Plan = {
  id: string;
  title: string;
  created: string;
  byAtlas: boolean;
  steps: { id: string; text: string; done: boolean }[];
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
  hoursLogs: HoursLog[];
  studySessions: StudySession[];
  health: { sleep: number; workouts: number; water: number; meals: number };
  money: { spend: number; savings: number; subscriptions: { id: string; name: string; cost: number; renew: string }[] };
  mood: { day: string; score: number }[];
  journal: JournalEntry[];
  plans: Plan[];
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
      projectType: "client",
      rate: 65,
      hours: 42.5,
      status: "active",
      deadline: dayOffset(21),
      notes: "Wordmark refinement and the type specimen. Client review deck already sent.",
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
      projectType: "own product",
      rate: 0,
      hours: 18,
      status: "active",
      deadline: "",
      notes: "Own newsletter. Substack to site sync plus one issue a month.",
      tasks: [
        { id: "t4", title: "Substack → site sync", due: dayOffset(4), done: false },
        { id: "t5", title: "Issue #12 layout", due: dayOffset(9), done: false },
      ],
    },
    {
      id: "p3",
      name: "Aegean maps — cartography UI",
      client: "Delos Labs",
      projectType: "client",
      rate: 80,
      hours: 61,
      status: "paused",
      deadline: "",
      notes: "Waiting on dataset access from Delos before resuming.",
      tasks: [{ id: "t6", title: "Waiting on dataset access", due: dayOffset(12), done: false }],
    },
    {
      id: "p4",
      name: "Atlas helper — time tracker",
      client: "Own venture",
      projectType: "side tool",
      rate: 0,
      hours: 9,
      status: "active",
      deadline: "",
      notes: "A small personal tool for logging hours. No client, just useful.",
      tasks: [],
    },
  ],
  ledger: [
    { id: "l1", label: "Kavala Studio — milestone 2", amount: 2400, kind: "income", date: dayOffset(-8), bucket: "Client", client: "Kavala Studio", status: "paid" },
    { id: "l2", label: "Delos Labs — retainer", amount: 1600, kind: "income", date: dayOffset(-15), bucket: "Client", client: "Delos Labs", status: "sent" },
    { id: "l3", label: "Adobe CC + Figma", amount: 78, kind: "expense", date: dayOffset(-6), bucket: "Software", client: "—", status: "expense" },
    { id: "l4", label: "Studio rent", amount: 420, kind: "expense", date: dayOffset(-3), bucket: "Space", client: "—", status: "expense" },
    { id: "l5", label: "Domain + hosting", amount: 34, kind: "expense", date: dayOffset(-11), bucket: "Software", client: "—", status: "expense" },
  ],
  courses: [
    { id: "c1", title: "Classical Greek — Level II", code: "GRK 204", progress: 62, status: "active", next: "Unit 7 · aorist tense", subjectType: "school", credits: 3, notes: "Aorist tense next. Reads Odyssey IX aloud in the weekly sessions." },
    { id: "c2", title: "Design Systems", code: "DES 310", progress: 41, status: "active", next: "Tokens & theming", subjectType: "school", credits: 4, notes: "Tokens and theming module in progress." },
    { id: "c3", title: "Statistics for Research", code: "STA 118", progress: 88, status: "active", next: "Regression review", subjectType: "school", credits: 3, notes: "Regression review before the midterm." },
    { id: "c4", title: "Cartography & Place", code: "GEO 260", progress: 100, status: "complete", next: "—", subjectType: "school", credits: 3, notes: "Completed last term. Field map project graded." },
    { id: "c5", title: "Type design — self-taught", code: "", progress: 35, status: "active", next: "Lowercase g", subjectType: "self-learning", credits: 0, notes: "Lowercase g and optical spacing. Practising daily." },
  ],
  timetable: [
    { id: "s1", day: "Mon", time: "09:00", title: "Greek II", place: "Room 4 · Homer Hall", lecturer: "Dr. Achieng" },
    { id: "s2", day: "Mon", time: "14:00", title: "Design Systems", place: "Studio B", lecturer: "Prof. Lindqvist" },
    { id: "s3", day: "Tue", time: "11:00", title: "Statistics", place: "Lab 2", lecturer: "Dr. Otieno" },
    { id: "s4", day: "Wed", time: "09:00", title: "Greek II", place: "Room 4 · Homer Hall", lecturer: "Dr. Achieng" },
    { id: "s5", day: "Thu", time: "16:00", title: "Cartography tutorial", place: "Map room", lecturer: "Prof. Lindqvist" },
    { id: "s6", day: "Fri", time: "10:00", title: "Critique circle", place: "Studio A", lecturer: "Studio tutors" },
  ],
  assignments: [
    { id: "a1", title: "Translation: Odyssey IX, 1–120", course: "GRK 204", due: dayOffset(3), status: "open", weight: 15, kind: "assignment" },
    { id: "a2", title: "Token architecture brief", course: "DES 310", due: dayOffset(6), status: "open", weight: 25, kind: "assignment" },
    { id: "a3", title: "Problem set 5", course: "STA 118", due: dayOffset(1), status: "submitted", weight: 10, kind: "assignment" },
    { id: "a4", title: "Field map: my neighbourhood", course: "GEO 260", due: dayOffset(-9), status: "graded", weight: 30, kind: "project" },
    { id: "a5", title: "Mid-term exam", course: "GRK 204", due: dayOffset(14), status: "open", weight: 30, kind: "exam" },
    { id: "a6", title: "CAT — Greek syntax quiz", course: "GRK 204", due: dayOffset(11), status: "open", weight: 10, kind: "CAT" },
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
  hoursLogs: [
    { id: "hl1", projectId: "p1", date: dayOffset(-1), hours: 6 },
    { id: "hl2", projectId: "p1", date: dayOffset(-2), hours: 4.5 },
    { id: "hl3", projectId: "p3", date: dayOffset(-4), hours: 3 },
    { id: "hl4", projectId: "p2", date: dayOffset(-3), hours: 2.5 },
  ],
  studySessions: [
    { id: "ss1", subject: "Greek II", date: dayOffset(-1), durationMin: 50 },
    { id: "ss2", subject: "Statistics", date: dayOffset(-2), durationMin: 40 },
    { id: "ss3", subject: "Type design", date: dayOffset(-3), durationMin: 75 },
    { id: "ss4", subject: "Greek II", date: dayOffset(-5), durationMin: 60 },
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
  plans: [
    {
      id: "pl1",
      title: "Finish the Kavala identity by the full moon",
      created: dayOffset(-2),
      byAtlas: false,
      steps: [
        { id: "s1", text: "Ship wordmark refinement v3 to the client", done: false },
        { id: "s2", text: "Build the type specimen sheet", done: false },
        { id: "s3", text: "Book the review call with Kavala", done: false },
      ],
    },
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
let activeUserId: string | null = null;
let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;

function localStateKey() {
  return activeUserId ? `${KEY}.${activeUserId}` : KEY;
}

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

function persistLocalState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(localStateKey(), JSON.stringify(state));
  } catch {}
}

function worldStateForCloud(): Record<string, unknown> {
  const { session: _session, ...worldState } = state;
  return worldState as unknown as Record<string, unknown>;
}

function scheduleCloudSave() {
  if (!activeUserId || !getSupabaseBrowserClient()) return;
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  const userId = activeUserId;
  cloudSaveTimer = setTimeout(() => {
    void saveAtlasWorldState(worldStateForCloud(), userId).catch((error) => {
      console.error("Could not save Atlas data to Supabase.", error);
    });
  }, 400);
}

export async function syncWorldFromCloud() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const user = authData.session?.user;
  if (!user) return;

  if (activeUserId !== user.id) state = seed();
  activeUserId = user.id;
  const session: Session = {
    name: String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Atlas user"),
    email: user.email ?? "",
    since: user.created_at?.slice(0, 10) ?? todayISO(),
    userId: user.id,
  };

  // Load only this authenticated user's local cache while the network request runs.
  try {
    const cached = localStorage.getItem(localStateKey());
    if (cached) state = { ...seed(), ...(JSON.parse(cached) as Partial<AtlasState>), session };
  } catch {}
  listeners.forEach((listener) => listener());

  const cloud = await loadAtlasCloudRow();
  if (!cloud) return;
  if (cloud.row?.world_state && Object.keys(cloud.row.world_state).length > 0) {
    state = { ...seed(), ...cloud.row.world_state, session } as AtlasState;
  } else {
    // Never copy another signed-in user's anonymous browser cache into a new account.
    state = { ...state, session };
    await saveAtlasWorldState(worldStateForCloud(), activeUserId);
  }
  persistLocalState();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
  listeners.forEach((l) => l());
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const cloudConfigured = Boolean(getSupabaseBrowserClient());
  state = cloudConfigured ? seed() : read();
  if (!cloudConfigured) {
    const s = localStorage.getItem(SESSION_KEY);
    if (s) {
      try {
        state.session = JSON.parse(s);
      } catch {}
    }
  }
  listeners.forEach((l) => l());
  void syncWorldFromCloud().catch((error) => {
    console.error("Could not load Atlas data from Supabase.", error);
  });
}

export function getState() {
  return state;
}

export function setState(patch: Partial<AtlasState> | ((s: AtlasState) => Partial<AtlasState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  persistLocalState();
  scheduleCloudSave();
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

/**
 * Sign in without a password.
 *
 * Supabase sends a one-time link to the email address. Clicking the link
 * signs you in. Nothing to remember, nothing to type.
 */
export async function sendMagicLink(
  email: string,
  name = ""
): Promise<{ ok: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured. Add the Supabase URL and anon key to your environment." };
  }

  const redirectTo =
    typeof window !== "undefined" ? window.location.origin + "/hub" : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: redirectTo,
      data: name.trim() ? { name: name.trim() } : undefined,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!password) return { ok: false, error: "Enter your password." };

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured. Add the Supabase URL and anon key to your environment." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) return { ok: false, error: error.message };
  try {
    await syncWorldFromCloud();
  } catch (syncError) {
    return {
      ok: false,
      error: syncError instanceof Error ? syncError.message : "Signed in, but could not load your Atlas data.",
    };
  }
  return { ok: true };
}

export async function createAccount(
  email: string,
  password: string,
  name = ""
): Promise<{ ok: boolean; needsEmailConfirmation?: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) return { ok: false, error: "Use a password with at least 8 characters." };

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured. Add the Supabase URL and anon key to your environment." };
  }
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { name: name.trim() || normalizedEmail.split("@")[0] } },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.session) return { ok: true, needsEmailConfirmation: true };
  try {
    await syncWorldFromCloud();
  } catch (syncError) {
    return {
      ok: false,
      error: syncError instanceof Error ? syncError.message : "Account created, but could not load Atlas data.",
    };
  }
  return { ok: true, needsEmailConfirmation: false };
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

export async function clearSession() {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Could not sign out of Supabase.", error);
  }
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  activeUserId = null;
  state = { ...state, session: null };
  listeners.forEach((listener) => listener());
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

export function addProject(name: string, projectType: Project["projectType"]) {
  setState((s) => ({
    projects: [
      ...s.projects,
      {
        id: `p${Date.now()}`,
        name: name.trim(),
        client: projectType === "client" ? "New client" : "Own venture",
        projectType,
        rate: 0,
        hours: 0,
        status: "active",
        deadline: "",
        notes: "",
        tasks: [],
      },
    ],
  }));
}

export function addHoursLog(projectId: string, hours: number, date?: string) {
  setState((s) => ({
    hoursLogs: [
      { id: `hl${Date.now()}`, projectId, date: date || todayISO(), hours },
      ...s.hoursLogs,
    ],
  }));
}

export function addStudySession(subject: string, durationMin: number, date?: string) {
  setState((s) => ({
    studySessions: [
      { id: `ss${Date.now()}`, subject: subject.trim(), date: date || todayISO(), durationMin },
      ...s.studySessions,
    ],
  }));
}

export function addInvoice(client: string, amount: number) {
  setState((s) => ({
    ledger: [
      {
        id: `l${Date.now()}`,
        label: `${client} — invoice`,
        amount,
        kind: "income",
        date: todayISO(),
        bucket: "Client",
        client,
        status: "sent",
      },
      ...s.ledger,
    ],
  }));
}

export function addDeadline(
  title: string,
  kind: Assignment["kind"],
  subject: string,
  due: string
) {
  setState((s) => ({
    assignments: [
      {
        id: `a${Date.now()}`,
        title: title.trim(),
        course: subject.trim() || "—",
        due,
        status: "open",
        weight: 10,
        kind,
      },
      ...s.assignments,
    ],
  }));
}

export function addSubject(
  name: string,
  subjectType: Course["subjectType"],
  code: string,
  credits: number,
  notes: string
) {
  setState((s) => ({
    courses: [
      ...s.courses,
      {
        id: `c${Date.now()}`,
        title: name.trim(),
        code: code.trim(),
        progress: 0,
        status: "active",
        next: "—",
        subjectType,
        credits,
        notes: notes.trim(),
      },
    ],
  }));
}

export function toggleDeadline(id: string) {
  setState((s) => ({
    assignments: s.assignments.map((a) =>
      a.id === id
        ? { ...a, status: a.status === "open" ? "submitted" : a.status === "submitted" ? "open" : a.status }
        : a
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

export function addPerson(name: string, relation: string) {
  setState((s) => ({
    people: [
      ...s.people,
      {
        id: `pe${Date.now()}`,
        name: name.trim(),
        relation: relation.trim() || "Friend",
        lastSeen: todayISO(),
        cadenceDays: 21,
        birthday: "",
        promise: "—",
        gift: "—",
        notes: "",
      },
    ],
  }));
}

export function updatePerson(id: string, patch: Partial<Person>) {
  setState((s) => ({
    people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
}

/* ------------------------------ plans ------------------------------ */

export function addPlan(title: string, steps: string[], byAtlas = true) {
  setState((s) => ({
    plans: [
      {
        id: `pl${Date.now()}`,
        title,
        created: todayISO(),
        byAtlas,
        steps: steps.map((text, i) => ({ id: `st${Date.now()}${i}`, text, done: false })),
      },
      ...s.plans,
    ],
  }));
}

export function togglePlanStep(planId: string, stepId: string) {
  setState((s) => ({
    plans: s.plans.map((p) =>
      p.id !== planId
        ? p
        : { ...p, steps: p.steps.map((st) => (st.id === stepId ? { ...st, done: !st.done } : st)) }
    ),
  }));
}

export function removePlan(id: string) {
  setState((s) => ({ plans: s.plans.filter((p) => p.id !== id) }));
}
