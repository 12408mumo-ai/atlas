"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, clearSession } from "@/lib/store";
import { Meander } from "./Ornaments";

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("Bearer");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s?.name) setName(s.name);
  }, []);

  const links = [
    { href: "/hub", label: "Hub" },
    { href: "/work", label: "Work" },
    { href: "/study", label: "Study" },
    { href: "/people", label: "People" },
    { href: "/life", label: "Life" },
    { href: "/memories", label: "Memories" },
  ];

  return (
    <header className="relative z-40">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex items-center justify-between py-5">
          <Link href="/hub" className="group flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/40 bg-gold/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#e2b563" strokeWidth="1.1" />
                <ellipse cx="12" cy="12" rx="9" ry="4" stroke="#e2b563" strokeWidth=".8" opacity=".7" />
                <path d="M12 3v18" stroke="#e2b563" strokeWidth=".8" opacity=".55" />
              </svg>
            </span>
            <span className="font-display text-[19px] tracking-[.42em] text-marble/90 group-hover:text-goldBright transition">
              ATLAS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative px-3.5 py-2 font-ui text-[10px] uppercase tracking-[.24em] transition ${
                    active ? "text-goldBright" : "text-marble/50 hover:text-marble/85"
                  }`}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="relative flex items-center gap-2">
            <span className="hidden sm:block eyebrow !tracking-[.24em] text-marble/40">
              {name}
              <span className="mx-2 text-gold/40">·</span>
            </span>
            <button
              onClick={() => setMenu((m) => !m)}
              className="grid h-9 w-9 place-items-center border border-gold/25 bg-white/[.02] text-gold/80 hover:border-gold/50 hover:text-goldBright transition rounded-full font-ui text-[11px] tracking-widest"
              aria-label="Account menu"
            >
              {name.slice(0, 1).toUpperCase()}
            </button>
            {menu && (
              <div className="absolute right-0 top-12 w-56 glass rounded-sm p-2 shadow-relic anim-fade">
                <p className="px-3 py-2 eyebrow !tracking-[.2em]">The bearer</p>
                <p className="px-3 pb-2 font-body text-sm text-marble/80 truncate">{name}</p>
                <div className="rule-gold my-2" />
                <button
                  onClick={() => {
                    clearSession();
                    router.push("/login");
                  }}
                  className="w-full px-3 py-2 text-left font-ui text-[10px] uppercase tracking-[.22em] text-marble/60 hover:text-goldBright hover:bg-gold/5 rounded-sm transition"
                >
                  Set the world down · Sign out
                </button>
              </div>
            )}
          </div>
        </div>
        <Meander height={14} />
      </div>
    </header>
  );
}

export function PageShell({
  children,
  title,
  greek,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  greek: string;
  subtitle?: string;
}) {
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1100px 620px at 50% -10%, rgba(47,111,143,.18), transparent 60%), radial-gradient(900px 500px at 85% 110%, rgba(226,181,99,.10), transparent 60%), #070a10",
        }}
      />
      <TopBar />
      <main className="mx-auto max-w-[1240px] px-5 sm:px-8 pb-24">
        <div className="pt-10 pb-8 anim-fade-up">
          <p className="eyebrow">{greek}</p>
          <h1 className="mt-3 font-display text-[clamp(30px,5vw,52px)] leading-[1.05] tracking-[.06em]">
            <span className="gold-text">{title}</span>
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-xl font-body text-[15px] leading-relaxed text-marble/55">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
