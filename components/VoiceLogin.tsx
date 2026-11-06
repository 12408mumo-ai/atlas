/* ================================================================== */
/*  VoiceLogin — speak a pass to unlock the app                       */
/*                                                                     */
/*  The pass is set in Atlas AI settings. Speech recognition turns     */
/*  spoken numbers into digits, and the pass is compared against a     */
/*  locally stored hash. Nothing is sent anywhere.                    */
/*                                                                     */
/*  The microphone stays open so the pass can be spoken straight       */
/*  away — no button to press first.                                  */
/* ================================================================== */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createWakeListener,
  spokenToDigits,
  voiceSupported,
  type WakeListenerHandle,
} from "@/lib/voice";
import {
  checkPass,
  clearStoredPin,
  getStoredPin,
} from "@/lib/voice-pass";
import { speak } from "@/lib/atlas-ai";

export { getStoredPin, setStoredPin, clearStoredPin } from "@/lib/voice-pass";

const MAX_TRIES = 3;

export function VoiceLogin({
  onUnlock,
  onCancel,
}: {
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [heard, setHeard] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const listenerRef = useRef<WakeListenerHandle | null>(null);
  const attempts = useRef(0);
  const doneRef = useRef(false);

  const supported = voiceSupported();

  const check = useCallback(
    (phrase: string) => {
      if (doneRef.current) return;
      setHeard(phrase);

      const digits = spokenToDigits(phrase);
      const verdict = checkPass(digits, attempts.current, MAX_TRIES);

      if (verdict.result === "no-digits") {
        setMessage(`I heard "${phrase}" but not any numbers. Try saying the digits.`);
        return;
      }

      if (verdict.result === "set" || verdict.result === "match") {
        doneRef.current = true;
        listenerRef.current?.stop();
        // The app opens straight away — it never waits on the voice.
        onUnlock();
        speak(
          verdict.result === "set"
            ? "Your voice pass is set. Opening Atlas now."
            : "Welcome back. Opening Atlas now."
        );
        return;
      }

      attempts.current += 1;
      const left = verdict.triesLeft;
      setMessage(
        left > 0
          ? `That is not your pass. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "That is not your pass. Use the form to sign in."
      );
      speak(
        left > 0
          ? `That is not your pass. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "That is not your pass. Please use the form to sign in."
      );
    },
    [onUnlock]
  );

  useEffect(() => {
    if (!supported) {
      setMessage("This browser has no speech recognition. Use the form instead.");
      return;
    }

    const listener = createWakeListener({
      onPhrase: check,
      onError: (message) => setMessage(message),
    });
    listenerRef.current = listener;
    setListening(listener.active);

    return () => {
      listener.stop();
      listenerRef.current = null;
    };
  }, [supported, check]);

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

        <div
          className="mt-6 flex items-center gap-3"
          aria-live="polite"
          aria-label={listening ? "Listening" : "Not listening"}
        >
          <span
            className={`inline-block h-3 w-3 rounded-full transition-opacity ${
              listening ? "animate-pulse bg-marble" : "opacity-25 bg-marble"
            }`}
          />
          <span className="font-ui text-[13px] uppercase tracking-[0.18em] opacity-60">
            {listening ? "Listening for your pass" : "Quiet"}
          </span>
        </div>

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
