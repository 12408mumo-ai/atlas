"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tabs } from "@/components/ui";

const STORAGE_KEY = "atlas.work.clock.v1";
type Mode = "clock" | "timer" | "stopwatch";
type TimerState = { endAt: number | null; remaining: number | null; finished: boolean };
type WatchState = { elapsed: number; startedAt: number | null };

function formatDuration(ms: number, tenths = false) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const secs = seconds % 60;
  const base = [hours, minutes, secs].map((n) => String(n).padStart(2, "0")).join(":");
  return tenths ? `${base}.${Math.floor(Math.max(0, ms) / 100) % 10}` : base;
}

export function WorkClock() {
  const [mode, setMode] = useState<Mode>("clock");
  const [now, setNow] = useState(0);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [timer, setTimer] = useState<TimerState>({ endAt: null, remaining: null, finished: false });
  const [watch, setWatch] = useState<WatchState>({ elapsed: 0, startedAt: null });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const fullscreen = mode !== "clock";
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!fullscreen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMode("clock"); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter((item) => item.getClientRects().length > 0);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [fullscreen]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === "object") {
          if (typeof saved.hours === "string") setHours(saved.hours);
          if (typeof saved.minutes === "string") setMinutes(saved.minutes);
          if (typeof saved.seconds === "string") setSeconds(saved.seconds);
          if (saved.timer && (saved.timer.endAt === null || Number.isFinite(saved.timer.endAt)) && (saved.timer.remaining === null || Number.isFinite(saved.timer.remaining))) setTimer({ endAt: saved.timer.endAt, remaining: saved.timer.remaining, finished: saved.timer.finished === true });
          if (saved.watch && Number.isFinite(saved.watch.elapsed) && (saved.watch.startedAt === null || Number.isFinite(saved.watch.startedAt))) setWatch({ elapsed: Math.max(0, saved.watch.elapsed), startedAt: saved.watch.startedAt });
        }
      }
    } catch { /* Storage may be unavailable; the clock still works in this view. */ }
    setNow(Date.now());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const frequency = watch.startedAt !== null && mode === "stopwatch" ? 100 : timer.endAt !== null ? 250 : 1000;
    const id = window.setInterval(() => setNow(Date.now()), frequency);
    return () => window.clearInterval(id);
  }, [ready, watch.startedAt, timer.endAt, mode]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ hours, minutes, seconds, timer, watch })); } catch { /* Use in-memory state when storage is unavailable. */ }
  }, [ready, hours, minutes, seconds, timer, watch]);

  useEffect(() => {
    if (!ready || timer.endAt === null || now < timer.endAt) return;
    setTimer({ endAt: null, remaining: 0, finished: true });
    const ctx = audio.current;
    if (ctx && ctx.state === "running") {
      try {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.start(); oscillator.stop(ctx.currentTime + 0.6);
      } catch { /* The visible alert remains available if sound is blocked. */ }
    }
  }, [ready, now, timer.endAt]);

  useEffect(() => () => { void audio.current?.close(); }, []);

  const duration = (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
  const validDuration = [hours, minutes, seconds].every((v) => /^\d+$/.test(v)) && Number(hours) <= 99 && Number(minutes) <= 59 && Number(seconds) <= 59 && duration > 0;
  const remaining = timer.endAt !== null ? Math.max(0, timer.endAt - now) : timer.remaining ?? (validDuration ? duration : 0);
  const watchElapsed = watch.elapsed + (watch.startedAt === null || !now ? 0 : Math.max(0, now - watch.startedAt));
  const time = now ? new Date(now) : null;

  function startTimer() {
    const amount = timer.finished ? duration : timer.remaining ?? duration;
    if (!validDuration || amount <= 0) { setError("Enter a duration greater than zero. Minutes and seconds must be below 60."); return; }
    setError("");
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) { audio.current ??= new Ctx(); void audio.current.resume().catch(() => {}); }
    } catch { /* Sound is optional; completion is also shown on screen. */ }
    const started = Date.now(); setNow(started);
    setTimer({ endAt: started + amount, remaining: null, finished: false });
  }
  function pauseTimer() {
    if (timer.endAt === null) return;
    const remainingAtPause = Math.max(0, timer.endAt - Date.now());
    setTimer({ endAt: null, remaining: remainingAtPause, finished: remainingAtPause === 0 });
  }
  function resetTimer() { setTimer({ endAt: null, remaining: null, finished: false }); setError(""); }
  function toggleWatch() {
    const stamp = Date.now(); setNow(stamp);
    setWatch((current) => current.startedAt === null
      ? { ...current, startedAt: stamp }
      : { elapsed: current.elapsed + Math.max(0, stamp - current.startedAt), startedAt: null });
  }

  const actionClass = "rounded-full bg-wine px-6 py-3 font-ui text-sm uppercase tracking-[0.12em] text-marble hover:bg-wineDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine disabled:opacity-50";
  const secondaryClass = "rounded-full border border-wine/60 px-6 py-3 font-ui text-sm uppercase tracking-[0.12em] text-wine hover:bg-wine/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine";
  const content = (
    <div className={fullscreen ? "flex min-h-full w-full flex-col items-center justify-center gap-6 px-4 py-8 sm:px-8" : "space-y-5"}>
      {fullscreen && <button ref={closeRef} type="button" onClick={() => setMode("clock")} className="absolute right-4 top-4 rounded-full border border-wine/60 bg-marble px-4 py-2 font-ui text-sm text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine" aria-label="Close full screen and return to clock">✕ <span className="ml-1">Close</span></button>}
      <Tabs label="Clock tools" value={mode} onChange={(key) => setMode(key as Mode)} tabs={[{ key: "clock", label: "Clock" }, { key: "timer", label: "Timer" }, { key: "stopwatch", label: "Stopwatch" }]} />
      <section className={fullscreen ? "w-full max-w-4xl px-2 py-8 text-center sm:p-8" : "glass-card p-5 text-center sm:p-8"} aria-label={`${mode[0].toUpperCase()}${mode.slice(1)}`}>
        {mode === "clock" && <>
          <p className="font-ui text-xs uppercase tracking-[0.2em] text-wine/70">Your local time</p>
          <p className="mt-5 whitespace-nowrap font-display text-[clamp(32px,6vw,68px)] tabular-nums leading-none text-wine" aria-label="Current time">{time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }) : "--:--:--"}</p>
          <p className="mt-5 font-body text-lg italic text-wine/75">{time ? time.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}</p>
        </>}
        {mode === "timer" && <>
          <p className="font-ui text-xs uppercase tracking-[0.2em] text-wine/70">Countdown</p>
          <p className="mt-5 font-display text-[clamp(42px,12vw,120px)] tabular-nums leading-none text-wine" aria-label="Time remaining" aria-live="off">{formatDuration(Math.ceil(remaining / 1000) * 1000)}</p>
          <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-2 text-left">
            {([ ["Hours", hours, setHours, 99], ["Minutes", minutes, setMinutes, 59], ["Seconds", seconds, setSeconds, 59] ] as const).map(([label, value, change, max]) => <label key={label} className="font-ui text-xs uppercase tracking-[0.1em] text-wine/75">{label === "Hours" ? "Hrs" : label === "Minutes" ? "Min" : "Sec"}<input aria-label={label} type="number" inputMode="numeric" min={0} max={max} step={1} value={value} disabled={timer.endAt !== null || (timer.remaining !== null && !timer.finished)} onChange={(event) => { change(event.target.value); if (timer.finished) resetTimer(); setError(""); }} className="field mt-1 w-full px-2 py-2 text-center text-lg disabled:opacity-60" /></label>)}
          </div>
          {error && <p role="alert" className="mt-3 font-ui text-sm text-wine">{error}</p>}
          {timer.finished && <p role="status" className="mt-4 font-ui text-sm font-semibold text-wine">Time is up.</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {timer.endAt === null ? <button type="button" onClick={startTimer} className={actionClass}>{timer.remaining !== null && !timer.finished ? "Resume" : "Start timer"}</button> : <button type="button" onClick={pauseTimer} className={actionClass}>Pause timer</button>}
            <button type="button" onClick={resetTimer} className={secondaryClass}>Reset timer</button>
          </div>
          <p className="mt-5 font-body text-sm text-wine/75">The countdown continues while you browse in this tab. The alert sounds only while this screen is open and audio is permitted.</p>
        </>}
        {mode === "stopwatch" && <>
          <p className="font-ui text-xs uppercase tracking-[0.2em] text-wine/70">Elapsed time</p>
          <p className="mt-5 font-display text-[clamp(36px,10vw,110px)] tabular-nums leading-none text-wine" aria-label="Stopwatch elapsed time" aria-live="off">{formatDuration(watchElapsed, true)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={toggleWatch} className={actionClass}>{watch.startedAt === null ? (watch.elapsed > 0 ? "Resume stopwatch" : "Start stopwatch") : "Pause stopwatch"}</button>
            <button type="button" onClick={() => setWatch({ elapsed: 0, startedAt: null })} className={secondaryClass}>Reset stopwatch</button>
          </div>
          <p className="mt-5 font-body text-sm text-wine/75">Keeps time while you browse in this tab.</p>
        </>}
      </section>
    </div>
  );
  if (!fullscreen) return content;
  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={mode === "timer" ? "Full-screen timer" : "Full-screen stopwatch"} className="fixed inset-0 z-[1200] overflow-y-auto bg-[#eee9d9] text-wine">
      {content}
    </div>,
    document.body
  );
}
