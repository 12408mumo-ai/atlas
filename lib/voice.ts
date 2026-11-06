/* ================================================================== */
/*  lib/voice.ts — speech input for Atlas                              */
/*                                                                     */
/*  Wraps the browser's SpeechRecognition API. Two modes are offered: */
/*  • listenOnce — one phrase, then stop.                             */
/*  • createWakeListener — a long-running session that keeps the mic  */
/*    open, watches for a wake word, and hands phrases to a callback. */
/*                                                                     */
/*  When the browser has no support (or the user denies the mic),     */
/*  callers fall back to a typed input so the flow never dead-ends.   */
/* ================================================================== */

export type VoiceStatus = "idle" | "listening" | "unsupported" | "denied";

export type VoiceResult = {
  text: string;
  confidence: number;
};

/* The Web Speech API is not in the TypeScript DOM lib yet. */
type SpeechAlternativeLike = { transcript: string; confidence: number };

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternativeLike;
};

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
  resultIndex: number;
};

type SpeechRecognitionErrorEventLike = Event & { error: string };

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceSupported(): boolean {
  return recognitionCtor() !== null;
}

/**
 * Pick the best transcript out of every alternative the engine offered.
 * The browser often ranks a short, wrong-but-confident result above the
 * correct one, so the longest plausible transcript wins.
 */
function bestAlternative(result: SpeechRecognitionResultLike): {
  text: string;
  confidence: number;
} {
  let best = { text: "", confidence: 0 };
  for (let a = 0; a < result.length; a++) {
    const alt = result[a];
    const text = alt?.transcript?.trim() ?? "";
    if (!text) continue;
    if (text.length > best.text.length) {
      best = { text, confidence: alt.confidence ?? 0 };
    }
  }
  return best;
}

/**
 * Listen once and resolve with the best transcript.
 * Rejects only when recognition is impossible; a no-speech result
 * resolves with empty text so the caller can ask again.
 */
export function listenOnce(
  opts: { lang?: string; timeoutMs?: number } = {}
): Promise<VoiceResult> {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    return Promise.reject(new Error("Speech recognition is not supported here."));
  }

  const lang = opts.lang ?? "en-US";
  const timeoutMs = opts.timeoutMs ?? 12000;

  return new Promise<VoiceResult>((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      fn();
    };

    timer = setTimeout(() => {
      try {
        recognition.abort();
      } catch {}
      finish(() => resolve({ text: "", confidence: 0 }));
    }, timeoutMs);

    recognition.onresult = (event) => {
      const list = event.results;
      for (let i = 0; i < list.length; i++) {
        const result = list[i];
        if (!result.isFinal) continue;
        const best = bestAlternative(result);
        finish(() => resolve(best));
        return;
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "no-speech" || code === "aborted") {
        finish(() => resolve({ text: "", confidence: 0 }));
        return;
      }
      finish(() =>
        reject(
          new Error(
            code === "not-allowed" || code === "service-not-allowed"
              ? "Microphone access was denied."
              : "Could not hear that. Please try again."
          )
        )
      );
    };

    recognition.onend = () => {
      finish(() => resolve({ text: "", confidence: 0 }));
    };

    try {
      recognition.start();
    } catch (error) {
      finish(() =>
        reject(
          error instanceof Error ? error.message : "Could not start listening."
        )
      );
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Wake listener — a continuous mic session                          */
/* ------------------------------------------------------------------ */

export type WakeListenerHandle = {
  /** Stop listening and release the microphone. */
  stop: () => void;
  /** Pause after the current phrase without killing the session. */
  pause: () => void;
  /** Resume a paused session. */
  resume: () => void;
  /** True while the microphone is actively capturing. */
  readonly active: boolean;
};

/**
 * Keep the microphone open and hand every finished phrase to `onPhrase`.
 *
 * The session survives the engine stopping on its own (Chrome ends a
 * continuous session every so often), so it restarts itself quietly.
 */
export function createWakeListener(opts: {
  lang?: string;
  /** Called for each final phrase. Return true to keep the session alive. */
  onPhrase: (phrase: string) => boolean | void;
  /** Called when the engine reports a hard error. */
  onError?: (message: string) => void;
}): WakeListenerHandle {
  const Ctor = recognitionCtor();
  const lang = opts.lang ?? "en-US";

  let recognition: RecognitionLike | null = null;
  let running = false;
  let paused = false;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let restartDelay = 250;

  const clearRestart = () => {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
  };

  const scheduleRestart = () => {
    if (!running || paused) return;
    clearRestart();
    restartTimer = setTimeout(() => {
      restartTimer = null;
      start();
    }, restartDelay);
    // Back off if the engine keeps dropping, but never give up.
    restartDelay = Math.min(restartDelay * 1.5, 4000);
  };

  const start = () => {
    if (!running || paused || !Ctor) return;
    try {
      const instance = new Ctor();
      recognition = instance;
      instance.lang = lang;
      instance.continuous = true;
      instance.interimResults = false;
      instance.maxAlternatives = 3;

      instance.onresult = (event) => {
        const list = event.results;
        for (let i = 0; i < list.length; i++) {
          const result = list[i];
          if (!result.isFinal) continue;
          const best = bestAlternative(result);
          if (!best.text) continue;
          const keepGoing = opts.onPhrase(best.text);
          if (keepGoing === false) {
            stop();
            return;
          }
        }
      };

      instance.onerror = (event) => {
        const code = event.error;
        if (code === "no-speech" || code === "aborted") return;
        if (code === "not-allowed" || code === "service-not-allowed") {
          opts.onError?.("Microphone access was denied.");
          stop();
          return;
        }
        // network / audio-capture errors are recoverable.
      };

      instance.onend = () => {
        recognition = null;
        scheduleRestart();
      };

      instance.start();
      restartDelay = 250;
    } catch {
      scheduleRestart();
    }
  };

  const stop = () => {
    running = false;
    paused = false;
    clearRestart();
    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      } catch {}
      recognition = null;
    }
  };

  if (Ctor) {
    running = true;
    start();
  }

  return {
    stop,
    pause() {
      paused = true;
      clearRestart();
      if (recognition) {
        try {
          recognition.abort();
        } catch {}
        recognition = null;
      }
    },
    resume() {
      if (!paused) return;
      paused = false;
      restartDelay = 250;
      start();
    },
    get active() {
      return running && !paused;
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Number words — for speaking PINs and numbers                       */
/* ------------------------------------------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3,
  four: 4, for: 4, fore: 4, five: 5, six: 6, sicks: 6, seven: 7, eight: 8,
  ate: 8, nine: 9, niner: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, hundreds: 100, thousand: 1000, thousands: 1000,
};

const DIGITS: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
};

/**
 * Turn spoken words into digits: "seven four two" -> "742".
 * Handles digit-by-digit, grouped numbers ("seven hundred"), and
 * spoken pairs ("seven four two" stays three separate digits).
 */
export function spokenToDigits(input: string): string {
  const text = input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  if (!text) return "";

  // Already plain digits.
  if (/^\d+$/.test(text)) return text;

  // "seven hundred and forty two" — the "and" carries no value.
  const words = text.split(/\s+/).filter((w) => w && w !== "and");

  const allKnown = words.every((w) => w in NUMBER_WORDS);
  if (!allKnown) return text.replace(/\s+/g, "");

  // Grouped numbers first: "seven hundred forty two" -> 742.
  if (words.some((w) => NUMBER_WORDS[w] >= 100)) {
    const total = parseGrouped(words);
    if (total !== null) return String(total);
  }

  // "seven four two" -> "742" (word by word).
  const digitOnly = words.every((w) => NUMBER_WORDS[w] <= 9);
  if (digitOnly) {
    return words.map((w) => NUMBER_WORDS[w]).join("");
  }

  // Mixed digits and small words: "7 four 2" -> "742".
  const mixed = words.every(
    (w) => w in DIGITS || (w in NUMBER_WORDS && NUMBER_WORDS[w] <= 9)
  );
  if (mixed) {
    return words
      .map((w) => (w in DIGITS ? DIGITS[w] : NUMBER_WORDS[w]))
      .join("");
  }

  // Grouped: "twenty five" -> 25.
  const total = parseGrouped(words);
  if (total !== null) return String(total);

  return text.replace(/\s+/g, "");
}

function parseGrouped(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let sawNumber = false;

  for (const word of words) {
    const value = NUMBER_WORDS[word];
    if (value === undefined) return null;
    sawNumber = true;
    if (value === 100) {
      current = (current || 1) * 100;
    } else if (value === 1000) {
      current = (current || 1) * 1000;
    } else {
      current += value;
    }
  }
  total += current;
  return sawNumber ? total : null;
}

/* ------------------------------------------------------------------ */
/*  Intent helpers                                                     */
/* ------------------------------------------------------------------ */

const YES_WORDS = new Set([
  "yes", "yeah", "yep", "yup", "yess", "yeahs", "yes sir", "sure", "affirmative",
  "go ahead", "do it", "proceed", "confirm", "confirmed", "ok", "okay", "okey",
  "correct", "right", "exactly", "please do", "go on", "carry on", "that is right",
  "that is correct", "absolutely", "of course", "sounds good",
]);

const NO_WORDS = new Set([
  "no", "nope", "nah", "negative", "cancel", "stop", "dont", "don't",
  "do not", "abort", "nevermind", "never mind", "wait", "not now", "no thanks",
  "no thank you", "hold on", "not yet", "leave it", "skip it",
]);

/** Strip filler so "uh yeah sure that works" still reads as a yes. */
const FILLER = /^(?:uh+|um+|erm+|hmm+|well|so|okay|ok|alright|right)\b[\s,]+/i;

function intentWords(text: string): string[] {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/**
 * Was this phrase an agreement?
 *
 * The word has to be at the front of the phrase — "yes" or "yeah" at the
 * start of a reply — otherwise "I said no one should delete that" would
 * count as an agreement.
 */
export function isAffirmative(text: string): boolean {
  let t = text.toLowerCase().trim();
  if (!t) return false;
  if (isNegative(t)) return false;

  t = t.replace(FILLER, "").trim();
  if (!t) return false;

  // Whole-phrase matches.
  if (YES_WORDS.has(t)) return true;

  const words = intentWords(t);
  if (!words.length) return false;

  // The first meaningful word decides.
  const first = words[0];
  if (YES_WORDS.has(first)) return true;

  // "yes please", "yes do it", "yeah go ahead"
  if (YES_WORDS.has(first) && words.length > 1) return true;

  // "sounds good", "that is correct" — matched above as whole phrases.
  for (const phrase of Array.from(YES_WORDS)) {
    if (phrase.includes(" ") && t.startsWith(`${phrase} `)) return true;
  }

  return false;
}

/**
 * Was this phrase a refusal?
 * Checked before agreement so "no" always wins.
 */
export function isNegative(text: string): boolean {
  let t = text.toLowerCase().trim();
  if (!t) return false;

  t = t.replace(FILLER, "").trim();
  if (!t) return false;

  if (NO_WORDS.has(t)) return true;

  const words = intentWords(t);
  const first = words[0];
  if (NO_WORDS.has(first)) return true;

  for (const phrase of Array.from(NO_WORDS)) {
    if (phrase.includes(" ") && t.startsWith(`${phrase} `)) return true;
  }

  return false;
}

/** Strip a leading wake word like "atlas" from a spoken phrase. */
export function stripWakeWord(text: string): string {
  return text
    .trim()
    .replace(/^(hey\s+|ok\s+|okay\s+)?atlas\b[\s,]*/i, "")
    .trim();
}

/**
 * Does this phrase begin with the wake word?
 * Used to decide whether a spoken phrase is addressed to Atlas.
 */
export function hasWakeWord(text: string): boolean {
  return /^(hey\s+|ok\s+|okay\s+)?atlas\b/i.test(text.trim());
}
