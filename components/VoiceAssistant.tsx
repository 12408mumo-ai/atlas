/* ================================================================== */
/*  VoiceAssistant — the spoken side of Atlas                         */
/*                                                                     */
/*  Opens from the docked orb. Listens, parses the command, asks    */
/*  for confirmation, then runs it against the real data.             */
/* ================================================================== */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseCommand, type ParsedCommand } from "@/lib/commands";
import { executeCommand } from "@/lib/commands-exec";
import { listenOnce, voiceSupported, isAffirmative, isNegative } from "@/lib/voice";
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
}: {
  onClose: () => void;
  onDocked?: () => void;
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
  const listeningRef = useRef(false);

  const supported = voiceSupported();

  const say = useCallback((text: string) => {
    setEntries((prev) => [
      ...prev,
      { id: idRef.current++, who: "atlas", text },
    ]);
    speak(text, loadAISettings());
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  /* ------------------------------ listening ----------------------------- */

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
          say(result.ok ? result.message : result.message);
        } else if (isNegative(cleaned)) {
          setPending(null);
          pendingRef.current = null;
          say("Very well. Nothing was changed.");
        } else {
          say("Say yes to go ahead, or no to leave it be.");
        }
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

  const startListening = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    setListening(true);
    setHeard(null);

    try {
      const result = await listenOnce({ timeoutMs: 12000 });
      setHeard(result.text || null);
      if (result.text) {
        await runCommand(result.text);
      } else {
        say("I heard nothing. Say it again, or type it below.");
      }
    } catch (error) {
      say(
        error instanceof Error
          ? error.message
          : "I could not hear that. Type it below instead."
      );
    } finally {
      listeningRef.current = false;
      setListening(false);
    }
  }, [runCommand, say]);

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

  /* ------------------------------ shortcuts ----------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onClose();
      }
      if (e.key === " " && e.ctrlKey && !listeningRef.current) {
        e.preventDefault();
        void startListening();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, startListening]);

  const handleClose = () => {
    stopSpeaking();
    setOpen(false);
    onClose();
  };

  return (
    <>
      {/* The docked name tab — click to open the assistant */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          onDocked?.();
        }}
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
                {listening ? "Listening…" : pending ? "Waiting for yes or no" : "Speak or type"}
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
                  Try: &ldquo;add a task called finish the report&rdquo;
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
            <button
              type="button"
              onClick={() => void startListening()}
              disabled={listening || busy}
              className="btn-gold mb-3 w-full py-3.5 text-[18px] disabled:opacity-50"
            >
              {listening ? "Listening…" : busy ? "Working…" : "Speak a command"}
            </button>

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
