"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { applyAddition, DEFAULT_MODEL, destination, interpret, KEY_KEY, MODEL_KEY, type AssistantAction } from "@/lib/assistant";

const Orb = lazy(() => import("@/components/Orb"));
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: SpeechEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; onstart: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type RecognitionConstructor = new () => Recognition;
const wakePattern = /\b(?:atlas|a[.\s-]*t[.\s-]*l[.\s-]*a[.\s-]*s)\b[\s,.!?;:-]*/i;
const categoryLabel = { goals: "goals", places: "places", experiences: "things to do", becoming: "who you want to become" };

export function AssistantOrb() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const pathnameRef = useRef(pathname); pathnameRef.current = pathname;
  const [panel, setPanel] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [awake, setAwake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Extract<AssistantAction, { type: "add_life" }> | null>(null);
  const [message, setMessage] = useState("Enable wake listening, then say ‘Atlas’ and your command.");
  const [draft, setDraft] = useState("");
  const active = useRef(false), busyRef = useRef(false), pendingRef = useRef(false), awakeRef = useRef(false);
  const recognition = useRef<Recognition | null>(null);
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const commandHandler = useRef<(text: string) => void>(() => {});
  const finishHandler = useRef<(approve: boolean) => void>(() => {});
  const clearWake = useCallback(() => { awakeRef.current = false; setAwake(false); if (wakeTimer.current) clearTimeout(wakeTimer.current); }, []);
  const stop = useCallback(() => {
    active.current = false; setEnabled(false); setRecognizing(false); clearWake();
    if (restartTimer.current) clearTimeout(restartTimer.current);
    const current = recognition.current; recognition.current = null;
    if (current) { current.onend = null; current.onerror = null; current.onresult = null; try { current.abort(); } catch {} }
  }, [clearWake]);
  useEffect(() => () => { active.current = false; if (restartTimer.current) clearTimeout(restartTimer.current); if (wakeTimer.current) clearTimeout(wakeTimer.current); request.current?.abort(); try { recognition.current?.abort(); } catch {} }, []);
  const entry = pathname === "/" || pathname === "/login" || pathname === "/clock" || pathname === "/pin";
  useEffect(() => { if (entry) stop(); }, [entry, stop]);

  const run = useCallback(async (text: string) => {
    const command = text.trim(); if (!command || busyRef.current || pendingRef.current) return;
    busyRef.current = true; setBusy(true); clearWake(); setPanel(true); setMessage(`Heard: “${command}” — thinking…`);
    const controller = new AbortController(); request.current = controller;
    try {
      const action = await interpret(command, sessionStorage.getItem(KEY_KEY) || "", localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL, controller.signal);
      if (controller.signal.aborted) return;
      if (action.type === "open") {
        const url = destination(action.target)!;
        const [path, query] = url.split("?");
        if (path === pathnameRef.current && query) window.dispatchEvent(new CustomEvent("atlas:show-view", { detail: new URLSearchParams(query).get("view") }));
        else router.push(url);
        setMessage(`Opening ${action.target.replaceAll("_", " ")}.`);
      } else if (action.type === "add_life") {
        pendingRef.current = true; setPending(action); setMessage("Please review this addition before saving it.");
      } else setMessage(action.message);
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Could not process that command."); }
    finally { if (request.current === controller) request.current = null; busyRef.current = false; setBusy(false); }
  }, [clearWake, router]);
  commandHandler.current = (text) => {
    if (pendingRef.current) {
      if (/^(?:approve|confirm|yes|save)(?: it)?[.!]?$/i.test(text.trim())) finishHandler.current(true);
      else if (/^(?:cancel|no|reject)(?: it)?[.!]?$/i.test(text.trim())) finishHandler.current(false);
      else setMessage("Say ‘Atlas, approve’ or ‘Atlas, cancel’, or use the buttons.");
      clearWake();
    } else void run(text);
  };

  const start = () => {
    const win = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Constructor) { setMessage("Wake listening is not supported in this browser. You can still type commands."); return; }
    const instance = new Constructor(); recognition.current = instance; active.current = true; setEnabled(true);
    instance.continuous = true; instance.interimResults = false; instance.lang = "en-US";
    instance.onstart = () => { if (active.current) { setRecognizing(true); if (!pendingRef.current && !busyRef.current && !awakeRef.current) setMessage("Listening for ‘Atlas’…"); } };
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]; if (!result.isFinal || busyRef.current || !active.current) continue;
        const text = result[0].transcript.trim();
        const match = wakePattern.exec(text);
        if (match) {
          const command = text.slice(match.index + match[0].length).trim();
          setPanel(true); awakeRef.current = true; setAwake(true);
          if (wakeTimer.current) clearTimeout(wakeTimer.current);
          if (command) commandHandler.current(command);
          else { setMessage("I’m listening. Say your command."); wakeTimer.current = setTimeout(() => { clearWake(); setMessage("Listening for ‘Atlas’…"); }, 10000); }
        } else if (awakeRef.current && text) commandHandler.current(text);
      }
    };
    instance.onerror = ({ error }) => {
      if (!active.current) return;
      if (error === "not-allowed" || error === "service-not-allowed" || error === "audio-capture") { stop(); setMessage("Microphone access is unavailable or denied. Check browser permissions, then try again."); }
      else if (error !== "no-speech" && error !== "aborted") { stop(); setMessage(`Speech recognition stopped (${error}). You can try again or type a command.`); }
    };
    instance.onend = () => { setRecognizing(false); if (active.current) restartTimer.current = setTimeout(() => { if (active.current) try { instance.start(); } catch { stop(); setMessage("Speech recognition stopped. Enable it again to retry."); } }, 400); };
    try { instance.start(); } catch { stop(); setMessage("Could not start speech recognition. Check microphone permissions."); }
  };
  if (entry) return null;
  const finish = (approve: boolean) => {
    const action = pending; if (!action) return;
    if (!approve) setMessage("Cancelled. Nothing was added.");
    else if (applyAddition(action)) setMessage(`Added “${action.title}” to ${categoryLabel[action.category]}.`);
    else setMessage("Could not save. Browser storage may be full.");
    pendingRef.current = false; setPending(null);
  };
  finishHandler.current = finish;
  return <aside aria-label="Atlas assistant" className="fixed bottom-4 left-3 z-[950] sm:bottom-6 sm:left-5">
    <button type="button" aria-label={panel ? "Close Atlas assistant" : "Open Atlas assistant"} aria-expanded={panel} onClick={() => setPanel(!panel)} className={`relative h-14 w-14 overflow-hidden rounded-full bg-[#27333b] ring-2 ring-[#C2B280] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2B280] ${awake || busy ? "atlas-assistant-spinning" : ""}`}>
      <span className="absolute inset-2 rounded-full border-2 border-[#C2B280] bg-[#36454F]" />
      <Suspense fallback={null}><Orb colors={["#C2B280", "#eee9d9", "#36454F"]} backgroundColor="#27333b" size={0.9} speed={1.5} paused={!awake && !busy} followCursor={false} rotateOnHover={false} dpr={1} /></Suspense>
    </button>
    {panel && <div className="absolute bottom-16 left-0 w-[min(340px,calc(100vw-24px))] rounded-2xl border border-[#C2B280]/60 bg-[#27333b] p-4 text-[#eee9d9] shadow-xl">
      <div className="flex items-center justify-between gap-2"><h2 className="font-display text-xl">A.T.L.A.S.</h2><button type="button" onClick={() => setPanel(false)} className="font-ui text-sm underline">Close</button></div>
      <p role="status" aria-live="polite" className="mt-3 break-words font-body text-base">{message}</p>
      <p className="mt-2 font-ui text-xs text-[#C2B280]">{enabled ? (recognizing ? "Microphone on · wake listening" : "Microphone restarting…") : "Microphone off"}</p>
      <button type="button" onClick={() => { if (enabled) { stop(); setMessage("Wake listening is off."); } else start(); }} className="mt-3 rounded-full border border-[#C2B280] px-4 py-2 font-ui text-sm">{enabled ? "Stop listening" : "Enable wake listening"}</button>
      {pending && <div className="mt-3 rounded-xl border border-[#C2B280]/50 p-3 font-body"><p>Add <strong>{pending.title}</strong> to {categoryLabel[pending.category]}?</p><p className="mt-1 text-sm">Say “Atlas, approve” or “Atlas, cancel”, or use the buttons.</p>{pending.notes && <p className="mt-1 whitespace-pre-wrap">Notes: {pending.notes}</p>}<div className="mt-3 flex gap-2"><button type="button" onClick={() => finish(true)} className="rounded-full bg-[#C2B280] px-4 py-2 font-ui text-sm text-[#27333b]">Approve</button><button type="button" onClick={() => finish(false)} className="rounded-full border border-[#C2B280] px-4 py-2 font-ui text-sm">Cancel</button></div></div>}
      <form onSubmit={e => { e.preventDefault(); const text = draft; setDraft(""); void run(text); }} className="mt-3 flex gap-2"><label className="sr-only" htmlFor="atlas-command">Type a command</label><input id="atlas-command" className="min-w-0 flex-1 rounded-lg bg-[#eee9d9] px-3 py-2 font-ui text-sm text-[#27333b]" placeholder="Type a command" maxLength={1000} value={draft} onChange={e => setDraft(e.target.value)} /><button type="submit" disabled={busy || !!pending || !draft.trim()} className="rounded-lg bg-[#C2B280] px-3 font-ui text-sm text-[#27333b] disabled:opacity-50">Send</button></form>
      <Link href="/atlas" onClick={() => setPanel(false)} className="mt-3 inline-block font-ui text-xs underline">Connection settings &amp; help</Link>
    </div>}
  </aside>;
}
