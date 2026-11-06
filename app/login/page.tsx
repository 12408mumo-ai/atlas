"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScrollFrame } from "@/components/ScrollFrame";
import { AtlasLogo } from "@/components/AtlasLogo";
import { VoiceLogin } from "@/components/VoiceLogin";
import { signIn, createAccount, getSession } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voicePass, setVoicePass] = useState(false);

  useEffect(() => {
    const onVoiceLogin = () => setVoicePass(true);
    window.addEventListener("atlas:voice-login", onVoiceLogin);
    return () => window.removeEventListener("atlas:voice-login", onVoiceLogin);
  }, []);

  useEffect(() => {
    const existing = getSession();
    if (existing?.email) setEmail(existing.email);
    router.prefetch("/hub");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = mode === "sign-in"
        ? await signIn(email, password)
        : await createAccount(email, password, name);
      if (!res.ok) {
        setError(res.error ?? "Could not continue. Please try again.");
        return;
      }
      if (mode === "sign-up" && "needsEmailConfirmation" in res && res.needsEmailConfirmation) {
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("sign-in");
        return;
      }
      router.push("/hub");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {voicePass && (
        <VoiceLogin
          onUnlock={() => {
            setVoicePass(false);
            router.push("/hub");
          }}
          onCancel={() => setVoicePass(false)}
        />
      )}
      <main className="grid min-h-[100svh] w-screen place-items-center overflow-x-hidden bg-wine py-10 pl-20 pr-5 sm:px-28">
      <div className="w-full max-w-[480px] anim-fade-up">
        <ScrollFrame width={480}>
          <div className="text-center">
            <AtlasLogo size={72} className="mx-auto mb-4" ring />
            <h1 className="font-display text-[40px] leading-none tracking-[0.14em] text-wine sm:text-[46px]">
              {mode === "sign-in" ? "LOGIN" : "CREATE ACCOUNT"}
            </h1>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "sign-up" && (
              <label className="block">
                <span className="font-ui text-[17px] uppercase tracking-[0.22em] text-wine opacity-75">
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="mt-1.5 w-full rounded-[10px] border-2 border-wine bg-marble px-3.5 py-3 font-ui text-[20px] text-wine outline-none transition-shadow focus:border-wine focus:ring-2 focus:ring-wine/25"
                />
              </label>
            )}
            <label className="block">
              <span className="font-ui text-[17px] uppercase tracking-[0.22em] text-wine opacity-75">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-[10px] border-2 border-wine bg-marble px-3.5 py-3 font-ui text-[20px] text-wine outline-none transition-shadow placeholder:text-wine placeholder:opacity-40 focus:border-wine focus:ring-2 focus:ring-wine/25"
              />
            </label>
            <label className="block">
              <span className="font-ui text-[17px] uppercase tracking-[0.22em] text-wine opacity-75">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={mode === "sign-up" ? 8 : undefined}
                required
                className="mt-1.5 w-full rounded-[10px] border-2 border-wine bg-marble px-3.5 py-3 font-ui text-[20px] text-wine outline-none transition-shadow placeholder:text-wine placeholder:opacity-40 focus:border-wine focus:ring-2 focus:ring-wine/25"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-[10px] border-2 border-wine bg-marbleDim px-3.5 py-2.5 font-ui text-[18px] tracking-[0.03em] text-wine">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-[10px] border-2 border-wine bg-marble px-3.5 py-2.5 font-ui text-[18px] tracking-[0.03em] text-wine">
                {notice}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-wine mt-2 w-full">
              {busy ? "Please wait…" : mode === "sign-in" ? "Enter" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => setVoicePass(true)}
              className="w-full py-2 font-ui text-[18px] text-wine underline underline-offset-4"
            >
              Sign in by voice
            </button>
            <button
              type="button"
              onClick={() => {
                setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
                setError(null);
                setNotice(null);
              }}
              className="w-full py-2 font-ui text-[18px] text-wine underline underline-offset-4"
            >
              {mode === "sign-in" ? "Create an account" : "Already have an account? Sign in"}
            </button>
          </form>
        </ScrollFrame>
      </div>
    </main>
    </>
  );
}
