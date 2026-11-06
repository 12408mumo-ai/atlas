/* ================================================================== */
/*  lib/voice.ts — speech input for Atlas                              */
/*                                                                     */
/*  Wraps the browser's SpeechRecognition API. When the browser has  */
/*  no support (or the user denies the mic), callers fall back to a  */
/*  typed input so the flow never dead-ends.                          */
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
      let best = { text: "", confidence: 0 };
      for (let i = 0; i < list.length; i++) {
        const result = list[i];
        if (!result.isFinal) continue;
        for (let a = 0; a < result.length; a++) {
          const alt = result[a];
          const text = alt.transcript?.trim() ?? "";
          if (text.length > best.text.length) {
            best = { text, confidence: alt.confidence ?? 0 };
          }
        }
      }
      finish(() => resolve(best));
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
          error instanceof Error
            ? error.message
            : "Could not start listening."
        )
      );
    }
  });
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

  const words = text.split(/\s+/).filter(Boolean);
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
  "yes", "yeah", "yep", "yup", "sure", "affirmative", "go ahead",
  "do it", "proceed", "confirm", "ok", "okay", "correct", "right",
]);

const NO_WORDS = new Set([
  "no", "nope", "nah", "negative", "cancel", "stop", "dont", "don't",
  "do not", "abort", "nevermind", "never mind", "wait",
]);

export function isAffirmative(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/[^a-z\s]/g, "");
  if (!t) return false;
  if (YES_WORDS.has(t)) return true;
  return t.split(/\s+/).some((w) => YES_WORDS.has(w)) && !isNegative(t);
}

export function isNegative(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/[^a-z\s]/g, "");
  if (!t) return false;
  if (NO_WORDS.has(t)) return true;
  return t.split(/\s+/).some((w) => NO_WORDS.has(w));
}

/** Strip a leading wake word like "atlas" from a spoken phrase. */
export function stripWakeWord(text: string): string {
  return text
    .trim()
    .replace(/^(hey\s+)?atlas[\s,]+/i, "")
    .trim();
}
