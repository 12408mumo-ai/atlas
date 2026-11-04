"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/Chrome";
import { Panel } from "@/components/ui";
import {
  DEFAULT_SETTINGS,
  PROVIDERS,
  loadAISettings,
  saveAISettings,
  speak,
  testConnection,
  type AIProvider,
  type AISettings,
} from "@/lib/atlas-ai";

/* ------------------------------------------------------------------ */
/*  Atlas Assistant Settings — the altar where a key is laid.         */
/*  Paste any provider's API key, choose a model, test which one      */
/*  answers best. The key never leaves this browser — Atlas calls     */
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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const st = loadAISettings();
    setForm(st);
    setLoaded(true);
    // model not in the provider's list → show the free-text field
    const known = PROVIDERS[st.provider].models.some((m) => m.id === st.model);
    setCustomModel(!known);

    const collect = () => setVoices(window.speechSynthesis?.getVoices?.() ?? []);
    collect();
    window.speechSynthesis?.addEventListener?.("voiceschanged", collect);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", collect);
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
    const res = await testConnection({ ...form, speak: false });
    setTest({ phase: res.ok ? "ok" : "fail", detail: res.detail });
  }

  function clearKey() {
    patch({ apiKey: "" });
    saveAISettings({ apiKey: "" });
  }

  if (!loaded) {
    return (
      <PageShell greek="Θυσίαστήριον" title="Atlas Assistant Settings">
        <p className="font-body text-[16px] italic text-wine opacity-60">Raising the altar…</p>
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
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        {/* ================= THE KEY ================= */}
        <Panel title="The key that powers Atlas" hint="Bring your own key — it is stored only in this browser">
          <div className="space-y-4">
            {/* provider */}
            <div>
              <label className="mb-1.5 block font-ui text-[13.5px] uppercase tracking-[0.22em] text-wine opacity-70">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(PROVIDERS) as AIProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`rounded-xl border-2 px-3 py-2.5 font-ui text-[13.5px] uppercase tracking-[0.14em] transition-colors ${
                      form.provider === p ? "border-wine bg-wine text-marble" : "border-wine bg-marble text-wine hover:bg-wine/10"
                    }`}
                  >
                    {PROVIDERS[p].label.split(" — ")[0]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 font-body text-[15px] italic text-wine opacity-60">{provider.keyHint}</p>
            </div>

            {/* api key */}
            <div>
              <label className="mb-1.5 block font-ui text-[13.5px] uppercase tracking-[0.22em] text-wine opacity-70">
                API key
              </label>
              <div className="flex gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  className="field flex-1"
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
                <p className="mt-1.5 font-ui text-[14px] tracking-[0.08em] text-wine opacity-50">Held key: {maskedKey}</p>
              )}
            </div>

            {/* base url for custom */}
            {form.provider === "custom" && (
              <div>
                <label className="mb-1.5 block font-ui text-[13.5px] uppercase tracking-[0.22em] text-wine opacity-70">
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
              <label className="mb-1.5 block font-ui text-[13.5px] uppercase tracking-[0.22em] text-wine opacity-70">
                Model — the mind to test
              </label>
              {!customModel ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {provider.models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => patch({ model: m.id })}
                        className={`rounded-pill border-2 px-3.5 py-2 font-ui text-[13.5px] uppercase tracking-[0.12em] transition-colors ${
                          form.model === m.id
                            ? "border-wine bg-wine text-marble"
                            : "border-wine bg-marble text-wine hover:bg-wine/10"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomModel(true)}
                      className="rounded-pill border-2 border-dashed border-wine px-3.5 py-2 font-ui text-[13.5px] uppercase tracking-[0.12em] text-wine opacity-70 transition-opacity hover:opacity-100"
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
              <p className="mt-1.5 font-ui text-[14px] tracking-[0.06em] text-wine opacity-50">
                Armed with: <span className="text-wine">{form.model || "—"}</span>
              </p>
            </div>

            {/* save + test */}
            <div className="flex flex-wrap items-center gap-2 border-t-2 border-wine pt-4">
              <button onClick={save} className="btn-wine">
                Lay the key
              </button>
              <button
                onClick={() => void runTest()}
                disabled={test.phase === "running" || !form.apiKey || !form.model}
                className="btn-gold"
              >
                {test.phase === "running" ? "Probing…" : "Test the key"}
              </button>
              {savedAt && (
                <p className="font-ui text-[13px] uppercase tracking-[0.18em] text-wine opacity-60">laid at {savedAt}</p>
              )}
            </div>

            {/* test verdict */}
            {test.phase !== "idle" && (
              <div
                className={`rounded-xl border-2 px-4 py-3 ${
                  test.phase === "ok"
                    ? "border-wine bg-wine text-marble"
                    : test.phase === "fail"
                      ? "border-wine bg-marbleDim text-wine"
                      : "border-wine bg-marbleDim text-wine"
                }`}
              >
                <p className="font-ui text-[13.5px] uppercase tracking-[0.22em]">
                  {test.phase === "ok" ? "✦ The model answers" : test.phase === "fail" ? "✕ The key was refused" : "…"}
                </p>
                <p className="mt-1 whitespace-pre-wrap font-body text-[16px] leading-snug opacity-90">{test.detail}</p>
                {test.phase === "ok" && (
                  <Link href="/atlas" className="btn-gold btn-sm mt-3">
                    Go speak with Atlas →
                  </Link>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* ================= VOICE + SECURITY ================= */}
        <div className="space-y-3">
          <Panel title="The voice of the Titan" hint="Speech is poured from your browser's own voices" tone="wine">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="font-body text-[16px] text-marble">Atlas speaks his replies aloud</span>
                <button
                  role="switch"
                  aria-checked={form.speak}
                  onClick={() => patch({ speak: !form.speak })}
                  className={`relative h-7 w-12 shrink-0 rounded-pill border-2 border-gold transition-colors ${form.speak ? "bg-gold" : "bg-transparent"}`}
                >
                  <span
                    className={`absolute top-0.5 rounded-full transition-all ${form.speak ? "left-6 bg-wine" : "left-0.5 bg-gold"}`}
                    style={{ height: 18, width: 18 }}
                  />
                </button>
              </label>

              <div>
                <label className="mb-1.5 block font-ui text-[13.5px] uppercase tracking-[0.22em] text-gold">
                  Choose his voice
                </label>
                <select
                  className="field"
                  value={form.voiceURI}
                  onChange={(e) => {
                    const voiceURI = e.target.value;
                    patch({ voiceURI });
                    saveAISettings({ voiceURI });
                    speak("I am Atlas. I hold the world you give me.", { ...form, voiceURI });
                  }}
                >
                  <option value="">The default voice of this device</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} · {v.lang}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 font-body text-[15px] italic text-marble opacity-60">
                  Choosing a voice plays a short preview.
                </p>
              </div>

              <button onClick={save} className="btn-gold btn-sm w-full">
                Save voice & key together
              </button>
            </div>
          </Panel>

          <Panel title="On safety" hint="Where the key lives">
            <ul className="space-y-2.5 font-body text-[16px] leading-snug text-wine opacity-80">
              <li>· The key is kept in this browser's <em>local storage</em> only — no server of ours ever sees it.</li>
              <li>· Calls go straight from your browser to the provider you chose.</li>
              <li>· “Lift” removes the key at once; clearing browser data does too.</li>
              <li>· Use a key with a spend limit while you test which model works best.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
