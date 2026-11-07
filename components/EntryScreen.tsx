import { FlipClock } from "@/components/FlipClock";
import { LoginForm } from "@/components/LoginForm";

/** Shared entry layout for the opening and login routes. */
export function EntryScreen() {
  return (
    <main className="relative z-10 grid min-h-[100svh] w-full place-items-center overflow-x-hidden bg-wine px-5 py-10 text-marble sm:px-8">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-8 anim-fade-up">
        <FlipClock compact />
        <div className="w-full">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
