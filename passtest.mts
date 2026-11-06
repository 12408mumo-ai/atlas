/* The spoken pass: does it set, match, or refuse?
   This guards the rule that decides whether the app opens. */

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
};

const passMod: any = await import("./lib/voice-pass.ts");
const pass = passMod.default ?? passMod;
const { checkPass, hashPin, getStoredPin, setStoredPin, clearStoredPin } = pass;

let passCount = 0;
let failCount = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { passCount++; console.log(`OK   ${label}`); }
  else { failCount++; console.log(`FAIL ${label} ${detail}`); }
}

/* The hash round-trips. */
ok("hash is stable", hashPin("742") === hashPin("742"));
ok("different pins hash differently", hashPin("742") !== hashPin("743"));
ok("stored hash is not the plain digits", getStoredPin() !== "742");

/* With no pass set, the first digits become the pass. */
mem.clear();
let v = checkPass("742");
ok("no pass set -> 'set'", v.result === "set", JSON.stringify(v));
ok("the pass is now stored", getStoredPin() === hashPin("742"));

/* The same pass matches. */
v = checkPass("742");
ok("the same pass -> 'match'", v.result === "match", JSON.stringify(v));

/* A different pass is refused, with tries left. */
v = checkPass("999", 0);
ok("a wrong pass -> 'mismatch'", v.result === "mismatch", JSON.stringify(v));
ok("tries left is counted down", v.triesLeft === 2, JSON.stringify(v));

v = checkPass("999", 1);
ok("second wrong pass leaves one try", v.triesLeft === 1, JSON.stringify(v));

v = checkPass("999", 2);
ok("third wrong pass leaves none", v.triesLeft === 0, JSON.stringify(v));

/* Words with no numbers are not a pass. */
v = checkPass("hello");
ok("no digits -> 'no-digits'", v.result === "no-digits", JSON.stringify(v));
v = checkPass("");
ok("empty -> 'no-digits'", v.result === "no-digits", JSON.stringify(v));

/* A refused pass never overwrites the stored one. */
mem.clear();
checkPass("111");
const stored = getStoredPin();
checkPass("222");
ok("a refused pass does not replace the stored one", getStoredPin() === stored);

/* The pass can be removed. */
clearStoredPin();
ok("the pass can be removed", getStoredPin() === null);
v = checkPass("111");
ok("after removal the next digits set a new pass", v.result === "set");

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
