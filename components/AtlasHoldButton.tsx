"use client";

import type { ReactNode, ComponentType } from "react";
import HoldButton from "@/components/HoldButton";

const TypedHoldButton = HoldButton as ComponentType<{ children: ReactNode; backgroundColor: string; fillColor: string; textColor: string; fillTextColor: string; size: string; radius: number; holdTime: number; waveAmplitude: number; doneLabel: string; disabled: boolean; onHold: (button: HTMLButtonElement | null) => boolean; onTap: (button: HTMLButtonElement | null) => void; ariaLabel?: string; className: string }>;

type Props = {
  children: ReactNode;
  action?: () => void;
  submit?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
};

/** Hold to act; a brief activation offers an accessible confirmation alternative. */
export function AtlasHoldButton({ children, action, submit = false, disabled = false, label, className = "" }: Props) {
  const perform = (button: HTMLButtonElement | null) => {
    if (disabled) return false;
    if (submit) {
      const form = button?.form;
      if (!form || !form.reportValidity()) return false;
      form.requestSubmit();
    } else action?.();
    return true;
  };
  const alternate = (button: HTMLButtonElement | null) => {
    if (window.confirm(`Confirm: ${label || String(children)}?`)) perform(button);
  };
  return <TypedHoldButton backgroundColor="#36454F" fillColor="#C2B280" textColor="#eee9d9" fillTextColor="#27333b" size="sm" radius={999} holdTime={1500} waveAmplitude={4} doneLabel="Done" disabled={disabled} onHold={perform} onTap={alternate} ariaLabel={label} className={`font-ui ${className}`}>{children}</TypedHoldButton>;
}
