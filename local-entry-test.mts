import assert from "node:assert/strict";

const storage = new Map<string, string>();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
};

const store: any = await import("./lib/store.ts");
const saved = store.seed();
saved.projects = [{ ...saved.projects[0], name: "My saved project" }];
storage.set("atlas.world.v1", JSON.stringify(saved));
store.enterAsGuest();
assert.equal(store.getState().projects[0].name, "My saved project");
assert.equal(JSON.parse(storage.get("atlas.world.v1")!).projects[0].name, "My saved project");
console.log("Local entry preserves existing world");
