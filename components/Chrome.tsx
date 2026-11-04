"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, clearSession } from "@/lib/store";
import { MeanderWine } from "./Ornaments";
import { AtlasSideIcon } from "./AtlasSideIcon";

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
    { href: "/atlas", label: "Atlas AI" },
    { href: "/work", label: "Work" },
    { href: "/study", label: "Study" },
    { href: "/people", label: "People" },
    { href: "/life", label: "Life" },
    { href: "/memories", label: "Memories" },
  ];

  return (
    <header className="relative z-40 bg-marble">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="flex items-center justify-between py-4">
          <Link href="/hub" className="group flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-wine">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#c6a15b" strokeWidth="2" />
                <ellipse cx="12" cy="12" rx="8" ry="3.4" stroke="#f4efe6" strokeWidth="1.4" />
              </svg>
            </span>
            <span className="font-display text-[20px] tracking-[0.4em] text-wine">ATLAS</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-pill px-3.5 py-2 font-ui text-[14px] uppercase tracking-[0.22em] transition-colors ${
                    active ? "bg-wine text-marble" : "text-wine hover:bg-gold/40"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setMenu((m) => !m)}
              className="grid h-9 w-9 place-items-center rounded-full border-2 border-wine bg-marble font-ui text-[14px] uppercase tracking-widest text-wine transition-colors hover:bg-wine hover:text-marble"
              aria-label="Account menu"
            >
              {name.slice(0, 1).toUpperCase()}
            </button>
            {menu && (
              <div className="absolute right-0 top-12 w-60 rounded-2xl border-2 border-wine bg-marble p-2 anim-fade">
                <p className="px-3 py-2 font-ui text-[13px] uppercase tracking-[0.24em] text-wine opacity-60">The bearer</p>
                <p className="truncate px-3 pb-2 font-body text-base text-wine">{name}</p>
                <div className="my-2 h-[2px] bg-gold" />
                <button
                  onClick={() => {
                    clearSession();
                    router.push("/login");
                  }}
                  className="w-full rounded-pill px-3 py-2 text-left font-ui text-[13.5px] uppercase tracking-[0.2em] text-wine transition-colors hover:bg-wine hover:text-marble"
                >
                  Set the world down · Sign out
                </button>
              </div>
            )}
          </div>
        </div>
        <MeanderWine height={14} />
      </div>
      {/* the little orb at the edge of every page — one touch opens the Titan */}
      <AtlasSideIcon />
    </header>
  );
}

export function PageShell({
  children,
  title,
  greek,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  title: string;
  greek: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-marble">
      <div className="bg-wine">
        <TopBar />
      </div>
      <main className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-8">
        <div className="flex items-start justify-between gap-4 pt-9 pb-7 anim-fade-up">
          <div>
            <p className="eyebrow">{greek}</p>
            <h1 className="mt-2 font-display text-[clamp(32px,5vw,52px)] leading-[1.05] tracking-[0.06em] text-wine">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 max-w-xl font-body text-[17px] leading-relaxed text-wine opacity-70">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0 pt-2">{action}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
