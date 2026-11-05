"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function WelcomePage() {
  const router = useRouter();
  const [clockText, setClockText] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      setClockText(formatClock(new Date()));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    router.prefetch("/login");
    return () => window.clearInterval(timer);
  }, [router]);

  const handleLoginClick = () => {
    window.dispatchEvent(new Event("atlas:dock-orb"));
    router.push("/login");
  };

  return (
    <main className="relative h-[100svh] w-screen overflow-hidden bg-wine text-marble">
      {/* Live clock at the top right — used by the AI to determine the spoken greeting */}
      <time
        aria-label="Current time"
        className="fixed right-6 top-6 z-20 rounded-pill border-2 border-marble bg-wine px-5 py-2 font-ui text-[18px] uppercase tracking-[0.18em] tabular-nums text-marble sm:right-8 sm:top-8"
      >
        {clockText || "\u00A0"}
      </time>

      {/* Login button seated directly below the centered PersistentAiOrb */}
      <div className="fixed left-1/2 top-[calc(50%+136px)] z-20 -translate-x-1/2 sm:top-[calc(50%+172px)]">
        <button
          type="button"
          data-login-trigger="true"
          onClick={handleLoginClick}
          className="btn-gold px-12 py-4 text-[19px]"
        >
          Login
        </button>
      </div>
    </main>
  );
}
