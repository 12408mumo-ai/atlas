"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel } from "@/components/ui";
import { VoicePlayer } from "@/components/VoicePlayer";
import { clearVoiceSettings, loadVoiceSettings, saveVoiceSettings, type VoiceSettings } from "@/lib/atlas-voice";
import {
  DEFAULT_SETTINGS,
  PROVIDERS,
  loadAISettings,
  saveAISettings,
  testConnection,
  type AIProvider,
  type AISettings,
} from "@/lib/atlas-ai";

/* ------------------------------------------------------------------ */
/*  Atlas Assistant Settings — the altar where a key is laid.         */
/*  Paste any provider's API key, choose a model, test which one      */
/*  answers best. The browser sends the key to the chosen provider.  */
/*  the provider directly, local-first like the rest of the world.    */
/* ------------------------------------------------------------------ */

type TestState = { phase: "idle" | "running" | "ok" | "fail"; detail: string };

export default function AtlasSettingsPage() {
  const [form, setForm] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [customModel, setCustomModel] = useState(false);
  const [test, setTest] = useState<TestState>({ phase: "idle", detail: "" });
  const [savedAt, setSavedAt] = useState("");
  const [voice, setVoice] = useState<VoiceSettings>({ apiKey: "", referenceId: "" });
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [showVoiceKey, setShowVoiceKey] = useState(false);

  useEffect(() => {
    const settings = loadAISettings();
    setForm(settings);
    const storedVoice = loadVoiceSettings();
    setVoice(storedVoice);
    setVoiceSaved(Boolean(storedVoice.apiKey && storedVoice.referenceId));
    const known = PROVIDERS[settings.provider].models.some((m) => m.id === settings.model);
    setCustomModel(!known);
    setLoaded(true);
  }, []);

  const provider = PROVIDERS[form.provider];
  const maskedKey = useMemo(() => {
    const k = form.apiKey;
    if (k.length <= 8) return k ? "••••••••" : "";
    return `${k.slice(0, 5)}••••••••${k.slice(-4)}`;
  }, [form.apiKey]);

  function patch(p: Partial<AISettings>) {
    setForm((f) => ({ ...f, ...p }));
    setTest((t) => (t.phase === "idle" ? t : { phase: "idle", detail: "" }));
  }

  function setProvider(p: AIProvider) {
    const models = PROVIDERS[p].models;
    setForm((f) => ({
      ...f,
      provider: p,
      apiKey: p === f.provider ? f.apiKey : "",
      model: models.length ? models[0].id : f.model,
      baseUrl: p === "custom" ? f.baseUrl : "",
    }));
    setCustomModel(!models.length);
    setTest({ phase: "idle", detail: "" });
  }

  function save() {
    saveAISettings(form);
    setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }

  async function runTest() {
    saveAISettings(form);
    setTest({ phase: "running", detail: "Sending a probe to Olympus…" });
    const res = await testConnection(form);
    setTest({ phase: res.ok ? "ok" : "fail", detail: res.detail });
  }

  function clearKey() {
    patch({ apiKey: "" });
    saveAISettings({ apiKey: "" });
  }

  if (!loaded) {
    return (
      <PageShell greek="Θυσιαστήριον" title="Atlas Assistant Settings">
        <p className="font-body text-[20px] italic text-wine opacity-65">Raising the altar…</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      greek="Θυσιαστήριον · the altar"
      title="Atlas Assistant Settings"
      subtitle="Here the key is laid that powers the Titan. Any provider's key works — paste it, pick a model, and test which answers best. The key never leaves this browser."
      action={
        <Link href="/atlas" className="btn-ghost btn-sm">
          ← Back to Atlas
        </Link>
      }
    >
      <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        {/* ================= THE KEY ================= */}
        <Panel title="The key that powers Atlas" hint="Bring your own key — it is stored only in this browser">
          <div className="space-y-4">
            {/* provider */}
            <div>
              <label className="mb-1.5 block font-ui text-[17.5px] uppercase tracking-[0.18em] text-wine opacity-75">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(Object.keys(PROVIDERS) as AIProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`rounded-xl border-2 px-3 py-2.5 font-ui text-[17.5px] uppercase tracking-[0.11em] transition-colors ${
                      form.provider === p ? "border-wine bg-wine text-marble" : "border-wine bg-marble text-wine hover:bg-marbleDim"
                    }`}
                  >
                    {PROVIDERS[p].label.split(" — ")[0]}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-body text-[19.5px] italic text-wine opacity-65">{provider.keyHint}</p>
            </div>

            {/* api key */}
            <div>
              <label htmlFor="ai-key" className="mb-1.5 block font-ui text-[17.5px] uppercase tracking-[0.18em] text-wine opacity-75">
                API key
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="ai-key"
                  type={showKey ? "text" : "password"}
                  className="field min-w-[220px] flex-1"
                  placeholder="Paste the key here…"
                  value={form.apiKey}
                  onChange={(e) => patch({ apiKey: e.target.value })}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button onClick={() => setShowKey((v) => !v)} className="btn-ghost btn-sm shrink-0" aria-label="Show or hide the key">
                  {showKey ? "Hide" : "Show"}
                </button>
                {form.apiKey && (
                  <button onClick={clearKey} className="btn-ghost btn-sm shrink-0" aria-label="Remove the key">
                    Lift
                  </button>
                )}
              </div>
              {form.apiKey && !showKey && (
                <p className="mt-1.5 font-ui text-[18px] tracking-[0.06em] text-wine opacity-60">Held key: {maskedKey}</p>
              )}
            </div>

            {/* base url for custom */}
            {form.provider === "custom" && (
              <div>
                <label className="mb-1.5 block font-ui text-[17.5px] uppercase tracking-[0.18em] text-wine opacity-75">
                  Base URL · OpenAI-compatible
                </label>
                <input
                  className="field"
                  placeholder="https://openrouter.ai/api/v1  ·  https://api.groq.com/openai/v1  ·  http://localhost:11434/v1"
                  value={form.baseUrl}
                  onChange={(e) => patch({ baseUrl: e.target.value })}
                  spellCheck={false}
                />
              </div>
            )}

            {/* model */}
            <div>
              <label className="mb-1.5 block font-ui text-[17.5px] uppercase tracking-[0.18em] text-wine opacity-75">
                Model — the mind to test
              </label>
              {!customModel ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {provider.models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => patch({ model: m.id })}
                        className={`rounded-pill border-2 px-4 py-2 font-ui text-[17.5px] uppercase tracking-[0.1em] transition-colors ${
                          form.model === m.id
                            ? "border-wine bg-wine text-marble"
                            : "border-wine bg-marble text-wine hover:bg-marbleDim"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomModel(true)}
                      className="rounded-pill border-2 border-dashed border-wine px-4 py-2 font-ui text-[17.5px] uppercase tracking-[0.1em] text-wine opacity-75 transition-opacity hover:opacity-100"
                    >
                      Other…
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="field flex-1"
                    placeholder="Exact model id, e.g. gpt-4o-mini"
                    value={form.model}
                    onChange={(e) => patch({ model: e.target.value })}
                    spellCheck={false}
                  />
                  {provider.models.length > 0 && (
                    <button onClick={() => setCustomModel(false)} className="btn-ghost btn-sm shrink-0">
                      List
                    </button>
                  )}
                </div>
              )}
              <p className="mt-2 font-ui text-[18px] tracking-[0.05em] text-wine opacity-65">
                Armed with: <span className="font-semibold text-wine opacity-100">{form.model || "—"}</span>
              </p>
            </div>

            {/* save + test */}
            <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-wine/20 pt-4">
              <button onClick={save} className="btn-wine">
                Lay the key
              </button>
              <button
                onClick={() => void runTest()}
                disabled={test.phase === "running" || !form.apiKey || !form.model}
                className="btn-marble"
              >
                {test.phase === "running" ? "Probing…" : "Test the key"}
              </button>
              {savedAt && (
                <p className="font-ui text-[17px] uppercase tracking-[0.15em] text-wine opacity-65">laid at {savedAt}</p>
              )}
            </div>

            {/* test verdict */}
            {test.phase !== "idle" && (
              <div
                className={`rounded-xl border-2 px-4 py-3.5 ${
                  test.phase === "ok"
                    ? "border-wine bg-wine text-marble"
                    : "border-wine bg-marbleDim text-wine"
                }`}
              >
                <p className="font-ui text-[17.5px] uppercase tracking-[0.18em]">
                  {test.phase === "ok" ? "✦ The model answers" : test.phase === "fail" ? "✕ The key was refused" : "…"}
                </p>
                <p className="mt-1 whitespace-pre-wrap font-body text-[20px] leading-snug opacity-90">{test.detail}</p>
                {test.phase === "ok" && (
                  <Link href="/atlas" className="btn-gold btn-sm mt-3">
                    Go to Atlas →
                  </Link>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* ================= SECURITY ================= */}
        <div className="space-y-3.5">
          <Panel title="Fish Audio voice" hint="Optional · testing in this tab">
            <div className="space-y-3">
              <p className="font-body text-[18px] text-wine">Use a new, limited-spend key. This testing key is unencrypted in this tab&apos;s session storage and is sent through the Atlas server to Fish Audio only when you generate speech. Anyone with access to this browser or malicious scripts on this site could read it.</p>
              <label className="block font-ui text-[16px] text-wine" htmlFor="fish-key">Fish Audio API key</label>
              <div className="flex flex-wrap gap-2">
                <input id="fish-key" className="field min-w-0 flex-1" type={showVoiceKey ? "text" : "password"} value={voice.apiKey} onChange={(e) => { setVoice({ ...voice, apiKey: e.target.value }); setVoiceSaved(false); }} autoComplete="off" spellCheck={false} />
                <button type="button" onClick={() => setShowVoiceKey(!showVoiceKey)} className="glass-button px-3 py-2 font-ui text-[15px]">{showVoiceKey ? "Hide" : "Show"}</button>
              </div>
              <label className="block font-ui text-[16px] text-wine" htmlFor="fish-voice-id">Fish Audio voice ID</label>
              <input id="fish-voice-id" className="field" value={voice.referenceId} onChange={(e) => { setVoice({ ...voice, referenceId: e.target.value }); setVoiceSaved(false); }} placeholder="32-character voice ID" autoComplete="off" spellCheck={false} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-wine btn-sm" onClick={() => { if (!voice.apiKey.trim() || !/^[a-f0-9]{32}$/i.test(voice.referenceId.trim())) { setVoiceError("Enter a key and a valid 32-character Fish voice ID."); return; } try { saveVoiceSettings(voice); setVoiceError(""); setVoiceSaved(true); } catch { setVoiceError("Could not save voice settings in this browser."); setVoiceSaved(false); } }}>Save voice for this tab</button>
                <button type="button" className="glass-button px-3 py-2 font-ui text-[15px]" onClick={() => { clearVoiceSettings(); setVoice({ apiKey: "", referenceId: "" }); setVoiceSaved(false); setVoiceError(""); }}>Remove voice key</button>
              </div>
              {voiceError && <p role="alert" className="font-ui text-[14px] text-wine">{voiceError}</p>}
              {voiceSaved && <p role="status" className="font-ui text-[14px] text-wine">Voice settings saved for this tab. Test speech uses your provider credits.</p>}
              {voiceSaved && <VoicePlayer key={`${voice.apiKey.length}-${voice.referenceId}`} text="Hello. I am Atlas, ready to help you carry your world." label="Test voice" />}
            </div>
          </Panel>
          <Panel title="On safety" hint="Testing credentials">
            <ul className="space-y-2.5 font-body text-[20px] leading-snug text-wine opacity-85">
              <li>· The AI key is stored unencrypted in this browser&apos;s <em>local storage</em>. Anyone with browser access or malicious scripts on this site could read it.</li>
              <li>· AI calls go directly to your selected provider. Voice requests pass through the Atlas server to Fish Audio; the voice key is not saved on the server.</li>
              <li>· “Lift” removes the AI key. The voice key is kept only for this tab’s session and can be removed above.</li>
              <li>· Use a key with a spend limit while you test which model works best.</li>
            </ul>
          </Panel>

        </div>
      </div>
    </PageShell>
  );
}
