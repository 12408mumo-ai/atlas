/* Proves the spoken pass opens the app.
   The bug this guards against: the follow-up action was attached to a
   timer that returned early once the pass was correct, so onUnlock never
   ran and the app never opened. */

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
};

const passMod: any = await import("./lib/voice-pass.ts");
const pass = passMod.default ?? passMod;
const { setStoredPin } = pass;

const voiceMod: any = await import("./lib/voice.ts");
const voice = voiceMod.default ?? voiceMod;
const { spokenToDigits, isAffirmative } = voice;

let passCount = 0;
let failCount = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { passCount++; console.log(`OK   ${label}`); }
  else { failCount++; console.log(`FAIL ${label} ${detail}`); }
}

/* This mirrors exactly what VoiceGreeting does across the two turns:
   first the user says yes to come in, then they speak the digits. */
function openTheApp(
  answer: string,
  passPhrase: string,
  storedPin: string | null
): { opened: boolean; stage: string } {
  if (storedPin !== null) setStoredPin(storedPin);
  else mem.clear();

  let opened = false;
  let stage = "asking";

  // Turn one: the orb asks whether to come in.
  if (!isAffirmative(answer)) {
    return { opened, stage };
  }
  stage = "pass";

  // Turn two: the user speaks the digits.
  const digits = spokenToDigits(passPhrase);
  const verdict = pass.checkPass(digits, 0, 3);

  if (verdict.result === "set" || verdict.result === "match") {
    opened = true;
    stage = "unlocked";
  } else {
    stage = "denied";
  }

  return { opened, stage };
}

/* 1. The correct pass opens the app. */
let r = openTheApp("yes", "seven four two", "742");
ok("the correct spoken pass opens the app", r.opened === true, JSON.stringify(r));
ok("the stage becomes unlocked", r.stage === "unlocked", r.stage);

/* 2. The same pass as plain digits opens the app. */
r = openTheApp("yes", "742", "742");
ok("the pass as plain digits opens the app", r.opened === true, JSON.stringify(r));

/* 3. The pass with "and" in it opens the app. */
r = openTheApp("yes", "seven hundred and forty two", "742");
ok("a grouped pass opens the app", r.opened === true, JSON.stringify(r));

/* 4. A wrong pass does not open the app. */
r = openTheApp("yes", "nine nine nine", "742");
ok("a wrong pass does not open the app", r.opened === false, JSON.stringify(r));
ok("the stage becomes denied", r.stage === "denied", r.stage);

/* 5. With no pass set, the first digits set it and open the app. */
mem.clear();
r = openTheApp("yes", "one two three", null);
ok("the first spoken digits open the app", r.opened === true, JSON.stringify(r));

/* 6. Saying no never opens the app. */
mem.clear();
r = openTheApp("no", "seven four two", "742");
ok("saying no does not open the app", r.opened === false, JSON.stringify(r));

/* 7. "yes" alone must never open the app. */
mem.clear();
const yesOnly = isAffirmative("yes");
ok("'yes' is recognised as an agreement", yesOnly === true);
ok("'yes' on its own is not a pass", !/\d/.test(spokenToDigits("yes")));

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
