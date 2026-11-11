"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Try a single entrance tune, falling back to the user's entry gesture. */
export function EntryMusic() {
  const pathname = usePathname();
  const entry = pathname === "/" || pathname === "/login";
  const audioRef = useRef<HTMLAudioElement>(null);
  const started = useRef(false);
  const stoppedByUser = useRef(false);
  const wasEntry = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    // Calling play synchronously is important when this follows a user gesture.
    void audio.play().catch(() => { /* Autoplay may be blocked until a tap. */ });
  }, []);

  useEffect(() => {
    if (entry && !wasEntry.current) {
      started.current = false;
      stoppedByUser.current = false;
      setFailed(false);
      play();
    }
    wasEntry.current = entry;
  }, [entry, play]);

  useEffect(() => {
    const onEnter = () => {
      if (!started.current && !stoppedByUser.current) play();
    };
    window.addEventListener("atlas:enter", onEnter);
    return () => window.removeEventListener("atlas:enter", onEnter);
  }, [play]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) { stoppedByUser.current = true; audio.pause(); audio.currentTime = 0; }
    else { stoppedByUser.current = false; setFailed(false); if (audio.ended) audio.currentTime = 0; play(); }
  }

  return <>
    <audio ref={audioRef} src="/audio/mellow-corridor.wav" preload="none" onPlay={() => { started.current = true; setPlaying(true); setFailed(false); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setFailed(true); }} />
    {(entry || playing) && <div className="fixed bottom-4 right-4 z-[960] flex flex-col items-end gap-1">
      <button type="button" onClick={toggle} className="rounded-full border border-[#C2B280]/70 bg-[#27333b]/95 px-4 py-2 font-ui text-xs text-[#eee9d9] shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2B280]">{playing ? "Stop entrance music" : "Play entrance music"}</button>
      {failed && <span role="status" className="rounded bg-[#27333b] px-2 py-1 font-ui text-xs text-[#eee9d9]">Music unavailable</span>}
    </div>}
  </>;
}
