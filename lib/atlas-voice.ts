"use client";

export type VoiceSettings = { apiKey: string; referenceId: string };
const VOICE_KEY = "atlas.voice.test.v1";

// Testing only: sessionStorage is readable by scripts in this origin and is not encrypted.
export function loadVoiceSettings(): VoiceSettings {
  try {
    const value = JSON.parse(sessionStorage.getItem(VOICE_KEY) || "{}");
    return { apiKey: typeof value.apiKey === "string" ? value.apiKey : "", referenceId: typeof value.referenceId === "string" ? value.referenceId : "" };
  } catch { return { apiKey: "", referenceId: "" }; }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  sessionStorage.setItem(VOICE_KEY, JSON.stringify({ apiKey: settings.apiKey.trim(), referenceId: settings.referenceId.trim() }));
}

export function clearVoiceSettings() {
  sessionStorage.removeItem(VOICE_KEY);
}

export async function synthesizeVoice(text: string): Promise<Blob> {
  const { apiKey, referenceId } = loadVoiceSettings();
  if (!apiKey || !referenceId) throw new Error("Add your Fish Audio key and voice ID in Atlas Assistant Settings first.");
  if (!text.trim() || text.length > 1500) throw new Error("Voice playback supports up to 1,500 characters at a time.");
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ text, referenceId }),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Could not generate voice audio.");
  }
  return response.blob();
}
