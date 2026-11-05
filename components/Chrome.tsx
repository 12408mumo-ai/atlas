"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PageShell({
  children,
  title,
  backHref,
}: {
  children: React.ReactNode;
  title: string;
  greek?: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
}) {
  const pathname = usePathname();
  const resolvedBack = backHref ?? (pathname === "/atlas/settings" ? "/atlas" : "/hub");

  return (
    <div className="relative min-h-screen bg-marble">
      <main className="mx-auto max-w-[1280px] pb-24 pl-20 pr-5 pt-7 sm:pl-32 sm:pr-8 sm:pt-9">
        {/* Only the back pointer and the page title */}
        <header className="mb-7 flex items-center gap-4 anim-fade-up">
          <Link
            href={resolvedBack}
            aria-label="Back"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-wine bg-marble font-ui text-[24px] leading-none text-wine transition-colors hover:bg-wine hover:text-marble"
          >
            ←
          </Link>
          <h1 className="font-display text-[clamp(34px,5vw,56px)] leading-[1.05] tracking-[0.06em] text-wine">
            {title}
          </h1>
        </header>

        {children}
      </main>
    </div>
  );
}
