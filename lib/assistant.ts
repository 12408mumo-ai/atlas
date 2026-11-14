"use client";

import { addLifeVision, type LifeVisionCategory } from "./store";

export type AssistantAction = { type: "open"; target: string } | { type: "add_life"; category: LifeVisionCategory; title: string; notes: string } | { type: "reply"; message: string };
const destinations: Record<string, string> = { home: "/hub", work: "/work", study: "/study", people: "/people", life: "/life", memories: "/memories", atlas: "/atlas", goals: "/life?view=goals", places: "/life?view=places", things_to_do: "/life?view=experiences", becoming: "/life?view=becoming", timetable: "/study?view=timetable", subjects: "/study?view=courses", deadlines: "/study?view=assignments", sessions: "/study?view=sessions" };
export function destination(target: string) { return Object.hasOwn(destinations, target) ? destinations[target] : null; }
export function parseAction(value: unknown): AssistantAction {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The model returned an invalid response. Try again.");
  const o = value as Record<string, unknown>;
  if (o.type === "open" && typeof o.target === "string" && destination(o.target)) return { type: "open", target: o.target };
  if (o.type === "add_life" && typeof o.category === "string" && ["goals", "places", "experiences", "becoming"].includes(o.category) && typeof o.title === "string" && o.title.trim().length > 0 && o.title.trim().length <= 200 && (o.notes === undefined || (typeof o.notes === "string" && o.notes.length <= 4000))) return { type: "add_life", category: o.category as LifeVisionCategory, title: o.title.trim(), notes: typeof o.notes === "string" ? o.notes.trim() : "" };
  if (o.type === "reply" && typeof o.message === "string" && o.message.trim() && o.message.length <= 500) return { type: "reply", message: o.message.trim() };
  throw new Error("The model returned an unsupported command. Try rephrasing.");
}
export function applyAddition(action: Extract<AssistantAction, { type: "add_life" }>) {
  // Revalidate even though the model response was checked before approval.
  const safe = parseAction(action);
  if (safe.type !== "add_life") return false;
  return addLifeVision(safe.category, safe.title, safe.notes);
}
// Simple, explicit commands run on-device while no language model is connected.
export async function interpretLocal(command: string): Promise<AssistantAction> {
  const text = command.trim().replace(/[.!?]+$/, "").trim();
  const open = text.match(/^(?:please\s+)?(?:open|show(?: me)?|go to)\s+(?:my\s+|the\s+)?(.+?)(?:\s+page)?$/i);
  if (open) {
    const aliases: Record<string, string> = { "home": "home", "hub": "home", "work": "work", "study": "study", "people": "people", "life": "life", "memories": "memories", "atlas": "atlas", "goals": "goals", "places": "places", "places i want to go": "places", "things to do": "things_to_do", "things i want to do": "things_to_do", "who i want to become": "becoming", "timetable": "timetable", "subjects": "subjects", "deadlines": "deadlines", "sessions": "sessions", "study sessions": "sessions" };
    const target = aliases[open[1].toLowerCase()];
    if (target && destination(target)) return { type: "open", target };
  }
  const add = text.match(/^(?:please\s+)?add\s+(.+?)\s+to\s+(?:my\s+)?(goals|places|things to do|things i want to do|who i want to become)$/i);
  if (add) {
    const categories: Record<string, LifeVisionCategory> = { "goals": "goals", "places": "places", "things to do": "experiences", "things i want to do": "experiences", "who i want to become": "becoming" };
    return parseAction({ type: "add_life", category: categories[add[2].toLowerCase()], title: add[1], notes: "" });
  }
  return { type: "reply", message: "No language model is connected. Try ‘open Life’ or ‘add visit Kyoto to places’." };
}

/** The server contacts the authenticated gateway; no gateway secrets reach the browser. */
export async function interpret(command: string, signal?: AbortSignal): Promise<AssistantAction> {
  const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }), signal });
  if (response.status === 503) return interpretLocal(command);
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Could not reach the assistant.");
  return parseAction(payload.action);
}
