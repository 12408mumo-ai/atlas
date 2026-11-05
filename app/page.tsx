"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiGlobeSphere } from "@/components/AiGlobeSphere";
import { loadAISettings, speak, stopSpeaking } from "@/lib/atlas-ai";

function selectGreetingByClock(date: Date): { src: string; text: string } {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return {
      src: "/audio/greeting-morning.mp3",
      text: "Good morning, sir. Would you like to proceed to login?",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      src: "/audio/greeting-afternoon.mp3",
      text: "Good afternoon, sir. Would you like to proceed to login?",
    };
  }
  if (hour >= 17 && hour < 22) {
    return {
      src: "/audio/greeting-evening.mp3",
      text: "Good evening, sir. Would you like to proceed to login?",
    };
  }
  return {
    src: "/audio/greeting-night.mp3",
    text: "Greetings, sir. Would you like to proceed to login?",
  };
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function WelcomePage() {
  const [clockText, setClockText] = useState<string>("");
  const [speaking, setSpeaking] = useState(false);
  const clockRef = useRef<Date | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loginLinkRef = useRef<HTMLAnchorElement | null>(null);

  const stopGreeting = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    stopSpeaking();
    setSpeaking(false);
  }, []);

  const playGreetingForClock = useCallback(
    async (clockDate: Date): Promise<boolean> => {
      stopGreeting();
      const { src, text } = selectGreetingByClock(clockDate);
      const audio = new Audio(src);
      audio.preload = "auto";
      audioRef.current = audio;

      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setSpeaking(false);
        }
      };

      try {
        setSpeaking(true);
        await audio.play();
        return true;
      } catch (err) {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        // If blocked by browser autoplay before gesture, wait for first gesture rather than failing
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setSpeaking(false);
          return false;
        }
        // Fallback to Web Speech if audio asset fails for any other reason
        setSpeaking(true);
        speak(text, loadAISettings(), () => setSpeaking(false));
        return true;
      }
    },
    [stopGreeting]
  );

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      clockRef.current = now;
      setClockText(formatClock(now));
      return now;
    };

    const initialNow = updateClock();
    const timer = window.setInterval(updateClock, 1000);

    let unlockListenerAttached = false;
    const onFirstGesture = (e: Event) => {
      const target = e.target as Node | null;
      if (target && loginLinkRef.current?.contains(target)) {
        cleanupUnlock();
        return;
      }
      cleanupUnlock();
      void playGreetingForClock(clockRef.current ?? new Date());
    };

    const cleanupUnlock = () => {
      if (!unlockListenerAttached) return;
      unlockListenerAttached = false;
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };

    void playGreetingForClock(initialNow).then((played) => {
      if (!played) {
        unlockListenerAttached = true;
        window.addEventListener("pointerdown", onFirstGesture, { passive: true });
        window.addEventListener("keydown", onFirstGesture);
      }
    });

    return () => {
      window.clearInterval(timer);
      cleanupUnlock();
      stopGreeting();
    };
  }, [playGreetingForClock, stopGreeting]);

  return (
    <main className="relative grid h-[100svh] w-screen place-items-center overflow-hidden bg-wine text-marble">
      {/* Live clock at the top right — used by the AI to determine the spoken greeting */}
      <time
        aria-label="Current time"
        className="fixed right-6 top-6 z-20 rounded-pill border-2 border-marble bg-wine px-5 py-2 font-ui text-[18px] uppercase tracking-[0.18em] tabular-nums text-marble sm:right-8 sm:top-8"
      >
        {clockText || "\u00A0"}
      </time>

      {/* Only the spinning globe and the Login button */}
      <div className="flex flex-col items-center anim-fade-up">
        <AiGlobeSphere
          speaking={speaking}
          onClick={() => {
            void playGreetingForClock(clockRef.current ?? new Date());
          }}
        />

        <Link
          ref={loginLinkRef}
          href="/login"
          onClick={stopGreeting}
          className="btn-gold mt-8 px-12 py-4 text-[19px]"
        >
          Login
        </Link>
      </div>
    </main>
  );
}
