import type { Metadata } from "next";
import { FlipClock } from "@/components/FlipClock";

export const metadata: Metadata = {
  title: "Flip Clock — Atlas",
  description: "A minimal flip clock in your local time.",
};

export default function ClockPage() {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-black px-4 py-12">
      <FlipClock />
    </main>
  );
}
