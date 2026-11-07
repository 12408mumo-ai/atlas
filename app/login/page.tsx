"use client";

import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-[100svh] w-screen place-items-center overflow-x-hidden bg-wine py-10 pl-20 pr-5 sm:px-28">
      <div className="w-full max-w-[480px] anim-fade-up">
        <LoginForm />
      </div>
    </main>
  );
}
