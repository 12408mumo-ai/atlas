"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/Chrome";
import { DEFAULT_MODEL, KEY_KEY, MODEL_KEY } from "@/lib/assistant";

export default function AtlasPage() {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [message, setMessage] = useState("");
  useEffect(() => { setKey(sessionStorage.getItem(KEY_KEY) || ""); setModel(localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL); }, []);
  function save(event: React.FormEvent) {
    event.preventDefault();
    try { sessionStorage.setItem(KEY_KEY, key.trim()); localStorage.setItem(MODEL_KEY, model.trim() || DEFAULT_MODEL); setMessage("Settings saved for this tab. Enable the microphone on the orb to begin."); }
    catch { setMessage("Could not save settings in this browser."); }
  }
  return <PageShell title="Atlas"><div className="max-w-2xl">
    <p className="font-body text-xl italic text-wine/75">Connect your assistant, then use the orb on the left to speak or type a command without covering your page.</p>
    <form onSubmit={save} className="glass-card mt-6 space-y-5 p-5 sm:p-7">
      <h2 className="font-display text-2xl text-wine">OpenRouter connection</h2>
      <label className="block font-ui text-sm text-wine">API key<input className="field mt-2" type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" placeholder="OpenRouter API key" /></label>
      <label className="block font-ui text-sm text-wine">Model ID<input className="field mt-2" value={model} onChange={e => setModel(e.target.value)} required maxLength={150} placeholder={DEFAULT_MODEL} /></label>
      <p className="font-body text-base text-wine/75">The key is kept in this tab’s session storage and sent directly to OpenRouter with each command. The model ID is saved in this browser. Requests may use your OpenRouter credits.</p>
      <div className="flex flex-wrap gap-3"><button className="rounded-full bg-wine px-5 py-2.5 font-ui text-sm text-marble" type="submit">Save connection</button><button type="button" className="rounded-full border border-wine/50 px-5 py-2.5 font-ui text-sm text-wine" onClick={() => { sessionStorage.removeItem(KEY_KEY); setKey(""); setMessage("API key removed from this tab."); }}>Remove key</button></div>
      {message && <p role="status" className="font-ui text-sm text-wine">{message}</p>}
    </form>
    <div className="mt-6 font-body text-lg text-wine/80"><h2 className="font-display text-xl">Getting started</h2><p className="mt-2">Open the orb and enable wake listening. Say “Atlas, open Life” or “Atlas, add visit Kyoto to places.” You can also type a command. Additions require your approval.</p><p className="mt-2">Wake listening requires a supported browser, microphone permission and an open tab. Speech recognition may be processed by your browser’s speech provider; it is not a system-wide wake word.</p></div>
  </div></PageShell>;
}
