"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { enterAsGuest } from "@/lib/store";
import Link from "next/link";

export default function PinPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function unlock(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to unlock Atlas."); setPin(""); return; }
      enterAsGuest(); router.replace("/hub"); router.refresh();
    } catch { setError("Could not reach Atlas. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <main className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-8 text-marble">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(20, 29, 33, 0.65), rgba(20, 29, 33, 0.75)), url('/assets/greek-corridor.jpg')" }} />
    <form onSubmit={unlock} className="w-full max-w-sm rounded-3xl border border-[#C2B280]/50 bg-[#27333b]/90 p-6 text-center shadow-2xl sm:p-8">
      <p className="font-ui text-[11px] uppercase tracking-[0.32em] text-marbleDim">The world you carry</p>
      <h1 className="mt-3 font-display text-4xl tracking-[0.12em]">ATLAS</h1>
      <p className="mt-3 font-body text-xl italic text-marbleDim">Enter your PIN to open your world.</p>
      <label htmlFor="atlas-pin" className="sr-only">Numeric PIN</label>
      <input id="atlas-pin" type="password" inputMode="numeric" pattern="[0-9]{8,12}" minLength={8} maxLength={12} autoComplete="off" required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="8–12 digit PIN" className="mt-6 w-full rounded-xl border border-[#C2B280]/60 bg-[#eee9d9] px-4 py-3 text-center font-ui text-lg tracking-[0.2em] text-[#27333b]" />
      {error && <p role="alert" className="mt-3 font-ui text-sm text-[#ffe1ca]">{error}</p>}
      <button type="submit" disabled={busy} className="mt-5 w-full rounded-full bg-[#C2B280] px-5 py-3 font-ui text-sm text-[#27333b] disabled:opacity-50">{busy ? "Unlocking…" : "Enter Atlas"}</button>
      <Link href="/" className="mt-5 inline-block font-ui text-xs text-marbleDim underline">Back to entrance</Link>
    </form>
  </main>;
}
