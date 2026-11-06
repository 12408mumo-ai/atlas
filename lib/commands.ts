/* ================================================================== */
/*  lib/commands.ts — spoken command parser for the Atlas demo voice   */
/*                                                                     */
/*  Turns a spoken phrase into a structured action the executor can   */
/*  run against the Atlas store. Understands a fixed but broad set    */
/*  of commands across every pillar of the app.                        */
/* ================================================================== */

import { todayISO } from "./store";

export type CommandAction = {
  type: string;
  [key: string]: unknown;
};

export type ParsedCommand = {
  understood: boolean;
  action: CommandAction | null;
  reply: string;
  /** A human sentence describing what will happen, for confirmation. */
  confirmation: string | null;
  /** Destructive actions always need a spoken yes. */
  destructive: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Remove the leading verb so "add a task called finish report" -> "a task called finish report". */
function afterVerb(text: string): string {
  return clean(
    text
      .replace(/^(please\s+)?/i, "")
      .replace(
        /^(add|create|new|make|set up|schedule|log|record|start|complete|finish|delete|remove|erase|clear|update|edit|change|mark|rename|note|plan|touch|check in with|met|see)\s+/i,
        ""
      )
  );
}

/**
 * Strip a leading noun phrase like "a task called", "the task",
 * "my project for", so only the actual name remains.
 */
function stripNoun(body: string, nouns: string): string {
  const nounGroup = nouns;
  return clean(
    body
      // "a task called X", "a note named X", "a note that X"
      .replace(
        new RegExp(`^(?:an?|the|my)?\\s*(?:${nounGroup})\\s+(?:called|named|titled|that|about)\\s+`, "i"),
        ""
      )
      // "the task", "my project"
      .replace(
        new RegExp(`^(?:an?|the|my)?\\s*(?:${nounGroup})\\b`, "i"),
        ""
      )
      .replace(
        new RegExp(`^(?:an?|the|my)?\\s*(?:${nounGroup})\\s+(?:for|in|to|on)\\s+`, "i"),
        ""
      )
      // A leftover "called X" with the noun already removed.
      .replace(/^(?:called|named|titled)\s+/i, "")
  );
}

function titleCase(s: string): string {
  return clean(s)
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Remove a date phrase from a title so it stays clean. */
function stripDatePhrase(s: string): string {
  return clean(
    s
      .replace(/\b(?:due\s+)?(?:today|tomorrow|yesterday|next week|next month)\b/gi, " ")
      .replace(/\b(?:due\s+)?\bin \d+ (?:days?|weeks?|months?)\b/gi, " ")
      .replace(/\b(?:due\s+)?\d{4}-\d{2}-\d{2}\b/gi, " ")
      .replace(/\b(?:due\s+)?\d{1,2}\/\d{1,2}\b/gi, " ")
  );
}

function parseAmount(text: string): number | null {
  const match = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?|usd|shillings?|kes)?(?:\s|$)/i);
  if (match) return Number(match[1]);
  const words: Record<string, number> = {
    ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  };
  for (const [word, value] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return value;
  }
  return null;
}

function parseDate(text: string): string {
  const t = text.toLowerCase();
  const today = new Date();

  const inDays = t.match(/\bin (\d+) (day|days|week|weeks|month|months)\b/);
  if (inDays) {
    const n = Number(inDays[1]);
    const unit = inDays[2];
    const d = new Date(today);
    if (unit.startsWith("day")) d.setDate(d.getDate() + n);
    else if (unit.startsWith("week")) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  if (/\btomorrow\b/.test(t)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/\bnext week\b/.test(t)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  if (/\bnext month\b/.test(t)) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }

  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    const d = new Date(today.getFullYear(), month - 1, day);
    if (d.getTime() < today.getTime()) d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  return todayISO();
}

/** Pull the name of a person out of a phrase. */
function personName(text: string): string {
  const patterns = [
    /\b(?:called|named)\s+(.+)$/i,
    /\b(?:for|about)\s+([a-z][a-z\s'.-]{1,40})$/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return titleCase(m[1]);
  }
  return titleCase(text);
}

/* ------------------------------------------------------------------ */
/*  The parser                                                         */
/* ------------------------------------------------------------------ */

export function parseCommand(raw: string): ParsedCommand {
  let text = norm(raw);
  // Drop a leading wake word: "atlas add a task…"
  text = text.replace(/^(hey\s+)?atlas[\s,]+/i, "").trim();
  if (!text) {
    return { understood: false, action: null, reply: "I did not hear anything.", confirmation: null, destructive: false };
  }

  /* ---------------- greetings and small talk ---------------- */

  if (/^(hello|hi|hey|good (morning|afternoon|evening|day))\b/.test(text)) {
    return {
      understood: true,
      action: null,
      reply: "I am here, and the world is in my hands.",
      confirmation: null,
      destructive: false,
    };
  }

  if (/\b(what can you do|help|what do you know|commands)\b/.test(text)) {
    return {
      understood: true,
      action: null,
      reply:
        "I keep every part of your world. Ask me to add a task, log an expense, " +
        "note a person, start a plan, update a course, or delete something. " +
        "I will always ask before I change anything.",
      confirmation: null,
      destructive: false,
    };
  }

  // "show me …", "list my …", "what are my …" — a request for a summary.
  // The word "list" must stand alone so "reading list" is not mistaken
  // for a request to list things.
  if (
    /^(what.s my|show me|list my|list the|list all|list everything|what are my|what is my|what do i have|summar\w*|how am i doing|give me a (summary|report|overview)|status)\b/.test(
      text
    )
  ) {
    return {
      understood: true,
      action: { type: "report" },
      reply: "",
      confirmation: null,
      destructive: false,
    };
  }

  /* ---------------- add task ---------------- */

  if (/^(add|create|new|make|schedule)\b.*\b(task|todo|to-do|chore|errand)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "task|todo|to-do|chore|errand");
    if (!body) {
      return { understood: false, action: null, reply: "What should the task be called?", confirmation: null, destructive: false };
    }
    const title = titleCase(stripDatePhrase(body));
    return {
      understood: true,
      action: { type: "add_task", title, due: parseDate(body), project: "" },
      reply: "",
      confirmation: `Add the task "${title}"`,
      destructive: false,
    };
  }

  /* ---------------- complete task ---------------- */

  if (/^(complete|finish|tick off|check off)\b/.test(text) || (/^mark\b.*\b(done|complete)\b/.test(text) && !/\bhabit\b/.test(text))) {
    const body = stripNoun(afterVerb(text), "task|todo|to-do")
      .replace(/\s+(as\s+)?(done|complete|completed|finished)\s*$/i, "")
      .replace(/^off\s+/i, "");
    return {
      understood: true,
      action: { type: "complete_task", title: titleCase(body) },
      reply: "",
      confirmation: `Mark the task "${titleCase(body)}" as done`,
      destructive: false,
    };
  }

  /* ---------------- delete task ---------------- */

  if (/^(delete|remove|erase|cancel|drop)\b/.test(text) && /\b(task|todo|to-do)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "task|todo|to-do");
    return {
      understood: true,
      action: { type: "remove_task", title: titleCase(body) },
      reply: "",
      confirmation: `Delete the task "${titleCase(body)}"`,
      destructive: true,
    };
  }

  /* ---------------- projects ---------------- */

  if (/^(add|create|new|start)\b/.test(text) && /\bproject\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "project");
    const clientMatch = body.match(/\bfor\s+(.+)$/i);
    const name = titleCase(clientMatch ? body.replace(clientMatch[0], "") : body);
    return {
      understood: true,
      action: { type: "add_project", name, client: clientMatch ? titleCase(clientMatch[1]) : "" },
      reply: "",
      confirmation: `Add the project "${name}"`,
      destructive: false,
    };
  }

  if (/^(delete|remove|erase)\b/.test(text) && /\bproject\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "project");
    return {
      understood: true,
      action: { type: "remove_project", name: titleCase(body) },
      reply: "",
      confirmation: `Delete the project "${titleCase(body)}"`,
      destructive: true,
    };
  }

  if (/^(log|add|record)\b/.test(text) && /\b(hours?|time)\b/.test(text)) {
    const hours = text.match(/(\d+(?:\.\d+)?)\s*hours?/i);
    const projMatch = text.match(/\b(?:on|to|for)\s+(?:the\s+)?(.+?)(?:\s+project)?$/i);
    return {
      understood: true,
      action: {
        type: "log_hours",
        hours: hours ? Number(hours[1]) : 1,
        project: projMatch ? titleCase(projMatch[1]) : "",
      },
      reply: "",
      confirmation: `Log ${hours ? hours[1] : 1} hours`,
      destructive: false,
    };
  }

  /* ---------------- ledger / money ---------------- */

  /* ---------------- ledger / money ---------------- */

  // "add a subscription called netflix for 12 dollars" — the subscription
  // is checked before the bare-amount branch so it is not read as an expense.
  if (/^(add|new|create|start|sign up for)\b/.test(text) && /\bsubscription\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "subscription");
    const cost = parseAmount(body);
    const name = titleCase(
      body
        .replace(/\b\d+(?:\.\d+)?\b/g, " ")
        .replace(/\b(dollars?|bucks?|usd|per month|monthly|a month|for)\b/gi, " ")
    );
    return {
      understood: true,
      action: { type: "add_subscription", name, cost: cost ?? 0 },
      reply: "",
      confirmation: `Add the subscription "${name}"`,
      destructive: false,
    };
  }

  // "log 45 dollars lunch" — a bare amount with no "expense" word.
  if (/^(log|record|add)\b/.test(text) && /\b\d+(?:\.\d+)?\s*(?:dollars?|bucks?|usd|shillings?|kes)\b/.test(text) && !/\b(income|earned|received|salary|invoice|subscription)\b/.test(text)) {
    const body = afterVerb(text);
    const amount = parseAmount(body);
    const label = titleCase(
      body
        .replace(/\b(\d+(?:\.\d+)?)\s*(dollars?|bucks?|usd|shillings?|kes)?\b/gi, " ")
        .replace(/^(?:of|for|on)\s+/i, "")
        .replace(/\b(for|on)\b/gi, " ")
    );
    return {
      understood: true,
      action: { type: "add_ledger", label: label || "Expense", amount: amount ?? 0, kind: "expense" },
      reply: "",
      confirmation: `Log an expense of ${amount ?? "?"} for "${label || "Expense"}"`,
      destructive: false,
    };
  }

  if (/\b(expense|spent|spend|pay|paid|cost|bought|purchase)\b/.test(text) && /^(add|log|record|create|put|charge)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "expense|entry|transaction|payment");
    const amount = parseAmount(body);
    const label = titleCase(
      body
        .replace(/\b(\d+(?:\.\d+)?)\s*(dollars?|bucks?|usd|shillings?|kes)?\b/gi, " ")
        .replace(/^(?:of|for|on)\s+/i, "")
        .replace(/\b(for|on)\b/gi, " ")
    );
    return {
      understood: true,
      action: { type: "add_ledger", label: label || "Expense", amount: amount ?? 0, kind: "expense" },
      reply: "",
      confirmation: `Log an expense of ${amount ?? "?"} for "${label || "Expense"}"`,
      destructive: false,
    };
  }

  if (/\b(income|earned|received|got paid|salary|invoice)\b/.test(text) && /^(add|log|record|create|put)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "income|entry|payment");
    const amount = parseAmount(body);
    const label = titleCase(
      body
        .replace(/\b(\d+(?:\.\d+)?)\s*(dollars?|bucks?|usd|shillings?|kes)?\b/gi, " ")
        .replace(/^(?:of|for|on)\s+/i, "")
        .replace(/\b(for|on)\b/gi, " ")
    );
    return {
      understood: true,
      action: { type: "add_ledger", label: label || "Income", amount: amount ?? 0, kind: "income" },
      reply: "",
      confirmation: `Log income of ${amount ?? "?"} for "${label || "Income"}"`,
      destructive: false,
    };
  }

  if (/^(delete|remove|erase)\b/.test(text) && /\b(expense|income|ledger|entry|payment)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "expense|income|ledger|entry|payment");
    return {
      understood: true,
      action: { type: "remove_ledger", label: titleCase(body) },
      reply: "",
      confirmation: `Delete the ledger entry "${titleCase(body)}"`,
      destructive: true,
    };
  }

  /* ---------------- people ---------------- */

  if (/^(add|new|create|register)\b/.test(text) && /\b(person|contact|friend)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "person|contact|friend");
    const relationMatch = body.match(/\b(?:my|a|an|the)\s+(\w+)\b/i);
    // Drop trailing clauses like "who is my friend".
    const name = personName(
      body
        .replace(/\bwho\s+is\b.*$/i, "")
        .replace(/\b(?:my|a|an|the)\s+\w+\b/i, "")
    );
    return {
      understood: true,
      action: { type: "add_person", name, relation: relationMatch ? relationMatch[1] : "Acquaintance" },
      reply: "",
      confirmation: `Add the person "${name}"`,
      destructive: false,
    };
  }

  if (/^(delete|remove|erase)\b/.test(text) && /\b(person|contact|friend)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "person|contact|friend");
    return {
      understood: true,
      action: { type: "remove_person", name: titleCase(body) },
      reply: "",
      confirmation: `Remove the person "${titleCase(body)}"`,
      destructive: true,
    };
  }

  if (/^(touch|check in with|met|see|met with)\b/.test(text) && /\b(person|contact|friend)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "person|contact|friend");
    return {
      understood: true,
      action: { type: "touch_person", name: titleCase(body) },
      reply: "",
      confirmation: `Record that you met "${titleCase(body)}" today`,
      destructive: false,
    };
  }

  /* ---------------- habits ---------------- */

  if (/^(add|start|begin|new)\b/.test(text) && /\bhabit\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "habit");
    return {
      understood: true,
      action: { type: "add_habit", name: titleCase(body) },
      reply: "",
      confirmation: `Start the habit "${titleCase(body)}"`,
      destructive: false,
    };
  }

  if (/^(delete|remove|erase|stop)\b/.test(text) && /\bhabit\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "habit");
    return {
      understood: true,
      action: { type: "remove_habit", name: titleCase(body) },
      reply: "",
      confirmation: `Remove the habit "${titleCase(body)}"`,
      destructive: true,
    };
  }

  if (/\b(done|complete|finished)\b/.test(text) && /\bhabit\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "habit").replace(/\s+(as\s+)?done\s*$/i, "");
    return {
      understood: true,
      action: { type: "complete_habit", name: titleCase(body) },
      reply: "",
      confirmation: `Mark the habit "${titleCase(body)}" done for today`,
      destructive: false,
    };
  }

  /* ---------------- journal / notes ---------------- */

  if (/^(add|write|note|journal|record|jot)\b/.test(text) && !/\b(expense|income|task|habit|person|project|plan|assignment|course|subscription)\b/.test(text)) {
    // "note that X" — the "that" introduces the content, it is not the title.
    let body = stripNoun(afterVerb(text), "note|entry|journal|memory");
    body = clean(body.replace(/^(?:that|about)\s+/i, ""));
    const title = titleCase(stripDatePhrase(body).split(/\s+(?:that|about)\s+/i)[0] || body);
    return {
      understood: true,
      action: { type: "add_journal", title, text: body },
      reply: "",
      confirmation: `Keep the note "${title}"`,
      destructive: false,
    };
  }

  if (/^(delete|remove|erase)\b/.test(text) && /\b(note|entry|journal|memory)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "note|entry|journal|memory");
    return {
      understood: true,
      action: { type: "remove_journal", title: titleCase(body) },
      reply: "",
      confirmation: `Delete the note "${titleCase(body)}"`,
      destructive: true,
    };
  }

  /* ---------------- plans ---------------- */

  if (/^(plan|make a plan|create a plan|set up a plan)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "plan");
    const steps = body
      .split(/\s+(?:then|and then|after that|next|finally)\s+/i)
      .map((s) => titleCase(s))
      .filter(Boolean);
    const title = steps.length > 1 ? titleCase(steps[0]) : titleCase(body);
    const stepList = steps.length > 1 ? steps : [title];
    return {
      understood: true,
      action: { type: "plan", title, steps: stepList },
      reply: "",
      confirmation: `Create the plan "${title}" with ${stepList.length} step${stepList.length === 1 ? "" : "s"}`,
      destructive: false,
    };
  }

  if (/^(delete|remove|erase)\b/.test(text) && /\bplan\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "plan");
    return {
      understood: true,
      action: { type: "remove_plan", title: titleCase(body) },
      reply: "",
      confirmation: `Delete the plan "${titleCase(body)}"`,
      destructive: true,
    };
  }

  /* ---------------- assignments / study ---------------- */

  if (/^(add|schedule|create)\b/.test(text) && /\b(assignment|exam|cat|deadline)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "assignment|exam|cat|deadline");
    const dueMatch = body.match(/\bdue\s+(.+)$/i);
    const withoutDue = dueMatch ? body.replace(dueMatch[0], "") : body;
    const courseMatch = withoutDue.match(/\b(?:in|for)\s+(.+)$/i);
    const title = titleCase(courseMatch ? withoutDue.replace(courseMatch[0], "") : withoutDue);
    return {
      understood: true,
      action: {
        type: "add_assignment",
        title,
        course: courseMatch ? titleCase(courseMatch[1]) : "",
        due: parseDate(body),
      },
      reply: "",
      confirmation: `Add the assignment "${title}"`,
      destructive: false,
    };
  }

  if (/^(delete|remove|erase)\b/.test(text) && /\b(assignment|exam|cat)\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "assignment|exam|cat");
    return {
      understood: true,
      action: { type: "remove_assignment", title: titleCase(body) },
      reply: "",
      confirmation: `Delete the assignment "${titleCase(body)}"`,
      destructive: true,
    };
  }

  if (/\b(progress|percent|percentage)\b/.test(text) && /^\s*(set|update|change|put|record|mark)\b/.test(text)) {
    const pct = text.match(/(\d+)\s*(?:%|percent|percentage)?\b/i);
    // "set progress for statistics to 90 percent" / "set statistics progress to 90%"
    const courseMatch = text.match(
      /\b(?:for|in|of|on)\s+(.+?)(?:\s+progress)?\s*(?:to\s+\d+\s*(?:%|percent|percentage)?)?$/i
    );
    const direct = text.match(
      /^(?:set|update|change|put|record|mark)\s+(.+?)\s+progress\s+to\s+\d+/i
    );
    const course = direct
      ? titleCase(direct[1])
      : courseMatch
        ? titleCase(courseMatch[1])
        : "";
    return {
      understood: true,
      action: {
        type: "set_course_progress",
        course,
        progress: pct ? Number(pct[1]) : 0,
      },
      reply: "",
      confirmation: `Set progress${course ? ` for "${course}"` : ""} to ${pct ? pct[1] : 0}%`,
      destructive: false,
    };
  }

  if (/\b(study|revision|revise)\b/.test(text) && /\b(session|hour|hours|minutes|min)\b/.test(text)) {
    const mins = text.match(/(\d+)\s*(?:min|minute|minutes)/i);
    const hrs = text.match(/(\d+(?:\.\d+)?)\s*hours?/i);
    const durationMin = mins ? Number(mins[1]) : hrs ? Math.round(Number(hrs[1]) * 60) : 30;
    // The subject follows the duration, e.g. "study for 45 minutes on Statistics".
    const subject = text
      .replace(/.*?\b(?:for|of)?\s*\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?)\b/i, "")
      .replace(/^\s*(?:on|in|for|of)\s+/i, "")
      .trim();
    return {
      understood: true,
      action: {
        type: "log_study_session",
        subject: subject ? titleCase(subject) : "Study",
        durationMin,
      },
      reply: "",
      confirmation: `Log a ${durationMin} minute study session${subject ? ` on "${titleCase(subject)}"` : ""}`,
      destructive: false,
    };
  }

  /* ---------------- health and mood ---------------- */

  if (/\b(sleep|slept|water|meals?|ate|workouts?|exercises?|exercised|gym)\b/.test(text)) {
    const health: Record<string, number> = {};
    const sleep = text.match(/slept?\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*hours?/i);
    const water = text.match(/(\d+)\s*(?:cups?|glasses?|of water)/i);
    const meals = text.match(/(\d+)\s*meals?/i) ?? text.match(/\bate\s+(\d+)/i);
    const workouts =
      text.match(/(\d+)\s*workouts?/i) ??
      text.match(/\b(?:did|do|doing|finished|completed)\s+(\d+)\s*(?:workouts?|exercise|training)/i) ??
      text.match(/\b(?:workouts?|exercises?)\s*:?\s*(\d+)/i);
    if (sleep) health.sleep = Number(sleep[1]);
    if (water) health.water = Number(water[1]);
    if (meals) health.meals = Number(meals[1]);
    if (workouts) health.workouts = Number(workouts[1]);
    if (Object.keys(health).length === 0) {
      return { understood: false, action: null, reply: "Tell me the number, for example \"I slept 7 hours\".", confirmation: null, destructive: false };
    }
    return {
      understood: true,
      action: { type: "log_health", ...health },
      reply: "",
      confirmation: `Update your health log (${Object.entries(health).map(([k, v]) => `${k} ${v}`).join(", ")})`,
      destructive: false,
    };
  }

  if (/\b(mood|feeling|felt|i feel|i am feeling)\b/.test(text)) {
    const scoreMatch = text.match(/\b([1-5])\s*(?:\/\s*5|out of 5)?\b/);
    const feeling = text.match(/\b(happy|great|good|okay|fine|bad|rough|terrible|awful|sad|down|anxious|calm|excited)\b/);
    const map: Record<string, number> = {
      terrible: 1, awful: 1, bad: 1, rough: 1, sad: 2, down: 2, anxious: 2,
      okay: 3, fine: 3, calm: 3, good: 4, happy: 4, excited: 5, great: 5,
    };
    const score = scoreMatch ? Number(scoreMatch[1]) : feeling ? map[feeling[1].toLowerCase()] ?? 3 : 3;
    return {
      understood: true,
      action: { type: "set_mood", score },
      reply: "",
      confirmation: `Set today's mood to ${score} out of 5`,
      destructive: false,
    };
  }

  /* ---------------- subscriptions / money ---------------- */

  if (/^(delete|remove|erase)\b/.test(text) && /\bsubscription\b/.test(text)) {
    const body = stripNoun(afterVerb(text), "subscription");
    return {
      understood: true,
      action: { type: "remove_subscription", name: titleCase(body) },
      reply: "",
      confirmation: `Remove the subscription "${titleCase(body)}"`,
      destructive: true,
    };
  }

  return {
    understood: false,
    action: null,
    reply:
      "I did not catch a command in that. Try something like " +
      "\"add a task called finish the report\", \"log an expense of 20 for lunch\", " +
      "or \"note that the library closes at six\".",
    confirmation: null,
    destructive: false,
  };
}
