"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollFrame } from "@/components/ScrollFrame";
import { MeanderWine, LaurelDivider, GoldDots } from "@/components/Ornaments";
import { signIn, getSession } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (getSession()) router.replace("/hub");
  }, [router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setTimeout(() => {
      const res = signIn(email.trim(), password);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push("/hub");
    }, 420);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-wine">
      {/* ---------------- the ruins, in motion ---------------- */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "grayscale(1) contrast(1.15) brightness(0.8)" }}
        src="/assets/ruins-loop.mp4"
        poster="/assets/ruins-poster.png"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      {/* duotone the film into charcoal — two flat colours, no gradient */}
      <div className="absolute inset-0 bg-wine mix-blend-color" />
      <div className="absolute inset-0 bg-wine opacity-70" />
      <div className="absolute inset-y-0 left-0 w-full bg-wine opacity-95 md:w-[54%]" />

      <GoldDots count={18} className="opacity-30" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 sm:px-10">
        <header className="flex items-center justify-between py-6">
          <span className="font-display text-[22px] tracking-[0.42em] text-marble">ATLAS</span>
          <span className="hidden font-ui text-[18px] uppercase tracking-[0.24em] text-marble opacity-85 sm:block">
            Ἄτλας · he who holds the sky
          </span>
        </header>

        <div className="grid flex-1 items-center gap-12 pb-14 md:grid-cols-[minmax(0,520px)_1fr]">
          {/* ------------------- the scroll ------------------- */}
          <div className={mounted ? "anim-fade-up" : "opacity-0"}>
            <ScrollFrame width={520}>
              <div className="text-center">
                <p className="font-ui text-[17px] uppercase tracking-[0.3em] text-wine opacity-65">The registry</p>
                <h1 className="mt-2 font-display text-[42px] leading-none tracking-[0.12em] text-wine sm:text-[48px]">ATLAS</h1>
                <p className="mt-2.5 font-body text-[20.5px] italic tracking-wide text-wine opacity-75">
                  Sign the ledger and take up your world.
                </p>
                <div className="mx-auto mt-4 flex items-center justify-center gap-2.5">
                  <span className="h-[2px] w-12 bg-wine" />
                  <svg width="28" height="14" viewBox="0 0 26 12">
                    <path d="M13 1l1.6 3.6 3.9.4-3 2.5 1 3.8L13 9.4l-3.5 2 1-3.9-3-2.5 3.9-.4z" fill="#28282A" />
                  </svg>
                  <span className="h-[2px] w-12 bg-wine" />
                </div>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="font-ui text-[17px] uppercase tracking-[0.22em] text-wine opacity-75">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="mt-1.5 w-full rounded-[10px] border-2 border-wine bg-marble px-3.5 py-3 font-ui text-[20px] text-wine outline-none transition-shadow placeholder:text-wine placeholder:opacity-40 focus:border-wine focus:ring-2 focus:ring-wine/25"
                  />
                </label>
                <label className="block">
                  <span className="font-ui text-[17px] uppercase tracking-[0.22em] text-wine opacity-75">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="mt-1.5 w-full rounded-[10px] border-2 border-wine bg-marble px-3.5 py-3 font-ui text-[20px] text-wine outline-none transition-shadow placeholder:text-wine placeholder:opacity-40 focus:border-wine focus:ring-2 focus:ring-wine/25"
                  />
                </label>

                {error && (
                  <p className="rounded-[10px] border-2 border-wine bg-marbleDim px-3.5 py-2.5 font-ui text-[18px] tracking-[0.03em] text-wine">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn-wine mt-1 w-full">
                  {busy ? "Taking up the world…" : "Enter"}
                </button>
              </form>

              <div className="mt-6">
                <MeanderWine height={12} />
                <p className="mt-4 text-center font-ui text-[17px] uppercase tracking-[0.15em] text-wine opacity-65">
                  Any email and password forges your world
                </p>
              </div>
            </ScrollFrame>
          </div>

          {/* ------------------- the invocation ------------------- */}
          <div className="hidden md:block anim-fade">
            <div className="ml-auto max-w-[500px]">
              <p className="font-ui text-[18px] uppercase tracking-[0.32em] text-marble opacity-85">Titan of endurance</p>
              <h2 className="mt-4 font-display text-[clamp(42px,4.8vw,64px)] leading-[1.05] tracking-[0.02em] text-marble">
                The world is heavy.
                <br />
                <span className="text-marble opacity-85">Carry it well.</span>
              </h2>
              <p className="mt-5 max-w-[470px] font-body text-[22px] leading-[1.7] text-marble opacity-80">
                Atlas was condemned to hold the sky on his shoulders forever. He did it without
                dropping a single star. This is the place where you put down what you carry —
                work, study, people, life — and see it all at once.
              </p>
              <LaurelDivider tone="dark" className="mt-7 justify-start" />
              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  ["4", "pillars"],
                  ["1", "world"],
                  ["∞", "days"],
                ].map(([n, l]) => (
                  <div key={l} className="rounded-xl border-2 border-marble bg-wine px-3 py-4 text-center">
                    <p className="font-display text-[34px] text-marble">{n}</p>
                    <p className="mt-1 font-ui text-[17px] uppercase tracking-[0.18em] text-marble opacity-75">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <p className="font-ui text-[17px] uppercase tracking-[0.24em] text-marble opacity-50">Athens · MMXXV</p>
          <Link
            href="/hub"
            className="rounded-pill border-2 border-marble px-5 py-2.5 font-ui text-[17.5px] uppercase tracking-[0.18em] text-marble transition-colors hover:bg-marble hover:text-wine"
          >
            Enter without signing →
          </Link>
        </footer>
      </div>
    </main>
  );
}
