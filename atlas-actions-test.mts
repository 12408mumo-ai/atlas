import assert from "node:assert/strict";
const storage = new Map<string, string>();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
};
const store: any = await import("./lib/store.ts");
const memory: any = await import("./lib/memories.ts");
const ai: any = await import("./lib/atlas-actions.ts");
const model: any = await import("./lib/atlas-ai.ts");
store.hydrate(); memory.hydrateMemories();
const act = (action: any) => ai.executeAtlasAction(action);
const count = store.getState().timetable.length;
assert.equal(act({ type: "create", collection: "timetable", fields: { title: "AI class", day: "Sat", time: "09:00" } }).ok, true);
const slot = store.getState().timetable.find((s: any) => s.title === "AI class");
assert.equal(act({ type: "delete", collection: "timetable", id: "" }).ok, false);
assert.equal(act({ type: "delete", collection: "timetable", id: "AI class" }).ok, false);
assert.equal(store.getState().timetable.length, count + 1);
assert.equal(act({ type: "update", collection: "timetable", id: slot.id, fields: { day: "Sun" } }).ok, true);
assert.equal(store.getState().timetable.find((s: any) => s.id === slot.id).day, "Sun");
assert.equal(act({ type: "update", collection: "timetable", id: slot.id, fields: { id: "oops" } }).ok, false);
assert.equal(act({ type: "delete", collection: "timetable", id: slot.id }).ok, true);
assert.equal(JSON.parse(storage.get("atlas.world.v1")!).timetable.some((s: any) => s.id === slot.id), false);
assert.equal(act({ type: "update", collection: "health", fields: { sleep: -5 } }).ok, false);
assert.equal(act({ type: "delete", collection: "__proto__", id: "x" }).ok, false);
assert.equal(act({ type: "create", collection: "plans", fields: { title: "Study plan", steps: ["Read", "Practice"] } }).ok, true);
const plan = store.getState().plans.find((p: any) => p.title === "Study plan");
assert.equal(plan.steps.length, 2); assert.ok(plan.steps[0].id);
assert.equal(act({ type: "create", collection: "memories", fields: { title: "Private test", text: "Do not disclose while locked" } }).ok, true);
const entry = memory.getMemoriesState().entries.find((e: any) => e.title === "Private test");
assert.equal(store.getState().journal.filter((j: any) => j.id === entry.id).length, 1);
assert.equal(act({ type: "update", collection: "journal", id: entry.id, fields: { title: "Changed memory" } }).ok, true);
assert.equal(memory.getMemoriesState().entries.find((e: any) => e.id === entry.id).title, "Changed memory");
assert.equal(store.getState().journal.find((e: any) => e.id === entry.id).title, "Changed memory");
assert.ok(!ai.atlasDataSnapshot().includes('data:image'));
memory.setMemories((m: any) => ({ lock: { ...m.lock, locked: true, pinHash: "SECRET-PIN" } }));
const snapshot = ai.atlasDataSnapshot();
assert.ok(!snapshot.includes("Do not disclose while locked"));
assert.ok(!snapshot.includes("SECRET-PIN"));
assert.equal(act({ type: "delete", collection: "memories", id: entry.id }).ok, false);
assert.equal(act({ type: "delete", collection: "journal", id: entry.id }).ok, false);
const proposed = model.extractActions('I will do it.\n```atlas\n{"actions":[{"type":"delete","collection":"timetable","id":"x"}]}\n```');
assert.equal(proposed.actions.length, 1);
assert.equal(store.getState().timetable.length, count, "Parsing must never execute a change");
assert.equal(model.extractActions('```atlas\n{"actions":' + JSON.stringify(Array(21).fill({ type: "delete" })) + '}\n```').actions.length, 0);
console.log("Atlas action safety, persistence, privacy, and parsing checks passed");
