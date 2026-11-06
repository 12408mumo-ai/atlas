/* Voice layer: intent matching, spoken numbers, wake word. */

import * as voice from "./lib/voice.ts";
const v: any = (voice as any).default ?? voice;
const { isAffirmative, isNegative, spokenToDigits, stripWakeWord, hasWakeWord } = v;

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; console.log(`FAIL ${name} -> got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`); }
}

const yesCases = [
  "yes","Yes.","yeah","yep","yup","sure","sure thing","ok","okay","correct",
  "right","affirmative","go ahead","do it","proceed","confirm","please do",
  "uh yes","um yeah","well yes","so yes","yes please","yeah go ahead",
  "that is correct","sounds good","of course","exactly","yes sir","absolutely",
  "yes do it",
];
for (const c of yesCases) check(`affirmative "${c}"`, isAffirmative(c), true);

const noCases = [
  "no","No.","nope","nah","negative","cancel","stop","don't","do not","abort",
  "nevermind","never mind","wait","not now","no thanks","no thank you",
  "hold on","not yet","leave it","skip it","uh no","no please",
];
for (const c of noCases) check(`negative "${c}"`, isNegative(c), true);

const neutral = [
  "add a task called finish the report","what can you do","show me my tasks",
  "","maybe","perhaps","hello","I said no one should delete that",
  "nobody knows","nothing","please",
];
for (const c of neutral) {
  check(`not affirmative "${c}"`, isAffirmative(c), false);
  check(`not negative "${c}"`, isNegative(c), false);
}

check("wake 'atlas add a task'", hasWakeWord("atlas add a task"), true);
check("wake 'Hey Atlas, log an expense'", hasWakeWord("Hey Atlas, log an expense"), true);
check("wake 'okay atlas show me'", hasWakeWord("okay atlas show me"), true);
check("wake 'add a task'", hasWakeWord("add a task"), false);
check("wake 'atlas'", hasWakeWord("atlas"), true);

check("strip 'atlas add a task'", stripWakeWord("atlas add a task"), "add a task");
check("strip 'hey atlas, log 45 lunch'", stripWakeWord("hey atlas, log 45 lunch"), "log 45 lunch");
check("strip 'atlas'", stripWakeWord("atlas"), "");
check("strip 'add a task'", stripWakeWord("add a task"), "add a task");

const numCases: [string, string][] = [
  ["seven four two","742"],["742","742"],["7 4 2","742"],
  ["seven hundred forty two","742"],["one two three","123"],
  ["zero zero zero","000"],["twenty five","25"],["oh seven five","075"],
  ["seven oh two","702"],["seven","7"],["nine one nine","919"],
  ["seven hundred and forty two","742"],["one thousand","1000"],
];
for (const [i, e] of numCases) check(`digits "${i}"`, spokenToDigits(i), e);

console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
