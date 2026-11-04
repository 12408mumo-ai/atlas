"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollFrame } from "@/components/ScrollFrame";
import { Meander, LaurelDivider } from "@/components/Ornaments";
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
    // A breath, so the transition feels like lifting a stone lid.
    setTimeout(() => {
      const res = signIn(email.trim(), password);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push("/hub");
    }, 520);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-night">
      {/* ---------------- the ruins, in motion ---------------- */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/assets/ruins-loop.mp4"
        poster="/assets/ruins-poster.png"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 76% 42%, rgba(7,10,16,.12) 0%, rgba(7,10,16,.62) 46%, rgba(7,10,16,.94) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-night/95 via-night/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />

      {/* faint gold dust */}
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.5' numOctaves='2'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23d)' opacity='.22'/%3E%3C/svg%3E\")",
          mixBlendMode: "screen",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1320px] flex-col px-6 sm:px-10">
        {/* wordmark */}
        <header className="flex items-center justify-between py-7">
          <span className="font-display text-[15px] tracking-[.5em] text-marble/70">ATLAS</span>
          <span className="hidden sm:block eyebrow !tracking-[.32em] text-marble/35">
            Ἄτλας · he who holds the sky
          </span>
        </header>

        <div className="grid flex-1 items-center gap-14 pb-16 md:grid-cols-[minmax(0,470px)_1fr]">
          {/* ------------------- the scroll ------------------- */}
          <div className={mounted ? "anim-fade-up" : "opacity-0"} style={{ animationDelay: ".1s" }}>
            <ScrollFrame width={470}>
              <div className="text-center">
                <p className="eyebrow !text-[9px] !tracking-[.45em] text-[#7a5f31]">The registry</p>
                <h1
                  className="mt-3 font-display text-[34px] leading-none tracking-[.1em] text-[#2e2413] sm:text-[40px]"
                  style={{ textShadow: "0 1px 0 rgba(255,250,235,.6)" }}
                >
                  ATLAS
                </h1>
                <p className="mt-2 font-body text-[13px] italic tracking-wide text-[#5d4a2a]">
                  Sign the ledger and take up your world.
                </p>
                <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-[#8a6a35]">
                  <span className="h-px w-10 bg-[#8a6a35]/50" />
                  <svg width="26" height="12" viewBox="0 0 26 12">
                    <path d="M13 1l1.6 3.6 3.9.4-3 2.5 1 3.8L13 9.4l-3.5 2 1-3.9-3-2.5 3.9-.4z" fill="currentColor" opacity=".85" />
                  </svg>
                  <span className="h-px w-10 bg-[#8a6a35]/50" />
                </div>
              </div>

              <form onSubmit={submit} className="mt-7 space-y-5">
                <PaperField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <PaperField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />

                {error && (
                  <p className="border-l-2 border-[#8c3b2a] bg-[#8c3b2a]/10 px-3 py-2 font-ui text-[11px] tracking-[.06em] text-[#7d3223]">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className="group relative mt-2 w-full overflow-hidden">
                  <span
                    className="block w-full border border-[#6d5326] px-4 py-3.5 text-center font-ui text-[10px] uppercase tracking-[.4em] text-[#f6ecd6] transition-all duration-300 group-hover:tracking-[.48em]"
                    style={{
                      background: "linear-gradient(180deg, #4a3a1d, #2f2412 60%, #241b0d)",
                      boxShadow: "inset 0 1px 0 rgba(255,235,190,.28), 0 10px 24px -14px rgba(0,0,0,.9)",
                    }}
                  >
                    {busy ? "Taking up the world…" : "Enter"}
                  </span>
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-full opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"
                    style={{ background: "linear-gradient(100deg, transparent, rgba(243,215,154,.28), transparent)" }}
                  />
                </button>
              </form>

              <div className="mt-7">
                <Meander height={12} />
                <p className="mt-4 text-center font-ui text-[9.5px] uppercase tracking-[.24em] text-[#7d663d]">
                  First time? Any email and password forges your world.
                </p>
              </div>
            </ScrollFrame>
          </div>

          {/* ------------------- the invocation ------------------- */}
          <div className="hidden md:block anim-fade" style={{ animationDelay: ".35s" }}>
            <div className="ml-auto max-w-[440px] text-right">
              <p className="eyebrow !tracking-[.5em] text-gold/70">Titan of endurance</p>
              <h2 className="mt-5 font-display text-[clamp(38px,4.4vw,62px)] leading-[1.02] tracking-[.02em] text-marble">
                The world
                <br />
                is heavy.
                <br />
                <span className="gold-text">Carry it well.</span>
              </h2>
              <p className="ml-auto mt-6 max-w-[360px] font-body text-[15px] leading-[1.85] text-marble/55">
                Atlas was condemned to hold the sky on his shoulders forever. He did it
                without dropping a single star. This is the place where you put down what
                you carry — work, study, people, life — and see it all at once.
              </p>
              <LaurelDivider className="mt-8 justify-end" />
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  ["4", "pillars"],
                  ["1", "world"],
                  ["∞", "days"],
                ].map(([n, l]) => (
                  <div key={l} className="border border-gold/15 bg-white/[.02] px-3 py-4 text-center backdrop-blur-sm">
                    <p className="font-display text-[26px] text-goldBright">{n}</p>
                    <p className="mt-1 font-ui text-[9px] uppercase tracking-[.24em] text-marble/40">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between pb-6">
          <p className="font-ui text-[9px] uppercase tracking-[.3em] text-marble/25">
            Athens · MMXXV
          </p>
          <Link href="/hub" className="font-ui text-[9px] uppercase tracking-[.3em] text-marble/30 hover:text-gold/70 transition">
            Enter without signing →
          </Link>
        </footer>
      </div>
    </main>
  );
}

function PaperField({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="font-ui text-[9px] uppercase tracking-[.34em] text-[#7a5f31]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="mt-2 w-full border-0 border-b border-[#8a6a35]/45 bg-transparent px-0.5 pb-2 font-body text-[16px] tracking-[.02em] text-[#2b2111] outline-none transition placeholder:text-[#8a6a35]/40 focus:border-[#5d4a2a]"
        style={{ textShadow: "0 1px 0 rgba(255,250,235,.5)" }}
      />
    </label>
  );
}
