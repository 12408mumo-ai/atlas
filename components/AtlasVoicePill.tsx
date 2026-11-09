"use client";

import type { ComponentType } from "react";
import VoicePill from "@/components/VoicePill";

type Reason = "release" | "tap" | "key" | "escape" | "blur" | "cancel" | "disabled" | "mic-denied" | "unmount";
type PillProps = { accentColor: string; iconColor: string; background: string; size: number; mode: string; reactive: string; waveform: boolean; active: boolean; stream?: MediaStream | null; disabled: boolean; ariaLabel: string; onStart: () => boolean | void; onStop: (event: { reason: Reason; duration: number }) => void };
const Pill = VoicePill as ComponentType<PillProps>;

export function AtlasVoicePill({ active, stream, onStart, onStop, disabled = false, label }: { active: boolean; stream?: MediaStream | null; onStart: () => boolean | void; onStop: (reason: Reason) => void; disabled?: boolean; label: string }) {
  return <Pill accentColor="#eee9d9" iconColor="#C2B280" background="#27333b" size={44} mode="auto" reactive="external" waveform={!!stream} active={active} stream={stream} disabled={disabled} ariaLabel={label} onStart={onStart} onStop={({ reason }) => onStop(reason)} />;
}
