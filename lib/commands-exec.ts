/* ================================================================== */
/*  lib/commands-exec.ts — runs spoken commands against the Atlas store */
/*                                                                     */
/*  Every action here changes real data in the same way the app's own */
/*  pages do, so the database stays in sync through the normal        */
/*  Supabase sync path.                                                */
/* ================================================================== */

import { getState, setState, todayISO } from "./store";
import { addMemoryEntry, nowHHMM } from "./memories";
import type { CommandAction } from "./commands";

export type ExecResult = {
  ok: boolean;
  message: string;
};

const uid = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;

const norm = (s: string) => s.toLowerCase().trim();

function fuzzy<T>(list: T[], query: string, get: (t: T) => string): T | undefined {
  const q = norm(query);
  if (!q) return undefined;
  const exact = list.find((t) => norm(get(t)) === q);
  if (exact) return exact;
  const contains = list.find((t) => norm(get(t)).includes(q) || q.includes(norm(get(t))));
  if (contains) return contains;
  // Loose word overlap.
  const words = q.split(/\s+/).filter(Boolean);
  return list.find((t) => {
    const target = norm(get(t));
    return words.every((w) => target.includes(w));
  });
}

const str = (a: CommandAction, k: string) =>
  typeof a[k] === "string" ? (a[k] as string).trim() : "";
const num = (a: CommandAction, k: string, d = 0) =>
  typeof a[k] === "number" && Number.isFinite(a[k]) ? (a[k] as number) : d;

export function executeCommand(action: CommandAction): ExecResult {
  const s = getState();

  switch (action.type) {
    /* ------------------------------- report ------------------------------ */
    case "report": {
      const openTasks = s.projects.flatMap((p) => p.tasks.filter((t) => !t.done));
      const overdue = openTasks.filter((t) => t.due && t.due < todayISO());
      const openAssignments = s.assignments.filter((a) => a.status === "open");
      const income = s.ledger.filter((l) => l.kind === "income").reduce((a, b) => a + b.amount, 0);
      const expense = s.ledger.filter((l) => l.kind === "expense").reduce((a, b) => a + b.amount, 0);

      const lines = [
        `You carry ${s.projects.length} projects with ${openTasks.length} open tasks`,
        overdue.length ? `and ${overdue.length} overdue` : "and nothing overdue",
        `${s.courses.length} courses with ${openAssignments.length} open assignments`,
        `${s.people.length} people in the registry`,
        `${s.habits.length} habits and ${s.plans.length} plans`,
        `money is ${income - expense >= 0 ? "up" : "down"} by ${Math.abs(income - expense)} this month`,
      ];
      return { ok: true, message: lines.join(". ") + "." };
    }

    /* -------------------------------- tasks ------------------------------ */
    case "add_task": {
      const title = str(action, "title");
      if (!title) return { ok: false, message: "That task has no name." };
      const requested = str(action, "project");
      const project = requested
        ? fuzzy(s.projects, requested, (p) => p.name)
        : s.projects.find((p) => p.status === "active") ?? s.projects[0];
      if (!project) {
        return {
          ok: false,
          message: "There is no project yet for the task to live in. Say \"add a project called …\" first.",
        };
      }
      const due = str(action, "due") || todayISO();
      setState((st) => ({
        projects: st.projects.map((p) =>
          p.id === project.id
            ? { ...p, tasks: [...p.tasks, { id: uid("t"), title, due, done: false }] }
            : p
        ),
      }));
      return { ok: true, message: `Task "${title}" added to ${project.name}, due ${due}.` };
    }

    case "complete_task": {
      const title = str(action, "title");
      for (const p of s.projects) {
        const t = fuzzy(p.tasks, title, (x) => x.title);
        if (t) {
          setState((st) => ({
            projects: st.projects.map((pp) =>
              pp.id === p.id
                ? { ...pp, tasks: pp.tasks.map((x) => (x.id === t.id ? { ...x, done: true } : x)) }
                : pp
            ),
          }));
          addMemoryEntry({
            kind: "autolog",
            title: `Completed — ${t.title}`,
            text: `Task completed in ${p.name}.`,
            date: todayISO(),
            time: nowHHMM(),
            section: "Work",
            peopleTags: [],
            linkedIds: [],
          });
          return { ok: true, message: `Task "${t.title}" is marked done.` };
        }
      }
      return { ok: false, message: `No open task matches "${title}".` };
    }

    case "remove_task": {
      const title = str(action, "title");
      for (const p of s.projects) {
        const t = fuzzy(p.tasks, title, (x) => x.title);
        if (t) {
          setState((st) => ({
            projects: st.projects.map((pp) =>
              pp.id === p.id ? { ...pp, tasks: pp.tasks.filter((x) => x.id !== t.id) } : pp
            ),
          }));
          return { ok: true, message: `Task "${t.title}" deleted.` };
        }
      }
      return { ok: false, message: `No task matches "${title}".` };
    }

    /* ------------------------------ projects ----------------------------- */
    case "add_project": {
      const name = str(action, "name");
      if (!name) return { ok: false, message: "That project has no name." };
      setState((st) => ({
        projects: [
          {
            id: uid("p"),
            name,
            client: str(action, "client") || "—",
            projectType: "client",
            rate: 0,
            hours: 0,
            status: "active",
            deadline: str(action, "deadline") || todayISO(),
            notes: "",
            tasks: [],
          },
          ...st.projects,
        ],
      }));
      return { ok: true, message: `Project "${name}" raised.` };
    }

    case "remove_project": {
      const name = str(action, "name");
      const p = fuzzy(s.projects, name, (x) => x.name);
      if (!p) return { ok: false, message: `No project matches "${name}".` };
      setState((st) => ({ projects: st.projects.filter((x) => x.id !== p.id) }));
      return { ok: true, message: `Project "${p.name}" removed.` };
    }

    case "log_hours": {
      const hours = num(action, "hours", 1);
      const requested = str(action, "project");
      const project = requested
        ? fuzzy(s.projects, requested, (p) => p.name)
        : s.projects.find((p) => p.status === "active") ?? s.projects[0];
      if (!project) return { ok: false, message: "There is no project to log hours against." };
      const date = todayISO();
      setState((st) => ({
        projects: st.projects.map((p) =>
          p.id === project.id ? { ...p, hours: p.hours + hours } : p
        ),
        hoursLogs: [
          ...st.hoursLogs,
          { id: uid("h"), projectId: project.id, date, hours },
        ],
      }));
      return { ok: true, message: `${hours} hours logged on ${project.name}.` };
    }

    /* ------------------------------- ledger ------------------------------ */
    case "add_ledger": {
      const label = str(action, "label");
      const amount = num(action, "amount");
      const kind = str(action, "kind") === "income" ? "income" : "expense";
      if (!label || !amount) return { ok: false, message: "That entry needs a label and an amount." };
      setState((st) => ({
        ledger: [
          {
            id: uid("l"),
            label,
            amount: Math.abs(amount),
            kind,
            date: todayISO(),
            bucket: "Atlas",
            client: "—",
            status: kind === "income" ? "sent" : "expense",
          },
          ...st.ledger,
        ],
      }));
      return {
        ok: true,
        message: `${kind === "income" ? "Income" : "Expense"} "${label}" of ${Math.abs(amount)} logged.`,
      };
    }

    case "remove_ledger": {
      const label = str(action, "label");
      const l = fuzzy(s.ledger, label, (x) => x.label);
      if (!l) return { ok: false, message: `No ledger entry matches "${label}".` };
      setState((st) => ({ ledger: st.ledger.filter((x) => x.id !== l.id) }));
      return { ok: true, message: `Ledger entry "${l.label}" struck out.` };
    }

    /* ------------------------------- people ------------------------------ */
    case "add_person": {
      const name = str(action, "name");
      if (!name) return { ok: false, message: "That person has no name." };
      setState((st) => ({
        people: [
          {
            id: uid("pe"),
            name,
            relation: str(action, "relation") || "Acquaintance",
            lastSeen: todayISO(),
            cadenceDays: num(action, "cadenceDays", 30) || 30,
            birthday: "—",
            promise: "—",
            gift: "—",
            notes: "—",
          },
          ...st.people,
        ],
      }));
      return { ok: true, message: `"${name}" entered into the registry of people.` };
    }

    case "remove_person": {
      const name = str(action, "name");
      const p = fuzzy(s.people, name, (x) => x.name);
      if (!p) return { ok: false, message: `No person matches "${name}".` };
      setState((st) => ({ people: st.people.filter((x) => x.id !== p.id) }));
      return { ok: true, message: `${p.name} released from the registry.` };
    }

    case "touch_person": {
      const name = str(action, "name");
      const p = fuzzy(s.people, name, (x) => x.name);
      if (!p) return { ok: false, message: `No person matches "${name}".` };
      setState((st) => ({
        people: st.people.map((x) => (x.id === p.id ? { ...x, lastSeen: todayISO() } : x)),
      }));
      return { ok: true, message: `Last seen updated for ${p.name}.` };
    }

    /* ------------------------------- habits ------------------------------ */
    case "add_habit": {
      const name = str(action, "name");
      if (!name) return { ok: false, message: "That habit has no name." };
      setState((st) => ({
        habits: [
          ...st.habits,
          { id: uid("h"), name, streak: 0, doneToday: false, glyph: "scroll" },
        ],
      }));
      return { ok: true, message: `Habit "${name}" begins.` };
    }

    case "remove_habit": {
      const name = str(action, "name");
      const h = fuzzy(s.habits, name, (x) => x.name);
      if (!h) return { ok: false, message: `No habit matches "${name}".` };
      setState((st) => ({ habits: st.habits.filter((x) => x.id !== h.id) }));
      return { ok: true, message: `Habit "${h.name}" retired.` };
    }

    case "complete_habit": {
      const name = str(action, "name");
      const h = fuzzy(s.habits, name, (x) => x.name);
      if (!h) return { ok: false, message: `No habit matches "${name}".` };
      setState((st) => ({
        habits: st.habits.map((x) =>
          x.id === h.id
            ? { ...x, doneToday: true, streak: x.doneToday ? x.streak : x.streak + 1 }
            : x
        ),
      }));
      return { ok: true, message: `Habit "${h.name}" marked done for today.` };
    }

    /* ------------------------------- journal ----------------------------- */
    case "add_journal": {
      const title = str(action, "title") || "Noted by Atlas";
      const text = str(action, "text") || title;
      const mood = Math.min(5, Math.max(1, num(action, "mood", 4) || 4));
      setState((st) => ({
        journal: [
          {
            id: uid("j"),
            date: todayISO(),
            title,
            text,
            mood,
            kind: "journal",
          },
          ...st.journal,
        ],
      }));
      addMemoryEntry({
        kind: "journal",
        title,
        text,
        date: todayISO(),
        time: nowHHMM(),
        section: "Life",
        peopleTags: [],
        mood,
        linkedIds: [],
      });
      return { ok: true, message: `Note "${title}" kept.` };
    }

    case "remove_journal": {
      const title = str(action, "title");
      const j = fuzzy(s.journal, title, (x) => x.title);
      if (!j) return { ok: false, message: `No note matches "${title}".` };
      setState((st) => ({ journal: st.journal.filter((x) => x.id !== j.id) }));
      return { ok: true, message: `Note "${j.title}" deleted.` };
    }

    /* -------------------------------- plans ------------------------------ */
    case "plan": {
      const title = str(action, "title");
      const steps = Array.isArray(action.steps)
        ? (action.steps as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      if (!title || !steps.length) return { ok: false, message: "A plan needs a title and at least one step." };
      setState((st) => ({
        plans: [
          {
            id: uid("pl"),
            title,
            created: todayISO(),
            byAtlas: true,
            steps: steps.map((text) => ({ id: uid("st"), text, done: false })),
          },
          ...st.plans,
        ],
      }));
      return { ok: true, message: `Plan "${title}" laid with ${steps.length} steps.` };
    }

    case "remove_plan": {
      const title = str(action, "title");
      const p = fuzzy(s.plans, title, (x) => x.title);
      if (!p) return { ok: false, message: `No plan matches "${title}".` };
      setState((st) => ({ plans: st.plans.filter((x) => x.id !== p.id) }));
      return { ok: true, message: `Plan "${p.title}" deleted.` };
    }

    /* ---------------------------- assignments ---------------------------- */
    case "add_assignment": {
      const title = str(action, "title");
      if (!title) return { ok: false, message: "That assignment has no name." };
      setState((st) => ({
        assignments: [
          {
            id: uid("a"),
            title,
            course: str(action, "course") || "—",
            due: str(action, "due") || todayISO(),
            status: "open",
            weight: num(action, "weight", 10),
            kind: "assignment",
          },
          ...st.assignments,
        ],
      }));
      return { ok: true, message: `Assignment "${title}" carved into the study pillar.` };
    }

    case "remove_assignment": {
      const title = str(action, "title");
      const a = fuzzy(s.assignments, title, (x) => x.title);
      if (!a) return { ok: false, message: `No assignment matches "${title}".` };
      setState((st) => ({ assignments: st.assignments.filter((x) => x.id !== a.id) }));
      return { ok: true, message: `Assignment "${a.title}" deleted.` };
    }

    case "set_course_progress": {
      const requested = str(action, "course");
      const progress = Math.min(100, Math.max(0, num(action, "progress", 0)));
      // Prefer an exact title or code match, then a word-overlap match.
      const course = requested
        ? s.courses.find(
            (c) =>
              norm(c.title) === norm(requested) ||
              norm(c.code) === norm(requested)
          ) ??
          s.courses.find((c) => {
            const words = norm(requested).split(/\s+/).filter(Boolean);
            const title = norm(c.title);
            return words.every((w) => title.includes(w));
          })
        : s.courses[0];
      if (!course) return { ok: false, message: "There are no courses yet." };
      setState((st) => ({
        courses: st.courses.map((c) =>
          c.id === course.id
            ? { ...c, progress, status: progress >= 100 ? "complete" : "active" }
            : c
        ),
      }));
      return { ok: true, message: `Progress on ${course.title} set to ${progress}%.` };
    }

    case "log_study_session": {
      const subject = str(action, "subject") || "Study";
      const durationMin = num(action, "durationMin", 30);
      setState((st) => ({
        studySessions: [
          ...st.studySessions,
          { id: uid("ss"), subject, date: todayISO(), durationMin },
        ],
      }));
      return { ok: true, message: `${durationMin} minutes of ${subject} recorded.` };
    }

    /* ---------------------------- health & mood -------------------------- */
    case "log_health": {
      setState((st) => ({
        health: {
          sleep: num(action, "sleep", st.health.sleep),
          workouts: num(action, "workouts", st.health.workouts),
          water: num(action, "water", st.health.water),
          meals: num(action, "meals", st.health.meals),
        },
      }));
      return { ok: true, message: "Your health log is updated." };
    }

    case "set_mood": {
      const score = Math.min(5, Math.max(1, num(action, "score", 3)));
      setState((st) => {
        const day = new Date().toLocaleDateString("en-GB", { weekday: "short" });
        return { mood: st.mood.map((m) => (m.day === day ? { ...m, score } : m)) };
      });
      return { ok: true, message: `Today's mood is set to ${score} out of 5.` };
    }

    /* --------------------------- subscriptions --------------------------- */
    case "add_subscription": {
      const name = str(action, "name");
      const cost = num(action, "cost");
      if (!name) return { ok: false, message: "That subscription has no name." };
      setState((st) => ({
        money: {
          ...st.money,
          spend: st.money.spend + cost,
          subscriptions: [
            ...st.money.subscriptions,
            {
              id: uid("sub"),
              name,
              cost,
              renew: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            },
          ],
        },
      }));
      return { ok: true, message: `Subscription "${name}" added at ${cost}.` };
    }

    case "remove_subscription": {
      const name = str(action, "name");
      const sub = fuzzy(s.money.subscriptions, name, (x) => x.name);
      if (!sub) return { ok: false, message: `No subscription matches "${name}".` };
      setState((st) => ({
        money: {
          ...st.money,
          spend: Math.max(0, st.money.spend - sub.cost),
          subscriptions: st.money.subscriptions.filter((x) => x.id !== sub.id),
        },
      }));
      return { ok: true, message: `Subscription "${sub.name}" removed.` };
    }

    default:
      return { ok: false, message: `I do not know how to carry out "${action.type}".` };
  }
}
