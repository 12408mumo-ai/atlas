"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiGlobeSphere } from "@/components/AiGlobeSphere";
import { InstallAppButton } from "@/components/PwaInstall";
import { GoldDots } from "@/components/Ornaments";
import { getSession } from "@/lib/store";
import { loadAISettings, speak, stopSpeaking } from "@/lib/atlas-ai";

export default function WelcomePage() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s?.name) setFirstName(s.name.split(" ")[0]);
    return () => stopSpeaking();
  }, []);

  const timeGreeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Still awake";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const greetingText = `I am Atlas, the intelligence that holds your world. ${timeGreeting}${
    firstName ? `, ${firstName}` : ", bearer"
  }. Step forward to sign the ledger and awaken the spheres of your life.`;

  function toggleVoiceGreeting() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const st = loadAISettings();
    speak(greetingText, st, () => setSpeaking(false));
  }

  return (
    <main className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-wine px-6 py-6 text-marble sm:px-10">
      <GoldDots count={22} className="opacity-25" />

      {/* Top bar: brand mark + Download App button */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 overflow-hidden rounded-full border-2 border-marble bg-wine">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="Atlas emblem" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-[24px] tracking-[0.36em] text-marble">ATLAS</span>
        </div>

        <InstallAppButton tone="dark" label="Download app" />
      </header>

      {/* Center: spinning AI globe sphere + AI greeting + Proceed to Login */}
      <section className="relative z-10 mx-auto flex max-w-[720px] flex-col items-center py-4 text-center anim-fade-up">
        <AiGlobeSphere speaking={speaking} onClick={toggleVoiceGreeting} />

        <p className="mt-2 font-ui text-[17px] uppercase tracking-[0.28em] text-marble opacity-75">
          Atlas AI · Celestial Mind
        </p>

        <h1 className="mt-3 font-display text-[clamp(34px,5vw,56px)] leading-[1.08] tracking-[0.04em] text-marble">
          {timeGreeting}
          {firstName ? <span className="italic">, {firstName}</span> : <span>, Bearer</span>}.
        </h1>

        <p className="mt-3.5 max-w-[580px] font-body text-[22px] italic leading-relaxed text-marble opacity-85">
          “I am Atlas — the AI that holds your world together. Touch the sphere to hear my voice, or step
          through to take up your spheres.”
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link href="/login" className="btn-gold px-8 py-4 text-[18.5px]">
            Proceed to Login →
          </Link>
          <button
            type="button"
            onClick={toggleVoiceGreeting}
            className="rounded-pill border-2 border-marble px-6 py-3.5 font-ui text-[17px] uppercase tracking-[0.16em] text-marble transition-colors hover:bg-marble hover:text-wine"
          >
            {speaking ? "Silence voice" : "Hear greeting"}
          </button>
        </div>
      </section>

      {/* Subtle footer */}
      <footer className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-center pb-1">
        <p className="font-ui text-[16.5px] uppercase tracking-[0.24em] text-marble opacity-45">
          Ἄτλας · The World You Carry
        </p>
      </footer>
    </main>
  );
}
