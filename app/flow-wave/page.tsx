import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flow Wave — Three.js",
  description: "A charcoal and sand sea of glowing particles rolling under simplex noise.",
};

export default function FlowWavePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <iframe
        src="/flow-wave/index.html"
        title="Flow Wave — Three.js scene"
        className="fixed inset-0 h-full w-full border-0"
        allow="autoplay; fullscreen"
      />
      <a
        href="/hub"
        className="fixed left-4 top-4 z-10 glass-clear px-3.5 py-2 font-ui text-[17px] uppercase tracking-[0.2em] text-white"
      >
        ← Atlas
      </a>
    </main>
  );
}
