"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/LoginForm";

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function WelcomePage() {
  const [clockText, setClockText] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      setClockText(formatClock(new Date()));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="relative h-[100svh] w-screen overflow-hidden bg-wine text-marble">
      {/* Live clock at the top right */}
      <time
        aria-label="Current time"
        className="fixed right-6 top-6 z-20 rounded-pill border-2 border-marble bg-wine px-5 py-2 font-ui text-[18px] uppercase tracking-[0.18em] tabular-nums text-marble sm:right-8 sm:top-8"
      >
        {clockText || "\u00A0"}
      </time>

      {/* The sign-in form, on the opening screen itself. */}
      <div className="relative z-10 grid min-h-[100svh] w-screen place-items-center overflow-x-hidden bg-wine py-10 pl-20 pr-5 sm:px-28">
        <div className="w-full max-w-[480px] anim-fade-up">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
