"use client";

import Link from "next/link";
import { AtlasVoicePill } from "@/components/AtlasVoicePill";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAtlas, isConfigured, type ChatTurn } from "@/lib/atlas-ai";
import { describeAtlasAction, executeAtlasAction, type AtlasAction } from "@/lib/atlas-actions";
import { synthesizeVoice } from "@/lib/atlas-voice";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type Turn = ChatTurn & { id: string };

// Only explicit, unambiguous navigation requests are handled locally.
function destination(text: string): string | null {
  const match = text.trim().toLowerCase().replace(/[.!?]+$/, "").match(/^(?:please )?(?:show me|open|go to) (?:my |the )?([a-z ]+?)(?: page)?$/);
  if (!match) return null;
  return ({ study: "/study", timetable: "/study?view=timetable", courses: "/study?view=courses", assignments: "/study?view=assignments", deadlines: "/study?view=assignments", "study sessions": "/study?view=sessions", work: "/work", life: "/life", goals: "/life?view=goals", "my goals": "/life?view=goals", places: "/life?view=places", "places i want to go": "/life?view=places", experiences: "/life?view=experiences", "things to do": "/life?view=experiences", "things i want to do": "/life?view=experiences", "who i want to become": "/life?view=becoming", people: "/people", memories: "/memories", hub: "/hub" } as Record<string, string>)[match[1]] || null;
}

export function OrbConversation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<AtlasAction[]>([]);
  const pendingRef = useRef<AtlasAction[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [spokenReplies, setSpokenReplies] = useState(true);
  const [notice, setNotice] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const active = useRef(open);
  active.current = open;

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    if (!open) { const rec = recognition.current; recognition.current = null; rec?.abort(); setListening(false); audioRef.current?.pause(); return; }
    const oldOverflow = document.body.style.overflow;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), audio[controls]') || []);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [open, onClose]);
  useEffect(() => { transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight }); }, [turns, busy, pending]);

  async function send(value: string) {
    const text = value.trim();
    if (!text || busyRef.current || pendingRef.current.length) return;
    setNotice("");
    setAudioUrl("");
    const route = destination(text);
    if (route) {
      setDraft(""); onClose();
      const target = new URL(route, window.location.origin);
      if (target.pathname === window.location.pathname && target.searchParams.has("view")) {
        window.dispatchEvent(new CustomEvent("atlas:show-view", { detail: target.searchParams.get("view") }));
      }
      router.push(route); return;
    }
    if (!isConfigured()) { setNotice("Add and save an AI key in Assistant settings first."); return; }
    const user: Turn = { id: crypto.randomUUID(), role: "user", content: text };
    const next = [...turns, user];
    setDraft(""); setTurns(next); busyRef.current = true; setBusy(true);
    try {
      const result = await askAtlas(next.slice(-16).map(({ role, content }) => ({ role, content })));
      setTurns((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: result.text }]);
      pendingRef.current = result.proposedActions; setPending(result.proposedActions);
      if (spokenReplies && active.current && result.text.trim()) {
        try {
          const blob = await synthesizeVoice(result.text);
          if (active.current) setAudioUrl(URL.createObjectURL(blob));
        } catch (error) { if (active.current) setNotice(error instanceof Error ? error.message : "Voice playback failed."); }
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not contact the AI provider."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function startListening(): boolean {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) { setNotice("Speech recognition isn't supported in this browser. Type your command instead."); return false; }
    try {
      const rec = new Constructor(); recognition.current = rec;
      let result = "";
      let cancelled = false;
      rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
      rec.onresult = (event) => { result = event.results[0]?.[0]?.transcript?.trim() || ""; };
      rec.onerror = (event) => { cancelled = true; if (event.error !== "aborted") setNotice(`Microphone: ${event.error}. Check permission or type instead.`); };
      rec.onend = () => {
        if (recognition.current !== rec) return;
        recognition.current = null; setListening(false);
        if (!cancelled && result && active.current) void send(result);
      };
      setNotice(""); setListening(true); rec.start();
      return true;
    } catch { recognition.current = null; setListening(false); setNotice("Could not start the microphone. Check browser permissions."); return false; }
  }

  function stopListening(reason: string) {
    const rec = recognition.current;
    if (!rec) return;
    if (["cancel", "escape", "blur", "disabled", "unmount"].includes(reason)) {
      recognition.current = null; setListening(false); rec.abort();
    } else {
      try { rec.stop(); } catch { recognition.current = null; setListening(false); }
    }
  }

  function resolve(approve: boolean) {
    const actions = pendingRef.current;
    if (!actions.length) return;
    pendingRef.current = []; setPending([]);
    const results = approve ? actions.map((action) => { try { return executeAtlasAction(action); } catch { return { ok: false, label: "Could not save this change." }; } }) : [];
    setTurns((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: approve ? results.map((r) => `${r.ok ? "✓" : "✕"} ${r.label}`).join("\n") : "Cancelled. Nothing was changed." }]);
  }

  if (!open) return null;
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="orb-title" className="fixed inset-0 z-[1000] overflow-y-auto text-marble">
      <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-5 pb-5 pt-5 sm:px-10">
        <header className="flex items-center justify-between gap-3">
          <div><p className="font-ui text-xs uppercase tracking-[0.25em] text-marbleDim">Your world, in conversation</p><h2 id="orb-title" className="font-display text-3xl">Atlas</h2></div>
          <div className="flex items-center gap-3"><Link href="/atlas/settings" onClick={onClose} className="font-ui text-sm underline">Settings</Link><button ref={closeRef} type="button" onClick={onClose} className="rounded-full border border-marble/70 px-4 py-2 font-ui text-sm">Close</button></div>
        </header>
        <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col justify-end pt-[min(28vh,200px)]">
          <div ref={transcriptRef} aria-live="polite" className="max-h-[35vh] space-y-3 overflow-y-auto py-3">
            {!turns.length && <p className="text-center font-body text-xl">Tap the microphone and speak, or hold it while speaking. Slide left to cancel. Your command will be sent when you finish, or you can type it.</p>}
            {turns.map((turn) => <div key={turn.id} className={`rounded-xl px-4 py-3 font-body text-lg whitespace-pre-wrap ${turn.role === "user" ? "ml-8 bg-white/10" : "mr-8 bg-white/5"}`}><strong className="font-ui text-xs uppercase tracking-wider">{turn.role === "user" ? "You" : "Atlas"}</strong><p>{turn.content}</p></div>)}
            {busy && <p className="font-body italic">Atlas is thinking…</p>}
          </div>
          {pending.length > 0 && <section aria-label="Changes awaiting approval" className="my-2 max-h-[25vh] overflow-y-auto rounded-xl border border-marble/70 bg-wineDeep p-3"><h3 className="font-ui text-sm uppercase">Review proposed changes</h3><p className="text-sm">Nothing changes until you approve. Deletes cannot be undone.</p><ol className="my-2 space-y-1">{pending.map((a, i) => <li key={i} className="break-words text-sm">{String(a.type)} · {String(a.collection)}: {describeAtlasAction(a)} {a.id && <span className="block break-all">ID: {String(a.id)}</span>} {a.collection === "projects" && a.type === "delete" && <span className="block">Deleting a project also removes its tasks and associated hours logs.</span>} {a.fields && <pre className="whitespace-pre-wrap break-all">{JSON.stringify(a.fields, null, 2)}</pre>}</li>)}</ol><div className="flex gap-2"><button onClick={() => resolve(true)} className="rounded-full bg-marble px-4 py-2 text-wine">Approve changes</button><button onClick={() => resolve(false)} className="rounded-full border px-4 py-2">Cancel changes</button></div></section>}
          {notice && <p role="alert" className="my-2 text-sm">{notice}</p>}
          {audioUrl && <audio ref={audioRef} controls autoPlay src={audioUrl} className="mb-2 h-9 w-full" aria-label="Atlas spoken reply" />}
          <form onSubmit={(event) => { event.preventDefault(); void send(draft); }} className="flex gap-2">
            <input aria-label="Command Atlas" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={pending.length > 0} placeholder="Ask Atlas or show me my timetable…" className="min-w-0 flex-1 rounded-full border border-marble/70 bg-white/10 px-4 py-3 text-white placeholder:text-white/75" />
            <AtlasVoicePill label="Voice command" active={listening} onStart={startListening} onStop={stopListening} disabled={busy || pending.length > 0} />
            <button type="submit" disabled={busy || pending.length > 0 || !draft.trim()} className="rounded-full bg-marble px-5 text-wine disabled:opacity-50">Send</button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-marbleDim"><label><input type="checkbox" checked={spokenReplies} onChange={(e) => setSpokenReplies(e.target.checked)} /> Speak replies with Fish Audio</label><span>Voice transcription may be processed by your browser provider. AI requests send unlocked app text to your chosen provider. Spoken replies send text through this server to Fish Audio and may incur charges.</span></div>
        </div>
      </div>
    </div>
  );
}
