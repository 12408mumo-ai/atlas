"use client";

import { useEffect, useState } from "react";
import { synthesizeVoice } from "@/lib/atlas-voice";

/** Speech is generated only after a deliberate button press. */
export function VoicePlayer({ text, label = "Listen" }: { text: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const blob = await synthesizeVoice(text);
      setUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate voice audio.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-2 space-y-2">
      <button type="button" onClick={() => void generate()} disabled={busy} className="glass-button px-3 py-1 font-ui text-[14px] disabled:opacity-50">
        {busy ? "Generating voice…" : label}
      </button>
      {error && <p role="alert" className="font-ui text-[14px] text-wine">{error}</p>}
      {url && <audio controls autoPlay src={url} className="h-9 w-full max-w-[300px]" aria-label="Generated voice audio" />}
    </div>
  );
}
