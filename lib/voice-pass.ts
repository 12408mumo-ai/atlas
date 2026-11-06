/* ================================================================== */
/*  lib/voice-pass.ts — the spoken pass                               */
/*                                                                     */
/*  The pass is a short number you speak to open the app. It is kept */
/*  only in this browser, as a hash. Nothing is sent anywhere.        */
/* ================================================================== */

const PIN_KEY = "atlas.voice-pin.v1";

/** Store a short numeric pass as a simple hash. */
export function hashPin(pin: string): string {
  let h = 2166136261;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** The storage that holds the pass, whether it is a browser or a test. */
function storage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    /* storage blocked by the browser */
  }
  return null;
}

/** The stored hash of the pass, or null if none is set. */
export function getStoredPin(): string | null {
  const s = storage();
  if (!s) return null;
  try {
    return s.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

/** Save a pass. Only the hash is kept. */
export function setStoredPin(pin: string) {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(PIN_KEY, hashPin(pin));
  } catch {}
}

/** Forget the pass entirely. */
export function clearStoredPin() {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(PIN_KEY);
  } catch {}
}

export type PassVerdict =
  /** No pass is set yet — this one becomes the pass. */
  | { result: "set"; digits: string }
  /** The pass matches. */
  | { result: "match"; digits: string }
  /** The pass does not match. */
  | { result: "mismatch"; digits: string; triesLeft: number }
  /** Nothing usable was heard. */
  | { result: "no-digits" };

/**
 * Check spoken digits against the stored pass.
 *
 * Kept separate from the components so the rule is the same everywhere
 * and can be tested without a browser.
 */
export function checkPass(digits: string, triesUsed = 0, maxTries = 3): PassVerdict {
  if (!digits || !/\d/.test(digits)) {
    return { result: "no-digits" };
  }

  const stored = getStoredPin();
  if (!stored) {
    setStoredPin(digits);
    return { result: "set", digits };
  }

  if (stored === hashPin(digits)) {
    return { result: "match", digits };
  }

  const triesLeft = Math.max(0, maxTries - triesUsed - 1);
  return { result: "mismatch", digits, triesLeft };
}
