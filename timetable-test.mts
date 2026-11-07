import assert from "node:assert/strict";

const storage = new Map<string, string>();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
};
const store: any = await import("./lib/store.ts");
store.hydrate();
const initialCount = store.getState().timetable.length;
const slot = store.addTimetableSlot({ day: "Sat", time: "09:00–10:30", title: "Art", place: "Studio", lecturer: "" });
assert.equal(store.getState().timetable.length, initialCount + 1);
assert.equal(JSON.parse(storage.get("atlas.world.v1")!).timetable.at(-1).title, "Art");
store.updateTimetableSlot(slot.id, { day: "Sun", time: "11:00", title: "Music", place: "", lecturer: "Teacher" });
assert.equal(store.getState().timetable.find((item: any) => item.id === slot.id).day, "Sun");
assert.equal(JSON.parse(storage.get("atlas.world.v1")!).timetable.at(-1).title, "Music");
store.removeTimetableSlot(slot.id);
assert.equal(store.getState().timetable.length, initialCount);
assert.equal(JSON.parse(storage.get("atlas.world.v1")!).timetable.some((item: any) => item.id === slot.id), false);
console.log("Timetable add, edit, delete and persistence checks passed");
