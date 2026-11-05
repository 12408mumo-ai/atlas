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
    { href: "/hub", label: "World" },
    { href: "/atlas", label: "Atlas AI" },
    { href: "/work", label: "Work" },
    { href: "/study", label: "Study" },
    { href: "/people", label: "People" },
    { href: "/life", label: "Life" },
    { href: "/memories", label: "Memories" },
  ];

  return (
    <header className="relative z-40 bg-marble">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex items-center justify-between gap-4 py-4">
          <Link href="/hub" className="group flex shrink-0 items-center gap-3">
            <span className="h-11 w-11 overflow-hidden rounded-full border-2 border-wine bg-wine">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-[25px] tracking-[0.34em] text-wine">ATLAS</span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {links.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-pill px-3.5 py-2 font-ui text-[17.5px] uppercase tracking-[0.14em] transition-colors ${
                    active ? "bg-wine text-marble" : "text-wine hover:bg-marbleDim"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative flex shrink-0 items-center gap-2.5">
            <button
              onClick={() => setMenu((m) => !m)}
              className="grid h-11 w-11 place-items-center rounded-full border-2 border-wine bg-marble font-ui text-[18px] uppercase tracking-widest text-wine transition-colors hover:bg-wine hover:text-marble"
              aria-label="Account menu"
            >
              {name.slice(0, 1).toUpperCase()}
            </button>
            {menu && (
              <div className="absolute right-0 top-14 w-72 rounded-2xl border-2 border-wine bg-marble p-2.5 anim-fade">
                <p className="px-3 py-2 font-ui text-[17px] uppercase tracking-[0.2em] text-wine opacity-65">The bearer</p>
                <p className="truncate px-3 pb-2 font-body text-[21px] text-wine">{name}</p>
                <div className="my-2 h-[2px] bg-wine/25" />
                <button
                  onClick={() => {
                    clearSession();
                    router.push("/login");
                  }}
                  className="w-full rounded-pill px-3.5 py-2.5 text-left font-ui text-[17px] uppercase tracking-[0.14em] text-wine transition-colors hover:bg-wine hover:text-marble"
                >
                  Set the world down · Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* compact scrollable nav strip below xl so all 7 doors remain roomy at large font scale */}
        <nav className="-mx-1 flex items-center gap-1.5 overflow-x-auto pb-3 xl:hidden" aria-label="Primary navigation">
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 rounded-pill border-2 border-wine px-3.5 py-1.5 font-ui text-[17px] uppercase tracking-[0.13em] transition-colors ${
                  active ? "bg-wine text-marble" : "bg-marble text-wine hover:bg-marbleDim"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

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
      <main className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4 pt-9 pb-7 anim-fade-up">
          <div>
            <p className="eyebrow">{greek}</p>
            <h1 className="mt-2 font-display text-[clamp(38px,5.6vw,60px)] leading-[1.05] tracking-[0.06em] text-wine">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 max-w-2xl font-body text-[22px] leading-relaxed text-wine opacity-75">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0 pt-2">{action}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
