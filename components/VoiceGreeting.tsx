/* ================================================================== */
/*  VoiceGreeting — the spoken opening of Atlas                        */
/*                                                                     */
/*  On `/` the orb greets and asks whether to proceed. If you answer  */
/*  yes, the voice pass is requested and checked. Everything can be    */
/*  done with speech alone — there is no button to press.              */
/*                                                                     */
/*  The mic stays open the whole way through: after Atlas asks a      */
/*  question the listener resumes as soon as it finishes speaking, so */
/*  "yes" and the pass are picked up hands-free.                      */
/* ================================================================== */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createWakeListener,
  spokenToDigits,
  voiceSupported,
  isAffirmative,
  isNegative,
  type WakeListenerHandle,
} from "@/lib/voice";
import { checkPass } from "@/lib/voice-pass";
import { speak } from "@/lib/atlas-ai";

type Stage = "greeting" | "asking" | "pass" | "checking" | "unlocked" | "denied";

const MAX_TRIES = 3;

export function VoiceGreeting({
  onUnlock,
  onCancel,
  onListeningChange,
  onSpeakingChange,
  /** The orb has already spoken the greeting — go straight to listening. */
  alreadyGreeted = false,
}: {
  onUnlock: () => void;
  onCancel: () => void;
  onListeningChange?: (listening: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  alreadyGreeted?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("greeting");
  const [heard, setHeard] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const listenerRef = useRef<WakeListenerHandle | null>(null);
  const stageRef = useRef<Stage>("greeting");
  const attempts = useRef(0);
  const unlockedRef = useRef(false);

  stageRef.current = stage;

  const supported = voiceSupported();

  /* ------------------------------------------------------------------ */
  /*  Speaking — the listener pauses while Atlas talks so it never      */
  /*  hears itself, then resumes the moment the voice falls silent.     */
  /* ------------------------------------------------------------------ */

  const say = useCallback(
    (text: string, then?: () => void) => {
      listenerRef.current?.pause();
      setListening(false);
      onListeningChange?.(false);
      onSpeakingChange?.(true);
      try {
        speak(text);
      } catch {
        /* no speech synthesis — carry on silently */
      }

      // Resume listening a beat after the phrase is done. The speech
      // synthesis API has no reliable "finished" event across browsers,
      // so we time it from the length of the sentence.
      const words = text.split(/\s+/).length;
      const ms = Math.min(1200 + words * 330, 9000);
      window.setTimeout(() => {
        onSpeakingChange?.(false);

        // The follow-up action must run whether or not the mic comes
        // back — otherwise the app never opens.
        if (then) {
          then();
          return;
        }

        if (unlockedRef.current) return;
        if (!listenerRef.current) return;
        listenerRef.current.resume();
        setListening(true);
        onListeningChange?.(true);
      }, ms);
    },
    [onListeningChange, onSpeakingChange]
  );

  /* ------------------------------------------------------------------ */
  /*  Opening the app — the one thing that must never be missed.       */
  /* ------------------------------------------------------------------ */

  const openTheApp = useCallback(
    (words: string) => {
      unlockedRef.current = true;
      setStage("unlocked");
      // The words are spoken as Atlas moves, and the app opens straight
      // away — the opening never waits on the voice.
      say(words);
      onUnlock();
    },
    [onUnlock, say]
  );

  /* ------------------------------------------------------------------ */
  /*  Handling what was heard                                            */
  /* ------------------------------------------------------------------ */

  const handlePhrase = useCallback(
    (raw: string) => {
      const phrase = raw.trim();
      if (!phrase || unlockedRef.current) return;
      setHeard(phrase);

      const current = stageRef.current;

      if (current === "asking") {
        if (isAffirmative(phrase)) {
          setStage("pass");
          say("Speak your pass.");
          return;
        }
        if (isNegative(phrase)) {
          setMessage("As you wish. The way is open whenever you are ready.");
          say("As you wish. The way is open whenever you are ready.");
          return;
        }
        setMessage("Say yes to come in, or no to stay a while.");
        say("Say yes to come in, or no to stay a while.");
        return;
      }

      if (current === "pass" || current === "denied" || current === "checking") {
        const digits = spokenToDigits(phrase);
        const verdict = checkPass(digits, attempts.current, MAX_TRIES);

        if (verdict.result === "no-digits") {
          setMessage(`I heard "${phrase}" but not any numbers. Speak the digits.`);
          say("I heard that but not any numbers. Please speak the digits.");
          return;
        }

        if (verdict.result === "set") {
          openTheApp("Your voice pass is set. Opening Atlas now.");
          return;
        }

        if (verdict.result === "match") {
          openTheApp("Welcome back. Opening Atlas now.");
          return;
        }

        attempts.current += 1;
        const left = verdict.triesLeft;
        setStage("denied");
        if (left > 0) {
          setMessage(
            `That is not your pass. ${left} ${left === 1 ? "try" : "tries"} left.`
          );
          say(
            `That is not your pass. ${left} ${left === 1 ? "try" : "tries"} left.`
          );
          // Go straight back to listening for the pass.
          window.setTimeout(() => {
            if (!unlockedRef.current) setStage("pass");
          }, 400);
        } else {
          setMessage("That is not your pass. Use the form to sign in.");
          say("That is not your pass. Please use the form to sign in.");
        }
      }
    },
    [openTheApp, say]
  );

  /* ------------------------------------------------------------------ */
  /*  Start the listener                                                  */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!supported) {
      setMessage(
        "This browser cannot listen. Use the Login button on this screen to sign in."
      );
      return;
    }

    const listener = createWakeListener({
      onPhrase: handlePhrase,
      onError: (message) => setMessage(message),
    });
    listenerRef.current = listener;
    setListening(listener.active);
    onListeningChange?.(listener.active);

    return () => {
      listener.stop();
      listenerRef.current = null;
    };
  }, [supported, handlePhrase, onListeningChange]);

  /* ------------------------------------------------------------------ */
  /*  Open with the greeting, then ask                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    // When the orb has already spoken its greeting, do not greet twice.
    // Go straight to listening for the answer.
    if (alreadyGreeted) {
      setStage("asking");
      return;
    }

    const hour = new Date().getHours();
    const part =
      hour >= 5 && hour < 12
        ? "Good morning"
        : hour >= 12 && hour < 17
          ? "Good afternoon"
          : "Good evening";
    const line = `${part}. Would you like to proceed?`;

    // A short beat so the orb is seen before it speaks.
    const timer = window.setTimeout(() => {
      setStage("asking");
      say(line);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [say, alreadyGreeted]);

  /* ------------------------------------------------------------------ */
  /*  Keyboard escape is the only way out that is not speech             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[965] flex justify-center px-5 pb-8">
      <div className="pointer-events-auto w-full max-w-[520px] rounded-2xl border-2 border-marble/35 bg-wine/95 px-6 py-5 text-marble shadow-2xl backdrop-blur">
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

          {/* A live pulse shows the microphone is open. No buttons. */}
          <div
            className="flex shrink-0 items-center gap-2 pt-1"
            aria-live="polite"
            aria-label={listening ? "Listening" : "Not listening"}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full transition-opacity ${
                listening ? "animate-pulse bg-marble" : "opacity-25 bg-marble"
              }`}
            />
            <span className="font-ui text-[12px] uppercase tracking-[0.16em] opacity-60">
              {listening ? "Listening" : "Quiet"}
            </span>
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
