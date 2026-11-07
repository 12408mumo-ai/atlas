import assert from "node:assert/strict";

const storage = new Map<string, string>();
let failWrites = false;
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (failWrites) throw new DOMException("Storage full", "QuotaExceededError");
    storage.set(key, value);
  },
  removeItem: (key: string) => { storage.delete(key); },
};
const memories: any = await import("./lib/memories.ts");
memories.hydrateMemories();
const entry = {
  kind: "media", title: "Local photo", text: "", date: "2026-01-01", time: "10:00",
  peopleTags: [], linkedIds: [], media: { id: "photo", mediaType: "photo", src: "data:image/png;base64,AA==", album: "Trips" },
};
memories.addMemoryEntry(entry, { requireStorage: true });
assert.equal(JSON.parse(storage.get("atlas.memories.v3")!).entries[0].title, "Local photo");
failWrites = true;
assert.throws(() => memories.addMemoryEntry({ ...entry, title: "Too large" }, { requireStorage: true }));
failWrites = false;
memories.addMemoryEntry({ ...entry, title: "Another photo" }, { requireStorage: true });
const titles = JSON.parse(storage.get("atlas.memories.v3")!).entries.map((item: any) => item.title);
assert.ok(!titles.includes("Too large"), "failed saves must not remain in memory");
console.log("Local media save and storage quota checks passed");
