"use client";

import { getState, setState, todayISO } from "./store";
import { addMemoryEntry, getMemoriesState, nowHHMM, setMemories, type MemoryEntry } from "./memories";

export type AtlasAction = { type: string; collection?: string; id?: string; parentId?: string; fields?: Record<string, unknown> };
export type ActionResult = { label: string; ok: boolean };

type FieldType = "string" | "number" | "boolean" | "strings" | readonly string[];
type Schema = { fields: Record<string, FieldType>; required: string[]; defaults: Record<string, unknown> };
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const schemas: Record<string, Schema> = {
  lifeVision: { fields: { category: ["goals", "places", "experiences", "becoming"], title: "string", notes: "string", done: "boolean" }, required: ["category", "title"], defaults: { notes: "", done: false } },
  projects: { fields: { name: "string", client: "string", projectType: ["client", "own product", "side tool"], rate: "number", hours: "number", status: ["active", "paused", "done"], deadline: "string", notes: "string" }, required: ["name"], defaults: { client: "", projectType: "client", rate: 0, hours: 0, status: "active", deadline: "", notes: "", tasks: [] } },
  tasks: { fields: { title: "string", due: "string", done: "boolean" }, required: ["title"], defaults: { due: "", done: false } },
  ledger: { fields: { label: "string", amount: "number", kind: ["income", "expense"], date: "string", bucket: "string", client: "string", status: ["sent", "paid", "expense"] }, required: ["label", "amount", "kind"], defaults: { date: todayISO(), bucket: "", client: "", status: "expense" } },
  courses: { fields: { title: "string", code: "string", progress: "number", status: ["active", "complete", "planned"], next: "string", subjectType: ["school", "self-learning"], credits: "number", notes: "string" }, required: ["title"], defaults: { code: "", progress: 0, status: "active", next: "", subjectType: "school", credits: 0, notes: "" } },
  timetable: { fields: { day: days, time: "string", title: "string", place: "string", lecturer: "string" }, required: ["title", "day", "time"], defaults: { place: "", lecturer: "" } },
  assignments: { fields: { title: "string", course: "string", due: "string", status: ["open", "submitted", "graded"], weight: "number", kind: ["assignment", "CAT", "exam", "project"] }, required: ["title", "due"], defaults: { course: "", status: "open", weight: 0, kind: "assignment" } },
  skills: { fields: { name: "string", hours: "number", sessions: "number", status: "string" }, required: ["name"], defaults: { hours: 0, sessions: 0, status: "" } },
  people: { fields: { name: "string", relation: "string", lastSeen: "string", cadenceDays: "number", birthday: "string", promise: "string", gift: "string", notes: "string" }, required: ["name"], defaults: { relation: "", lastSeen: todayISO(), cadenceDays: 30, birthday: "", promise: "", gift: "", notes: "" } },
  habits: { fields: { name: "string", streak: "number", doneToday: "boolean", glyph: "string" }, required: ["name"], defaults: { streak: 0, doneToday: false, glyph: "scroll" } },
  hoursLogs: { fields: { projectId: "string", date: "string", hours: "number" }, required: ["projectId", "hours"], defaults: { date: todayISO() } },
  studySessions: { fields: { subject: "string", date: "string", durationMin: "number" }, required: ["subject", "durationMin"], defaults: { date: todayISO() } },
  plans: { fields: { title: "string", created: "string", byAtlas: "boolean", steps: "strings" }, required: ["title"], defaults: { created: todayISO(), byAtlas: true, steps: [] } },
  planSteps: { fields: { text: "string", done: "boolean" }, required: ["text"], defaults: { done: false } },
  journal: { fields: { title: "string", text: "string", date: "string", mood: "number", kind: ["journal", "voice", "photo", "milestone", "log"], pillar: "string" }, required: ["title"], defaults: { text: "", date: todayISO(), mood: 4, kind: "journal" } },
  subscriptions: { fields: { name: "string", cost: "number", renew: "string" }, required: ["name", "cost"], defaults: { renew: "" } },
  memories: { fields: { kind: ["journal", "milestone", "autolog"], title: "string", text: "string", date: "string", time: "string", section: ["Work", "Study", "People", "Life"], mood: "number", location: "string", starred: "boolean", journalSubtype: ["daily", "reflection", "idea"], milestoneCategory: ["Achievement", "Launch", "Graduation", "Trip", "First"], pinned: "boolean" }, required: ["title"], defaults: {} },
};

const protectedKeys = new Set(["__proto__", "constructor", "prototype"]);
const uid = () => `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

function validFields(fields: unknown, schema: Schema, creating: boolean): string | null {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "Fields must be an object.";
  const input = fields as Record<string, unknown>;
  if (!Object.keys(input).length) return "No fields supplied.";
  for (const [key, value] of Object.entries(input)) {
    const rule = Object.prototype.hasOwnProperty.call(schema.fields, key) ? schema.fields[key] : undefined;
    if (!rule || protectedKeys.has(key)) return `Field “${key}” is not allowed.`;
    if (rule === "strings") {
      if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== "string" || !item.trim() || item.length > 500)) return `Invalid value for “${key}”.`;
    } else if (Array.isArray(rule) ? !rule.includes(value as string) : typeof value !== rule) return `Invalid value for “${key}”.`;
    if (typeof value === "string" && (value.length > 4000 || /^(data:|blob:)/i.test(value))) return `Invalid value for “${key}”.`;
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0 || ((key === "mood" || key === "score") && (value < 1 || value > 5)) || ((key === "progress" || key === "weight") && value > 100))) return `Invalid value for “${key}”.`;
    if ((key === "date" || key === "due" || key === "deadline" || key === "lastSeen" || key === "created") && typeof value === "string" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return `Use YYYY-MM-DD for “${key}”.`;
  }
  if (creating) for (const key of schema.required) if (!(key in input) || (typeof input[key] === "string" && !(input[key] as string).trim())) return `Missing required field “${key}”.`;
  return null;
}

/** Text and metadata only: no credentials, lock configuration, or media bytes. */
export function atlasDataSnapshot(): string {
  const memories = getMemoriesState();
  const { session, journal, ...world } = getState();
  const entries = memories.lock.locked ? undefined : memories.entries.map(({ media, mediaAttachments, voice, ...entry }) => ({
    ...entry,
    ...(media ? { media: { id: media.id, mediaType: media.mediaType, album: media.album, duration: media.duration } } : {}),
    ...(mediaAttachments ? { mediaAttachments: mediaAttachments.map(({ id, mediaType, album, duration }) => ({ id, mediaType, album, duration })) } : {}),
    ...(voice ? { voice: { durationSec: voice.durationSec, transcript: voice.transcript } } : {}),
  }));
  return JSON.stringify({ today: todayISO(), user: { name: session?.name ?? "Guest" }, world: { ...world, lifeVision: world.lifeVision.map(({ image, ...entry }) => ({ ...entry, ...(image ? { hasImage: true } : {}) })), ...(memories.lock.locked ? {} : { journal }) }, memories: memories.lock.locked ? { locked: true } : { locked: false, entries, albums: memories.albums, customSummaries: memories.customSummaries } });
}

/** Execute only a single explicitly approved, schema-checked action. */
export function executeAtlasAction(action: AtlasAction): ActionResult {
  const fail = (reason: string) => ({ label: reason, ok: false });
  const ok = (message: string) => ({ label: message, ok: true });
  if (!action || typeof action !== "object" || !["create", "update", "delete"].includes(action.type)) return fail("Unsupported action.");
  const collection = action.collection;
  if (!collection || protectedKeys.has(collection)) return fail("Missing or invalid collection.");
  if ((collection === "memories" || collection === "journal") && getMemoriesState().lock.locked) return fail("Unlock Memories before changing journal or memory entries.");
  const s = getState();
  if (collection === "health" || collection === "money") {
    if (action.type !== "update") return fail(`Only updates are supported for ${collection}.`);
    const schema: Schema = { fields: collection === "health" ? { sleep: "number", workouts: "number", water: "number", meals: "number" } : { spend: "number", savings: "number" }, required: [], defaults: {} };
    const error = validFields(action.fields, schema, false);
    if (error) return fail(error);
    setState((current) => ({ [collection]: { ...current[collection], ...action.fields } }));
    return ok(`Updated ${collection}.`);
  }
  if (collection === "mood") {
    if (action.type !== "update" || !action.id || !days.includes(action.id as typeof days[number])) return fail("Mood updates require a weekday ID.");
    const error = validFields(action.fields, { fields: { score: "number" }, required: [], defaults: {} }, false);
    if (error) return fail(error);
    if (!s.mood.some((entry) => entry.day === action.id)) return fail("Mood day not found.");
    setState((current) => ({ mood: current.mood.map((entry) => entry.day === action.id ? { ...entry, score: action.fields!.score as number } : entry) }));
    return ok(`Updated mood for ${action.id}.`);
  }
  if (!Object.prototype.hasOwnProperty.call(schemas, collection)) return fail(`Unsupported collection: ${collection}.`);
  if (collection === "journal") {
    if (action.type === "create") {
      const error = validFields(action.fields, schemas.journal, true);
      if (error) return fail(error);
      const { kind, pillar, ...fields } = action.fields!;
      if (kind === "voice" || kind === "photo") return fail("A voice or photo attachment cannot be created from text.");
      if (pillar && !["Work", "Study", "People", "Life"].includes(pillar as string)) return fail("Invalid journal section.");
      return executeAtlasAction({ type: "create", collection: "memories", fields: { ...fields, kind: kind === "log" ? "autolog" : kind || "journal", ...(pillar ? { section: pillar } : {}) } });
    }
    if (getMemoriesState().entries.some((entry) => entry.id === action.id)) {
      if (action.type === "delete") return executeAtlasAction({ type: "delete", collection: "memories", id: action.id });
      if (!action.fields || Object.keys(action.fields).some((key) => !["title", "text", "date", "mood"].includes(key))) return fail("For linked journal entries, only title, text, date, and mood can be updated here.");
      return executeAtlasAction({ type: "update", collection: "memories", id: action.id, fields: action.fields });
    }
  }
  const schema = schemas[collection];
  if (action.type !== "delete") {
    const error = validFields(action.fields, schema, action.type === "create");
    if (error) return fail(error);
  }
  if (action.type === "update" && collection === "plans" && action.fields && "steps" in action.fields) return fail("Edit plan steps individually using their IDs.");
  if (action.type === "update" && collection === "memories" && action.fields && "kind" in action.fields) return fail("A memory type cannot be changed.");
  if (action.type !== "create" && (!action.id || typeof action.id !== "string")) return fail("An exact item ID is required.");
  if (collection === "memories") {
    const memories = getMemoriesState();
    if (action.type === "create") {
      const fields = action.fields!;
      addMemoryEntry({ kind: (fields.kind as "journal" | "milestone" | "autolog") || "journal", title: fields.title as string, text: (fields.text as string) || "", date: (fields.date as string) || todayISO(), time: (fields.time as string) || nowHHMM(), peopleTags: [], linkedIds: [], ...fields } as Omit<MemoryEntry, "id">, { requireStorage: true });
      return ok(`Created memory “${fields.title}”.`);
    }
    const existing = memories.entries.find((entry) => entry.id === action.id);
    if (!existing) return fail("Memory not found.");
    if (action.type === "delete") {
      setMemories((prev) => ({ entries: prev.entries.filter((entry) => entry.id !== action.id).map((entry) => ({ ...entry, linkedIds: entry.linkedIds.filter((id) => id !== action.id) })) }), true);
      setState((current) => ({ journal: current.journal.filter((entry) => entry.id !== action.id) }));
      return ok(`Deleted memory “${existing.title}”.`);
    }
    setMemories((prev) => ({ entries: prev.entries.map((entry) => entry.id === action.id ? { ...entry, ...action.fields } : entry) }), true);
    setState((current) => ({ journal: current.journal.map((entry) => entry.id === action.id ? { ...entry, ...Object.fromEntries(Object.entries(action.fields!).filter(([key]) => ["title", "text", "date", "mood"].includes(key))) } : entry) }));
    return ok(`Updated memory “${existing.title}”.`);
  }
  let list: any[];
  if (collection === "tasks" || collection === "planSteps") {
    const parent = collection === "tasks" ? s.projects.find((item) => item.id === action.parentId) : s.plans.find((item) => item.id === action.parentId);
    if (!parent) return fail("Parent project or plan not found. Use its exact ID.");
    list = collection === "tasks" ? (parent as typeof s.projects[number]).tasks : (parent as typeof s.plans[number]).steps;
  } else if (collection === "subscriptions") list = s.money.subscriptions;
  else list = (s as unknown as Record<string, any[]>)[collection];
  if (!Array.isArray(list)) return fail("Collection unavailable.");
  const existing = action.type === "create" ? undefined : list.find((item) => item.id === action.id);
  if (action.type !== "create" && !existing) return fail("Item no longer exists; no change was made.");
  if (collection === "hoursLogs" && action.type !== "delete") {
    const projectId = action.fields?.projectId ?? existing?.projectId;
    if (!s.projects.some((project) => project.id === projectId)) return fail("Project ID not found.");
  }
  if (collection === "lifeVision" && action.type === "update" && typeof action.fields?.title === "string" && !action.fields.title.trim()) return fail("Title cannot be empty.");
  const fields = action.fields ?? {};
  const defaults = { ...schema.defaults };
  for (const key of ["date", "lastSeen", "created"]) if (key in defaults) defaults[key] = todayISO();
  if (collection === "ledger" && action.type === "create" && fields.kind === "income" && !("status" in fields)) defaults.status = "sent";
  const recordFields = collection === "plans" && action.type === "create" && Array.isArray(fields.steps) ? { ...fields, steps: fields.steps.map((text) => ({ id: uid(), text, done: false })) } : fields;
  const next = action.type === "create" ? [...list, { ...defaults, ...recordFields, id: uid() }] : action.type === "update" ? list.map((item) => item.id === action.id ? { ...item, ...fields } : item) : list.filter((item) => item.id !== action.id);
  if (collection === "tasks") setState((current) => ({ projects: current.projects.map((p) => p.id === action.parentId ? { ...p, tasks: next } : p) }));
  else if (collection === "planSteps") setState((current) => ({ plans: current.plans.map((p) => p.id === action.parentId ? { ...p, steps: next } : p) }));
  else if (collection === "subscriptions") setState((current) => ({ money: { ...current.money, subscriptions: next } }));
  else if (collection === "projects" && action.type === "delete") setState((current) => ({ projects: next, hoursLogs: current.hoursLogs.filter((log) => log.projectId !== action.id) }));
  else setState({ [collection]: next });
  const label = String((action.type === "create" ? fields : existing)?.title ?? (action.type === "create" ? fields : existing)?.name ?? (action.type === "create" ? fields : existing)?.label ?? action.id ?? collection);
  return ok(`${action.type === "create" ? "Created" : action.type === "update" ? "Updated" : "Deleted"} ${collection}: “${label}”.`);
}

/** Resolve an ID to a human-readable target for the approval screen. */
export function describeAtlasAction(action: AtlasAction): string {
  if (!action || !action.collection) return "Unknown target";
  if (action.type === "create") return `New ${action.collection}`;
  const s = getState();
  let list: any[] = [];
  if (action.collection === "memories") {
    const m = getMemoriesState();
    if (m.lock.locked) return "Memories locked";
    list = m.entries;
  } else if (action.collection === "tasks") list = s.projects.find((p) => p.id === action.parentId)?.tasks ?? [];
  else if (action.collection === "planSteps") list = s.plans.find((p) => p.id === action.parentId)?.steps ?? [];
  else if (action.collection === "subscriptions") list = s.money.subscriptions;
  else if (["health", "money"].includes(action.collection)) return action.collection;
  else if (action.collection === "mood") return `Mood: ${action.id ?? "unknown day"}`;
  else {
    const value = (s as unknown as Record<string, unknown>)[action.collection];
    if (Array.isArray(value)) list = value;
  }
  const item = list.find((entry) => entry.id === action.id);
  return item ? String(item.title || item.name || item.label || item.text || item.subject || item.date || item.id) : "Item not found";
}
