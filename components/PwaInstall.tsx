"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __atlasDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__atlasDeferredPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event("atlas-install-ready"));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  return null;
}

export function InstallAppButton({
  tone = "dark",
  className = "",
  label = "Download app",
}: {
  tone?: "dark" | "light";
  className?: string;
  label?: string;
}) {
  const [promptEvt, setPromptEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
    setInstalled(standalone);

    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }

    const ua = window.navigator.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.__atlasDeferredPrompt) {
      setPromptEvt(window.__atlasDeferredPrompt);
    }

    const sync = () => setPromptEvt(window.__atlasDeferredPrompt ?? null);
    const onInstalled = () => {
      setInstalled(true);
      window.__atlasDeferredPrompt = null;
      setPromptEvt(null);
      setOpenHelp(false);
    };

    window.addEventListener("atlas-install-ready", sync);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("atlas-install-ready", sync);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    const evt = promptEvt || window.__atlasDeferredPrompt;
    if (evt) {
      try {
        await evt.prompt();
        const choice = await evt.userChoice;
        if (choice.outcome === "accepted") {
          window.__atlasDeferredPrompt = null;
          setPromptEvt(null);
        }
        return;
      } catch {
        // Fall through to install guide modal
      }
    }
    setOpenHelp(true);
  }

  const btnStyle =
    tone === "dark"
      ? "border-2 border-marble bg-transparent text-marble hover:bg-marble hover:text-wine"
      : "border-2 border-wine bg-marble text-wine hover:bg-wine hover:text-marble";

  return (
    <>
      <button
        type="button"
        onClick={() => void handleInstall()}
        className={`inline-flex items-center justify-center gap-2.5 rounded-pill px-5 py-2.5 font-ui text-[17px] uppercase tracking-[0.15em] transition-colors ${btnStyle} ${className}`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span>{label}</span>
      </button>

      {openHelp && (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-wine/85 p-5 anim-fade"
          role="dialog"
          aria-modal="true"
          aria-label="Download Atlas App"
          onClick={() => setOpenHelp(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-2xl border-2 border-marble bg-wine p-6 text-left text-marble sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/icon-192.png"
                alt="Atlas app icon"
                className="h-16 w-16 shrink-0 rounded-2xl border-2 border-marble object-cover"
              />
              <div>
                <p className="font-ui text-[16.5px] uppercase tracking-[0.2em] text-marble opacity-75">
                  Installable Web App
                </p>
                <h2 className="mt-0.5 font-display text-[26px] tracking-[0.06em] text-marble">
                  Download Atlas
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3 font-body text-[20px] leading-snug text-marble opacity-90">
              {inIframe && (
                <div className="rounded-xl border-2 border-marble/40 bg-wineDeep p-4">
                  <p className="font-ui text-[16.5px] uppercase tracking-[0.15em] text-marble">
                    Step 1 · Open outside preview frame
                  </p>
                  <p className="mt-1 font-body text-[19.5px] text-marble opacity-85">
                    Browsers unlock direct app installation when opened in a full browser tab.
                  </p>
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold btn-sm mt-3 w-full"
                  >
                    Open in full tab to install ↗
                  </a>
                </div>
              )}

              {isIOS ? (
                <p>
                  In Safari, tap the <strong>Share</strong> icon at the bottom of your screen, then choose{" "}
                  <strong>Add to Home Screen</strong>. Atlas will appear on your home screen with his statue emblem.
                </p>
              ) : (
                <p>
                  In Chrome, Edge, or Brave, click the <strong>Install Atlas</strong> icon in the address bar (or open
                  the browser menu <strong>⋮ → Install Atlas</strong>) to add Atlas to your device with his statue icon.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setOpenHelp(false)} className="btn-gold btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
