/* Does "Enter without signing in" create a usable local session? */

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
};

const store: any = await import("./lib/store.ts");

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label} ${detail}`); }
}

// Before entering, there is no session.
ok("there is no session to begin with", store.getSession() === null);

// Enter as a guest.
store.enterAsGuest();

const session = store.getSession();
ok("a session is created", session !== null);
ok("the session has a name", typeof session?.name === "string" && session.name.length > 0, String(session?.name));
ok("the session has no email", session?.email === "", String(session?.email));
ok("the session has a start date", Boolean(session?.since));

// It is stored in the browser only.
ok("the session is kept in local storage", mem.has("atlas.session.v1"));
ok("nothing is sent to the cloud", mem.get("atlas.session.v1") !== undefined);

// The data itself is still there to use.
ok("the world is loaded", typeof store.getState() === "object");
ok("the world has projects", Array.isArray(store.getState().projects) && store.getState().projects.length > 0);
ok("the world has people", Array.isArray(store.getState().people) && store.getState().people.length > 0);

// A guest can still make changes, and they persist locally.
const before = store.getState().journal.length;
store.addJournal({
  date: store.todayISO(),
  title: "A guest note",
  text: "Written without signing in.",
  mood: 3,
  kind: "journal",
});
ok("a guest can add a journal entry", store.getState().journal.length === before + 1);
ok("the guest's work is kept in the browser", mem.has("atlas.world.v1"));

console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
