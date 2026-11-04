"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/store";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getSession() ? "/hub" : "/login");
  }, [router]);
  return (
    <main className="grid min-h-screen place-items-center bg-marble">
      <p className="eyebrow">Awakening the Titan…</p>
    </main>
  );
}
