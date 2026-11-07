import type { Metadata } from "next";
import { FlipClock } from "@/components/FlipClock";

export const metadata: Metadata = {
  title: "Flip Clock — Atlas",
  description: "A minimal flip clock in your local time.",
};

export default function ClockPage() {
  return (
    <main className="glass-page-dark grid min-h-[100svh] place-items-center px-4 py-12">
      <FlipClock />
    </main>
  );
}
