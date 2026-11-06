/* ================================================================== */
/*  VoiceGreeting — the spoken opening of Atlas                        */
/*                                                                     */
/*  On `/` the orb greets and asks whether to proceed to login.       */
/*  If you answer yes, the voice pass is requested and checked.       */
/*  Everything can be done with speech alone.                         */
/* ================================================================== */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listenOnce,
  spokenToDigits,
  voiceSupported,
  isAffirmative,
  isNegative,
} from "@/lib/voice";
import { speak } from "@/lib/atlas-ai";
import { getStoredPin, setStoredPin } from "@/components/VoiceLogin";

type Stage = "greeting" | "asking" | "pass" | "checking" | "unlocked" | "denied";

export function VoiceGreeting({
  onUnlock,
  onCancel,
}: {
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<Stage>("greeting");
  const [heard, setHeard] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const listeningRef = useRef(false);
  const attempts = useRef(0);
  const firstRun = useRef(true);

  const supported = voiceSupported();

  const hashPin = useCallback((pin: string) => {
    let h = 2166136261;
    for (let i = 0; i < pin.length; i++) {
      h ^= pin.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }, []);

  /** Listen for one phrase and act on it. */
  const listen = useCallback(
    async (handle: (phrase: string) => Promise<boolean> | boolean) => {
      if (listeningRef.current) return;
      listeningRef.current = true;
      setHeard(null);

      try {
        const result = await listenOnce({ timeoutMs: 12000 });
        if (!result.text) {
          setMessage("I did not hear anything.");
          return;
        }
        setHeard(result.text);
        await handle(result.text);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "I could not hear that."
        );
      } finally {
        listeningRef.current = false;
      }
    },
    []
  );

  /* ---------------------- stage: ask to proceed ---------------------- */

  const askToProceed = useCallback(async () => {
    setStage("asking");
    await listen(async (phrase) => {
      if (isAffirmative(phrase)) {
        setStage("pass");
        return true;
      }
      if (isNegative(phrase)) {
        setMessage("As you wish. The way is open whenever you are ready.");
        speak("As you wish. The way is open whenever you are ready.");
        return false;
      }
      setMessage("Say yes to come in, or no to stay a while.");
      return false;
    });
  }, [listen]);

  /* ------------------------- stage: voice pass ----------------------- */

  const checkPass = useCallback(
    async (phrase: string) => {
      const digits = spokenToDigits(phrase);
      if (!digits) {
        setMessage(`I heard "${phrase}" but not any numbers. Speak the digits.`);
        return false;
      }

      setStage("checking");
      const stored = getStoredPin();
      if (!stored) {
        setStoredPin(digits);
        speak("Your voice pass is set. Opening Atlas now.");
        setStage("unlocked");
        setTimeout(onUnlock, 1000);
        return true;
      }

      if (stored === hashPin(digits)) {
        speak("Welcome back. Opening Atlas now.");
        setStage("unlocked");
        setTimeout(onUnlock, 1000);
        return true;
      }

      attempts.current += 1;
      const left = Math.max(0, 3 - attempts.current);
      setStage("denied");
      setMessage(
        left > 0
          ? `That is not your pass. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "That is not your pass. Use the form to sign in."
      );
      speak(left > 0 ? "That is not your pass. Try again." : "That is not your pass.");
      return false;
    },
    [hashPin, onUnlock]
  );

  /* --------------------------- run the flow -------------------------- */

  useEffect(() => {
    // Wait a beat so the greeting audio can finish before the mic opens.
    const timer = setTimeout(() => {
      if (firstRun.current) {
        firstRun.current = false;
        setStage("asking");
        void askToProceed();
      }
    }, 2600);
    return () => clearTimeout(timer);
  }, [askToProceed]);

  // When we reach the pass stage, open the mic straight away.
  useEffect(() => {
    if (stage !== "pass") return;
    void listen(checkPass);
  }, [stage, listen, checkPass]);

  const retry = () => {
    setMessage(null);
    setHeard(null);
    setStage("asking");
    void askToProceed();
  };

  const retryPass = () => {
    setMessage(null);
    setHeard(null);
    setStage("pass");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[965] flex justify-center px-5 pb-8">
      <div className="w-full max-w-[520px] rounded-2xl border-2 border-marble/35 bg-wine/95 px-6 py-5 text-marble shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[19px] uppercase tracking-[0.18em] opacity-70">
              {stage === "asking" && "Do you wish to come in?"}
              {stage === "pass" && "Speak your pass"}
              {stage === "checking" && "Checking…"}
              {stage === "unlocked" && "Welcome"}
              {stage === "denied" && "Not quite"}
              {stage === "greeting" && "Atlas"}
            </p>
            {heard && (
              <p className="mt-1 font-ui text-[13px] uppercase tracking-[0.14em] opacity-50">
                Heard: {heard}
              </p>
            )}
            {message && (
              <p className="mt-2 font-ui text-[16px] leading-relaxed opacity-80">
                {message}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {stage === "denied" && (
              <button
                type="button"
                onClick={retryPass}
                className="rounded-pill border-2 border-marble/50 px-4 py-2 font-ui text-[14px] uppercase tracking-[0.14em] transition-colors hover:bg-marble hover:text-wine"
              >
                Again
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-pill border-2 border-marble/50 px-4 py-2 font-ui text-[14px] uppercase tracking-[0.14em] transition-colors hover:bg-marble hover:text-wine"
            >
              Use form
            </button>
          </div>
        </div>

        {!supported && (
          <p className="mt-3 font-ui text-[14px] leading-relaxed opacity-60">
            This browser cannot listen. Use the Login button instead.
          </p>
        )}
      </div>
    </div>
  );
}

export default VoiceGreeting;
