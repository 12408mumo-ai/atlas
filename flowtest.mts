/* End-to-end: speak a command, confirm with yes/no, check the data changed. */

const store: any = await import("./lib/store.ts");
const commands: any = (await import("./lib/commands.ts") as any).default ??
  (await import("./lib/commands.ts") as any);
const exec: any = (await import("./lib/commands-exec.ts") as any).default ??
  (await import("./lib/commands-exec.ts") as any);
const voice: any = (await import("./lib/voice.ts") as any).default ??
  (await import("./lib/voice.ts") as any);

const { parseCommand } = commands;
const { executeCommand } = exec;
const { isAffirmative, isNegative } = voice;

/* A minimal localStorage so the store can run under Node. */
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: (i: number) => Array.from(mem.keys())[i] ?? null,
  get length() { return mem.size; },
};

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`OK   ${label}`); }
  else { fail++; console.log(`FAIL ${label} ${detail}`); }
}

/** Speak a phrase, parse it, then confirm it with a spoken yes/no. */
function speak(phrase: string, answer: "yes" | "no" = "yes"): { ok: boolean; message: string } {
  const parsed = parseCommand(phrase);
  if (!parsed.understood || !parsed.action) {
    return { ok: false, message: parsed.reply };
  }
  if (parsed.action.type === "report") {
    return executeCommand(parsed.action);
  }
  // The confirmation gate.
  if (answer === "yes") {
    if (!isAffirmative(answer)) return { ok: false, message: "yes not recognised" };
  } else {
    if (!isNegative(answer)) return { ok: false, message: "no not recognised" };
  }
  if (answer === "no") return { ok: true, message: "Nothing was changed." };
  return executeCommand(parsed.action);
}

/* add task */
const before = store.getState();
const taskCountBefore = before.projects.reduce((a: number, p: any) => a + p.tasks.length, 0);
let r = speak("add a task called finish the report");
ok("add task executes", r.ok, JSON.stringify(r));
ok("add task message mentions the task", /Finish The Report/i.test(r.message), r.message);
const taskCountAfter =
  store.getState().projects.reduce((a: number, p: any) => a + p.tasks.length, 0);
ok("task count grew by one", taskCountAfter === taskCountBefore + 1,
  `${taskCountBefore} -> ${taskCountAfter}`);

/* log expense */
const ledgerBefore = store.getState().ledger.length;
r = speak("log an expense of 45 for lunch");
ok("log expense executes", r.ok, JSON.stringify(r));
ok("ledger grew by one", store.getState().ledger.length === ledgerBefore + 1);

/* decline a delete */
const habitCountBefore = store.getState().habits.length;
r = speak("delete the habit drink water", "no");
ok("declined delete says nothing changed", /nothing was changed/i.test(r.message), r.message);
ok("habit count unchanged", store.getState().habits.length === habitCountBefore);

/* add person */
const peopleBefore = store.getState().people.length;
r = speak("add a person called Nia Mwangi");
ok("add person executes", r.ok, JSON.stringify(r));
ok("people grew by one", store.getState().people.length === peopleBefore + 1);

/* report */
r = speak("show me my tasks");
ok("report runs", r.ok, JSON.stringify(r));
ok("report mentions projects", /project/i.test(r.message), r.message);

/* course progress */
r = speak("set progress for statistics to 90 percent");
ok("progress executes", r.ok, JSON.stringify(r));
ok("progress message names the course", /statistics/i.test(r.message), r.message);
const stat = store.getState().courses.find((c: any) => /statistics/i.test(c.title));
ok("course progress is 90", stat && stat.progress === 90, String(stat?.progress));

/* subscription */
const subsBefore = store.getState().money.subscriptions.length;
r = speak("add a subscription called netflix for 12 dollars");
ok("add subscription executes", r.ok, JSON.stringify(r));
ok("subscriptions grew by one",
  store.getState().money.subscriptions.length === subsBefore + 1,
  `${subsBefore} -> ${store.getState().money.subscriptions.length}`);
const netflix = store.getState().money.subscriptions.find((s: any) => /netflix/i.test(s.name));
ok("subscription cost is 12", netflix && netflix.cost === 12, String(netflix?.cost));

/* health */
r = speak("i slept 7 hours");
ok("health executes", r.ok, JSON.stringify(r));
ok("sleep recorded", store.getState().health.sleep === 7, String(store.getState().health.sleep));

/* journal */
const journalBefore = store.getState().journal.length;
r = speak("note that the library closes at six");
ok("note executes", r.ok, JSON.stringify(r));
ok("journal grew by one", store.getState().journal.length === journalBefore + 1,
  `${journalBefore} -> ${store.getState().journal.length}`);

/* mood */
r = speak("i feel great");
ok("mood executes", r.ok, JSON.stringify(r));
const weekday = new Date().toLocaleDateString("en-GB", { weekday: "short" });
const today = store.getState().mood.find((m: any) => m.day === weekday);
ok("mood is 5", today && today.score === 5, JSON.stringify(today));

/* study */
r = speak("study for 45 minutes on statistics");
ok("study executes", r.ok, JSON.stringify(r));

/* hours */
r = speak("log 3 hours on the marble and mortar project");
ok("hours executes", r.ok, JSON.stringify(r));

/* delete a task */
const tasksNow = store.getState().projects.reduce((a: number, p: any) => a + p.tasks.length, 0);
r = speak("delete the task finish the report");
ok("delete task executes", r.ok, JSON.stringify(r));
const tasksAfter = store.getState().projects.reduce((a: number, p: any) => a + p.tasks.length, 0);
ok("task count fell by one", tasksAfter === tasksNow - 1, `${tasksNow} -> ${tasksAfter}`);

/* unknown */
r = speak("make me a sandwich");
ok("unknown command is not understood", r.ok === false, JSON.stringify(r));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
