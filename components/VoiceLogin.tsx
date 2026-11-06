/* ================================================================== */
/*  VoiceLogin — speak a PIN to unlock the app                        */
/*                                                                     */
/*  The PIN is set in Atlas AI settings. Speech recognition turns     */
/*  spoken numbers into digits, and the PIN is compared against a     */
/*  locally stored hash. Nothing is sent anywhere.                    */
/* ================================================================== */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listenOnce, spokenToDigits, voiceSupported } from "@/lib/voice";
import { speak } from "@/lib/atlas-ai";
import { loadAISettings } from "@/lib/atlas-ai";

const PIN_KEY = "atlas.voice-pin.v1";

/** Store a short numeric PIN as a simple hash. */
function hashPin(pin: string): string {
  let h = 2166136261;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function getStoredPin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function setStoredPin(pin: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PIN_KEY, hashPin(pin));
  } catch {}
}

export function VoiceLogin({
  onUnlock,
  onCancel,
}: {
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<"idle" | "listening" | "checking" | "denied">("idle");
  const [heard, setHeard] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const listeningRef = useRef(false);
  const attempts = useRef(0);

  const supported = voiceSupported();

  const listen = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    setStage("listening");
    setHeard(null);
    setMessage(null);

    try {
      const result = await listenOnce({ timeoutMs: 10000 });
      if (!result.text) {
        setStage("idle");
        setMessage("I did not hear anything.");
        return;
      }
      setHeard(result.text);

      const digits = spokenToDigits(result.text);
      if (!digits) {
        setStage("idle");
        setMessage(`I heard "${result.text}" but not any numbers. Try saying the digits.`);
        return;
      }

      setStage("checking");
      const stored = getStoredPin();
      if (!stored) {
        // No PIN set yet — this becomes the first one.
        setStoredPin(digits);
        speak("Your voice pass is set. Opening Atlas now.", loadAISettings());
        setTimeout(onUnlock, 900);
        return;
      }

      if (stored === hashPin(digits)) {
        speak("Welcome back. Opening Atlas now.", loadAISettings());
        setStage("idle");
        setTimeout(onUnlock, 900);
        return;
      }

      attempts.current += 1;
      setStage("denied");
      const left = Math.max(0, 3 - attempts.current);
      setMessage(
        left > 0
          ? `That is not your pass. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "That is not your pass. Use the form to sign in."
      );
      speak(
        left > 0 ? "That is not your pass. Try again." : "That is not your pass.",
        loadAISettings()
      );
    } catch (error) {
      setStage("idle");
      setMessage(
        error instanceof Error ? error.message : "I could not hear that."
      );
    } finally {
      listeningRef.current = false;
    }
  }, [onUnlock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[970] grid place-items-center bg-wine/95 px-6">
      <div className="w-full max-w-[440px] rounded-2xl border-2 border-marble/40 bg-wine p-7 text-marble">
        <h2 className="font-display text-[30px] tracking-[0.1em]">Voice pass</h2>
        <p className="mt-2 font-ui text-[17px] leading-relaxed opacity-75">
          {getStoredPin()
            ? "Speak your digits and I will open the way."
            : "No pass is set yet. Speak the digits you want to use as your pass."}
        </p>

        {heard && (
          <p className="mt-4 font-ui text-[15px] uppercase tracking-[0.14em] opacity-60">
            Heard: {heard}
          </p>
        )}
        {message && (
          <p className="mt-3 rounded-xl bg-marble/12 px-4 py-3 font-ui text-[17px] leading-relaxed">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void listen()}
          disabled={stage === "listening" || stage === "checking"}
          className="btn-gold mt-6 w-full py-3.5 text-[18px] disabled:opacity-50"
        >
          {stage === "listening"
            ? "Listening…"
            : stage === "checking"
              ? "Checking…"
              : "Speak your pass"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full py-2 font-ui text-[16px] underline underline-offset-4 opacity-70"
        >
          Use the form instead
        </button>

        {!supported && (
          <p className="mt-3 font-ui text-[14px] leading-relaxed opacity-60">
            This browser has no speech recognition. Use the form instead.
          </p>
        )}
      </div>
    </div>
  );
}

export default VoiceLogin;
