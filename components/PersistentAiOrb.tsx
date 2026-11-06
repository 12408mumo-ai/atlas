/* ------------------------------------------------------------------ */
/*  PersistentAiOrb — Single continuously-spinning AI orb mounted in  */
/*  RootLayout across the entire site:                                */
/*  • On `/` it is a cloud of golden particles that ripples like a    */
/*    voice wave. No buttons, no controls — you speak to it.          */
/*  • Smoothly glides to the left side when you enter, and stays     */
/*    there continuously spinning on every page.                       */
/* ------------------------------------------------------------------ */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiGlobeSphere } from "@/components/AiGlobeSphere";
import { GoldenParticleSphere } from "@/components/GoldenParticleSphere";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { VoiceGreeting } from "@/components/VoiceGreeting";
import { loadAISettings, speak, stopSpeaking } from "@/lib/atlas-ai";

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
  const [voiceGreeting, setVoiceGreeting] = useState(false);
  const [listening, setListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // True once the orb has actually spoken its greeting.
  const greetedRef = useRef(false);

  const isWelcome = pathname === "/" && !dockInitiated;
  const onLightSurface = !isWelcome && !DARK_BG_ROUTES.has(pathname);

  // Always-current values for the audio callback, so it never acts on a
  // stale pathname.
  const onWelcomeRef = useRef(false);
  onWelcomeRef.current = isWelcome;

  // The voice components report when they are talking so the particles
  // ripple in time with the voice.
  const handleSpeakingChange = useCallback((talking: boolean) => {
    setSpeaking(talking);
  }, []);

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
        // The greeting has been spoken — hand over to the voice conversation.
        if (onWelcomeRef.current) {
          greetedRef.current = true;
          window.setTimeout(() => setVoiceGreeting(true), 900);
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
        speak(text, loadAISettings(), () => {
          setSpeaking(false);
          if (onWelcomeRef.current) {
            greetedRef.current = true;
            window.setTimeout(() => setVoiceGreeting(true), 900);
          }
        });
        return true;
      }
    },
    [stopGreeting]
  );

  // Sync dock state with pathname and listen for immediate Login press on `/`
  useEffect(() => {
    if (pathname === "/") {
      setDockInitiated(false);
      greetedRef.current = false;
      setVoiceGreeting(false);
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

  // The greeting is spoken once on the opening screen. The spoken
  // conversation that follows takes over from there.
  useEffect(() => {
    if (pathname !== "/") return;

    let unlockListenerAttached = false;
    const onFirstGesture = () => {
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
        // The browser blocked autoplay. Wait for the first touch or key.
        unlockListenerAttached = true;
        window.addEventListener("pointerdown", onFirstGesture, { passive: true });
        window.addEventListener("keydown", onFirstGesture);
      }
    });

    return () => {
      cleanupUnlock();
    };
  }, [pathname, playGreetingForClock]);

  // Once the greeting has settled, the voice conversation opens.
  useEffect(() => {
    if (pathname !== "/" || dockInitiated) return;
    // The greeting audio opens the conversation when it ends. This is the
    // fallback for when the audio is blocked or fails to play.
    const timer = window.setTimeout(() => {
      if (!audioRef.current) setVoiceGreeting(true);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [pathname, dockInitiated]);

  const handleOrbClick = () => {
    if (isWelcome) {
      void playGreetingForClock(new Date());
      return;
    }
    if (pathname !== "/login" && pathname !== "/atlas") {
      router.push("/atlas");
    }
  };

  /* ------------------------- voice login on / ------------------------- */

  const startVoiceLogin = useCallback(() => {
    stopGreeting();
    setVoiceGreeting(true);
  }, [stopGreeting]);

  // The voice panel is the spoken demo assistant. It is hidden on /atlas,
  // which is the full written chat with a real model.
  const showAssistantTab = !isWelcome && pathname !== "/login" && pathname !== "/atlas";

  return (
    <>
      <div
        style={{
          transition:
            "left 820ms cubic-bezier(0.22, 1, 0.36, 1), top 820ms cubic-bezier(0.22, 1, 0.36, 1), transform 820ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={
          isWelcome
            ? "fixed left-[calc(50%+0px)] top-[calc(50%-42px)] z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-100 sm:h-[420px] sm:w-[420px]"
            : "fixed left-[calc(0%+38px)] top-[calc(50%+0px)] z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-[0.22] sm:left-[calc(0%+54px)] sm:h-[380px] sm:w-[380px] sm:scale-[0.23]"
        }
      >
        {isWelcome ? (
          <GoldenParticleSphere
            energy={speaking ? 1 : listening ? 0.45 : 0.16}
            listening={listening}
          />
        ) : (
          <AiGlobeSphere
            speaking={speaking}
            onLightSurface={onLightSurface}
            onClick={handleOrbClick}
            ariaLabel="Atlas AI spinning orb — tap to open Atlas AI"
          />
        )}
      </div>

      {/* The docked name tab is the way back to Atlas on every page. */}
      {showAssistantTab && (
        <VoiceAssistant
          onClose={() => undefined}
          onDocked={() => undefined}
          onListeningChange={setListening}
          onSpeakingChange={handleSpeakingChange}
        />
      )}

      {/* On the opening screen, the voice greeting runs the whole way in. */}
      {isWelcome && voiceGreeting && (
        <VoiceGreeting
          alreadyGreeted={greetedRef.current}
          onUnlock={() => {
            setDockInitiated(true);
            router.push("/hub");
          }}
          onCancel={() => setVoiceGreeting(false)}
          onListeningChange={setListening}
          onSpeakingChange={handleSpeakingChange}
        />
      )}

      {/* A hidden trigger for anything that wants to start the voice flow. */}
      {isWelcome && (
        <button
          type="button"
          onClick={startVoiceLogin}
          className="sr-only"
          aria-label="Start voice login"
        >
          Start voice login
        </button>
      )}
    </>
  );
}
