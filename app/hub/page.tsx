import { HomeSections } from "@/components/HomeSections";

export default function HubPage() {
  return (
    <main className="glass-page-dark min-h-[100svh] text-marble">
      <div className="mx-auto flex min-h-[100svh] max-w-5xl flex-col px-6 pb-10 pt-12 pl-[88px] sm:px-14 sm:py-16 sm:pl-32 lg:pl-14">
        <header className="border-b border-marble/25 pb-8 sm:pb-10">
          <p className="font-ui text-[11px] uppercase tracking-[0.35em] text-marbleDim">Veni · Vidi · Vici</p>
          <h1 className="mt-5 font-display text-[clamp(46px,8vw,88px)] leading-none tracking-[0.06em]">Atlas</h1>
          <p className="mt-4 max-w-lg font-body text-[clamp(20px,2.8vw,27px)] italic leading-snug text-marbleDim">Your world, all in one place.</p>
        </header>
        <HomeSections />
        <footer className="pt-5 font-ui text-[10px] uppercase tracking-[0.2em] text-marbleDim/80">The world you carry</footer>
      </div>
    </main>
  );
}
