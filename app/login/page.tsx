"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScrollFrame } from "@/components/ScrollFrame";
import { signIn, getSession } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existing = getSession();
    if (existing?.email) setEmail(existing.email);
    router.prefetch("/hub");
  }, [router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setTimeout(() => {
      const res = signIn(email.trim(), password);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push("/hub");
    }, 320);
  }

  return (
    <main className="grid min-h-[100svh] w-screen place-items-center overflow-x-hidden bg-wine py-10 pl-20 pr-5 sm:px-28">
      <div className="w-full max-w-[480px] anim-fade-up">
        <ScrollFrame width={480}>
          <div className="text-center">
            <h1 className="font-display text-[40px] leading-none tracking-[0.14em] text-wine sm:text-[46px]">
              LOGIN
            </h1>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
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
                autoComplete="current-password"
                required
                className="mt-1.5 w-full rounded-[10px] border-2 border-wine bg-marble px-3.5 py-3 font-ui text-[20px] text-wine outline-none transition-shadow placeholder:text-wine placeholder:opacity-40 focus:border-wine focus:ring-2 focus:ring-wine/25"
              />
            </label>

            {error && (
              <p className="rounded-[10px] border-2 border-wine bg-marbleDim px-3.5 py-2.5 font-ui text-[18px] tracking-[0.03em] text-wine">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-wine mt-2 w-full">
              {busy ? "Entering…" : "Enter"}
            </button>
          </form>
        </ScrollFrame>
      </div>
    </main>
  );
}
