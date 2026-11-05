"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiGlobeSphere } from "@/components/AiGlobeSphere";
import { loadAISettings, speak, stopSpeaking } from "@/lib/atlas-ai";

/* ------------------------------------------------------------------ */
/*  PersistentAiOrb — Single continuously-spinning AI orb mounted in  */
/*  RootLayout across the entire site:                                */
/*  • Centered on `/` while speaking the clock-matched greeting.      */
/*  • Smoothly glides to the left side when Login is pressed and      */
/*    stays there continuously spinning on every page.                */
/* ------------------------------------------------------------------ */

const DARK_BG_ROUTES = new Set(["/", "/login", "/hub", "/flow-wave"]);

export function selectGreetingByClock(date: Date): { src: string; text: string } {
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

export function PersistentAiOrb() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [dockInitiated, setDockInitiated] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isWelcome = pathname === "/" && !dockInitiated;
  const onLightSurface = !isWelcome && !DARK_BG_ROUTES.has(pathname);

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
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setSpeaking(false);
          return false;
        }
        setSpeaking(true);
        speak(text, loadAISettings(), () => setSpeaking(false));
        return true;
      }
    },
    [stopGreeting]
  );

  // Sync dock state with pathname and listen for immediate Login press on `/`
  useEffect(() => {
    if (pathname === "/") {
      setDockInitiated(false);
    } else {
      stopGreeting();
    }
  }, [pathname, stopGreeting]);

  useEffect(() => {
    const onDock = () => {
      stopGreeting();
      setDockInitiated(true);
    };
    window.addEventListener("atlas:dock-orb", onDock);
    return () => window.removeEventListener("atlas:dock-orb", onDock);
  }, [stopGreeting]);

  // Speak greeting automatically whenever on the opening `/` screen
  useEffect(() => {
    if (pathname !== "/") return;

    let unlockListenerAttached = false;
    const onFirstGesture = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest?.("[data-login-trigger='true']")) {
        cleanupUnlock();
        return;
      }
      cleanupUnlock();
      void playGreetingForClock(new Date());
    };

    const cleanupUnlock = () => {
      if (!unlockListenerAttached) return;
      unlockListenerAttached = false;
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };

    void playGreetingForClock(new Date()).then((played) => {
      if (!played) {
        unlockListenerAttached = true;
        window.addEventListener("pointerdown", onFirstGesture, { passive: true });
        window.addEventListener("keydown", onFirstGesture);
      }
    });

    return () => {
      cleanupUnlock();
    };
  }, [pathname, playGreetingForClock]);

  const handleOrbClick = () => {
    if (isWelcome) {
      void playGreetingForClock(new Date());
      return;
    }
    if (pathname !== "/login" && pathname !== "/atlas") {
      router.push("/atlas");
    }
  };

  return (
    <div
      style={{
        transition:
          "left 820ms cubic-bezier(0.22, 1, 0.36, 1), top 820ms cubic-bezier(0.22, 1, 0.36, 1), transform 820ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      className={
        isWelcome
          ? "fixed left-[calc(50%+0px)] top-[calc(50%-42px)] z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-100 sm:h-[380px] sm:w-[380px]"
          : "fixed left-[calc(0%+38px)] top-[calc(50%+0px)] z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-[0.22] sm:left-[calc(0%+54px)] sm:h-[380px] sm:w-[380px] sm:scale-[0.23]"
      }
    >
      <AiGlobeSphere
        speaking={speaking}
        onLightSurface={onLightSurface}
        onClick={handleOrbClick}
        ariaLabel={
          isWelcome
            ? "Atlas AI spinning globe — tap to hear voice greeting"
            : "Atlas AI spinning orb — tap to open Atlas AI"
        }
      />
    </div>
  );
}
