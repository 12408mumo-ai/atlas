/* Command parser: spoken phrases to structured actions. */

import * as commands from "./lib/commands.ts";
const v: any = (commands as any).default ?? commands;
const { parseCommand } = v;

let pass = 0;
let fail = 0;

function expect(label: string, phrase: string, type: string | null, extra?: Record<string, unknown>) {
  const parsed = parseCommand(phrase);
  const gotType = parsed.action?.type ?? null;
  let ok = gotType === type;
  if (ok && extra && parsed.action) {
    for (const [k, val] of Object.entries(extra)) {
      if (JSON.stringify(parsed.action[k]) !== JSON.stringify(val)) ok = false;
    }
  }
  if (ok) { pass++; }
  else {
    fail++;
    console.log(`FAIL ${label}: "${phrase}" -> ${gotType} (want ${type}) ${JSON.stringify(parsed.action)}`);
  }
}

function reject(label: string, phrase: string) {
  const parsed = parseCommand(phrase);
  if (!parsed.understood) { pass++; }
  else {
    fail++;
    console.log(`FAIL ${label}: "${phrase}" should not be understood -> ${JSON.stringify(parsed.action)}`);
  }
}

/* greetings */
expect("hello", "hello", null);
expect("help", "what can you do", null);
expect("report", "show me my tasks", "report");
expect("report2", "how am i doing", "report");
expect("report3", "list my tasks", "report");

/* tasks */
expect("add task", "add a task called finish the report", "add_task", { title: "Finish The Report" });
expect("add task due", "add a task called write intro due tomorrow", "add_task", { title: "Write Intro" });
expect("add task plain", "create a task called call the bank", "add_task", { title: "Call The Bank" });
expect("complete task", "complete the task finish the report", "complete_task", { title: "Finish The Report" });
expect("complete task2", "mark the task call the bank as done", "complete_task", { title: "Call The Bank" });
expect("delete task", "delete the task finish the report", "remove_task", { title: "Finish The Report" });

/* projects */
expect("add project", "add a project called north star", "add_project", { name: "North Star" });
expect("add project client", "add a project called atlas rebuild for acme", "add_project", { name: "Atlas Rebuild" });
expect("delete project", "delete the project north star", "remove_project", { name: "North Star" });

/* hours */
expect("log hours", "log 3 hours on the marble and mortar project", "log_hours", { hours: 3 });

/* ledger */
expect("expense", "log an expense of 20 for lunch", "add_ledger", { amount: 20, kind: "expense" });
expect("expense bare", "log 45 dollars lunch", "add_ledger", { amount: 45, kind: "expense" });
expect("income", "log income of 500 for salary", "add_ledger", { amount: 500, kind: "income" });
expect("delete ledger", "delete the ledger entry lunch", "remove_ledger");

/* people */
expect("add person", "add a person called Nia Mwangi", "add_person", { name: "Nia Mwangi" });
expect("delete person", "remove the person Nia Mwangi", "remove_person");
expect("touch person", "met the person Nia Mwangi today", "touch_person");

/* habits */
expect("add habit", "start a habit called drink water", "add_habit", { name: "Drink Water" });
expect("complete habit", "mark the habit drink water as done", "complete_habit");
expect("delete habit", "delete the habit drink water", "remove_habit");

/* journal */
expect("note", "note that the library closes at six", "add_journal");
expect("note2", "write a note called reading list", "add_journal");
expect("delete note", "delete the note reading list", "remove_journal");

/* plans */
expect("plan", "plan launch the site then invite the beta", "plan");
expect("delete plan", "delete the plan launch the site", "remove_plan");

/* assignments */
expect("add assignment", "add an assignment called problem set in statistics due friday", "add_assignment");
expect("delete assignment", "delete the assignment problem set", "remove_assignment");

/* courses */
expect("progress", "set progress for statistics to 90 percent", "set_course_progress", { progress: 90 });
expect("progress2", "update statistics progress to 75%", "set_course_progress", { progress: 75 });

/* study */
expect("study", "study for 45 minutes on statistics", "log_study_session", { durationMin: 45 });

/* health */
expect("sleep", "i slept 7 hours", "log_health", { sleep: 7 });
expect("water", "i drank 8 cups of water", "log_health", { water: 8 });
expect("meals", "i ate 3 meals", "log_health", { meals: 3 });
expect("workouts", "i did 4 workouts", "log_health", { workouts: 4 });

/* mood */
expect("mood", "i feel great", "set_mood", { score: 5 });
expect("mood2", "set my mood to 3", "set_mood", { score: 3 });

/* subscriptions */
expect("add sub", "add a subscription called netflix for 12 dollars", "add_subscription", { cost: 12 });
expect("delete sub", "delete the subscription netflix", "remove_subscription");

/* noise */
reject("sandwich", "make me a sandwich");
reject("random", "the weather is nice today");
reject("empty", "");

console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
