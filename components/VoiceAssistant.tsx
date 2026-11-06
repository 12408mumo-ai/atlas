/* ================================================================== */
/*  VoiceAssistant — the spoken side of Atlas                         */
/*                                                                     */
/*  Opens from the docked orb. Listens, parses the command, asks    */
/*  for confirmation, then runs it against the real data.             */
/*                                                                     */
/*  The microphone stays open so the whole exchange runs by voice:   */
/*  ask for something, Atlas confirms, say yes, and it is done.      */
/*  "Atlas" wakes it from idle when the panel is closed.              */
/* ================================================================== */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseCommand, type ParsedCommand } from "@/lib/commands";
import { executeCommand } from "@/lib/commands-exec";
import {
  createWakeListener,
  voiceSupported,
  isAffirmative,
  isNegative,
  stripWakeWord,
  hasWakeWord,
  type WakeListenerHandle,
} from "@/lib/voice";
import { loadAISettings, speak, stopSpeaking } from "@/lib/atlas-ai";

type Entry = {
  id: number;
  who: "atlas" | "you";
  text: string;
};

type Pending = {
  command: ParsedCommand;
  action: NonNullable<ParsedCommand["action"]>;
};

export function VoiceAssistant({
  onClose,
  onDocked,
  onListeningChange,
  onSpeakingChange,
}: {
  onClose: () => void;
  onDocked?: () => void;
  onListeningChange?: (listening: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [heard, setHeard] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(0);
  const pendingRef = useRef<Pending | null>(null);
  const listenerRef = useRef<WakeListenerHandle | null>(null);
  const openRef = useRef(false);
  const lastSpokeAt = useRef(0);

  openRef.current = open;

  const supported = voiceSupported();

  /* ------------------------------------------------------------------ */
  /*  Speaking — pause the mic while Atlas talks, then reopen it.      */
  /* ------------------------------------------------------------------ */

  const say = useCallback(
    (text: string) => {
      setEntries((prev) => [
        ...prev,
        { id: idRef.current++, who: "atlas", text },
      ]);

      // Never let the microphone hear the assistant's own voice.
      listenerRef.current?.pause();
      setListening(false);
      onListeningChange?.(false);
      onSpeakingChange?.(true);

      try {
        speak(text, loadAISettings());
      } catch {
        /* no speech synthesis — the transcript still shows the reply */
      }

      const words = text.split(/\s+/).length;
      const ms = Math.min(900 + words * 300, 8000);
      window.setTimeout(() => {
        onSpeakingChange?.(false);
        const listener = listenerRef.current;
        if (!listener) return;
        listener.resume();
        setListening(listener.active);
        onListeningChange?.(listener.active);
        lastSpokeAt.current = Date.now();
      }, ms);
    },
    [onListeningChange, onSpeakingChange]
  );

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  /* ------------------------------------------------------------------ */
  /*  Running a command                                                  */
  /* ------------------------------------------------------------------ */

  const runCommand = useCallback(
    async (phrase: string) => {
      const cleaned = phrase.trim();
      if (!cleaned) {
        say("I did not catch that. Please say it again.");
        return;
      }

      setEntries((prev) => [...prev, { id: idRef.current++, who: "you", text: cleaned }]);

      // If we are waiting on a yes/no, handle that first.
      const waiting = pendingRef.current;
      if (waiting) {
        if (isAffirmative(cleaned)) {
          const result = executeCommand(waiting.action);
          setPending(null);
          pendingRef.current = null;
          say(result.message);
          return;
        }
        if (isNegative(cleaned)) {
          setPending(null);
          pendingRef.current = null;
          say("Very well. Nothing was changed.");
          return;
        }
        say("Say yes to go ahead, or no to leave it be.");
        return;
      }

      const parsed = parseCommand(cleaned);
      if (!parsed.understood || !parsed.action) {
        say(parsed.reply);
        return;
      }

      if (parsed.action.type === "report") {
        const result = executeCommand(parsed.action);
        say(result.message);
        return;
      }

      // Always confirm before changing anything.
      const next: Pending = { command: parsed, action: parsed.action };
      setPending(next);
      pendingRef.current = next;
      const phraseText = parsed.confirmation ?? "Do this";
      say(`${phraseText}. Say yes to go ahead, or no to leave it be.`);
    },
    [say]
  );

  /* ------------------------------------------------------------------ */
  /*  The microphone session                                             */
  /* ------------------------------------------------------------------ */

  const handlePhrase = useCallback(
    (raw: string) => {
      const phrase = raw.trim();
      if (!phrase) return;
      setHeard(phrase);

      // While a reply is still being spoken, ignore anything picked up
      // from the tail of that audio.
      if (Date.now() - lastSpokeAt.current < 400) return;

      // The wake word opens the panel and hands the rest to the parser.
      if (hasWakeWord(phrase)) {
        const command = stripWakeWord(phrase);
        if (!command) {
          // Just the name — wake up and greet.
          if (!openRef.current) {
            setOpen(true);
            onDocked?.();
          }
          say("I am here. Give me a command.");
          return;
        }
        if (!openRef.current) {
          setOpen(true);
          onDocked?.();
        }
        void runCommand(command);
        return;
      }

      // Without the wake word, only act while the panel is open.
      if (!openRef.current) return;
      void runCommand(phrase);
    },
    [runCommand, say, onDocked]
  );

  useEffect(() => {
    if (!supported) return;

    const listener = createWakeListener({
      onPhrase: handlePhrase,
      onError: (message) => {
        setEntries((prev) => [
          ...prev,
          { id: idRef.current++, who: "atlas", text: message },
        ]);
      },
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
  /*  Typed input                                                        */
  /* ------------------------------------------------------------------ */

  const submitTyped = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const value = typed.trim();
      if (!value) return;
      setTyped("");
      await runCommand(value);
    },
    [typed, runCommand]
  );

  /* ------------------------------------------------------------------ */
  /*  Shortcuts                                                          */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleClose = () => {
    stopSpeaking();
    setOpen(false);
    onClose();
  };

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (next) onDocked?.();
      return next;
    });
  };

  return (
    <>
      {/* The docked name tab — click to open the assistant */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed left-[2px] top-[calc(50%+118px)] z-[952] rounded-r-pill border-2 border-l-0 border-marble/60 bg-wine px-3 py-2 font-display text-[13px] uppercase tracking-[0.2em] text-marble transition-colors hover:bg-marble hover:text-wine"
        aria-label="Open Atlas AI"
      >
        Atlas
      </button>

      {open && (
        <div
          className="fixed inset-y-0 left-0 z-[960] flex w-full max-w-[460px] flex-col bg-wine text-marble shadow-2xl"
          role="dialog"
          aria-label="Atlas AI"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-marble/25 px-5 py-4">
            <div>
              <h2 className="font-display text-[26px] tracking-[0.1em]">Atlas AI</h2>
              <p className="font-ui text-[13px] uppercase tracking-[0.18em] opacity-60">
                {pending
                  ? "Waiting for yes or no"
                  : listening
                    ? "Listening…"
                    : "Say “Atlas” to wake me"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/atlas"
                className="rounded-pill border-2 border-marble/40 px-4 py-2 font-ui text-[14px] uppercase tracking-[0.16em] transition-colors hover:bg-marble hover:text-wine"
              >
                Deep chat
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-marble/50 font-ui text-[22px] leading-none transition-colors hover:bg-marble hover:text-wine"
                aria-label="Close Atlas AI"
              >
                ×
              </button>
            </div>
          </div>

          {/* Transcript */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {entries.length === 0 && (
              <div className="pt-6 text-center">
                <p className="font-display text-[21px] leading-relaxed opacity-80">
                  I hold your world. Give me a command and I will carry it out.
                </p>
                <p className="mt-4 font-ui text-[15px] leading-relaxed opacity-60">
                  Say &ldquo;Atlas, add a task called finish the report&rdquo;
                  <br />
                  &ldquo;log an expense of 20 for lunch&rdquo;
                  <br />
                  &ldquo;note that the library closes at six&rdquo;
                </p>
              </div>
            )}
            {entries.map((e) => (
              <div
                key={e.id}
                className={
                  e.who === "atlas"
                    ? "max-w-[92%] rounded-2xl rounded-bl-sm bg-marble/12 px-4 py-3"
                    : "ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-marble px-4 py-3 text-wine"
                }
              >
                <p className="font-ui text-[17px] leading-relaxed">{e.text}</p>
              </div>
            ))}
            {heard && (
              <p className="font-ui text-[13px] uppercase tracking-[0.16em] opacity-50">
                Heard: {heard}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="border-t-2 border-marble/25 px-5 py-4">
            <form onSubmit={submitTyped} className="flex gap-2">
              <input
                className="field flex-1 py-2.5"
                placeholder="Or type a command…"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label="Type a command"
              />
              <button type="submit" className="btn-gold px-5 py-2.5">
                Send
              </button>
            </form>

            {!supported && (
              <p className="mt-2 font-ui text-[13px] leading-relaxed opacity-60">
                This browser has no speech recognition. Typing works everywhere.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default VoiceAssistant;
