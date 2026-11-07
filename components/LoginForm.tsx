"use client";

import { useRouter } from "next/navigation";
import { ScrollFrame } from "@/components/ScrollFrame";
import { AtlasLogo } from "@/components/AtlasLogo";
import { enterAsGuest } from "@/lib/store";

/** Entry point for a world stored locally on this device. */
export function LoginForm() {
  const router = useRouter();

  function enter() {
    enterAsGuest();
    router.push("/hub");
  }

  return (
    <ScrollFrame width={480}>
      <div className="text-center">
        <AtlasLogo size={72} className="mx-auto mb-4" ring />
        <h1 className="font-display text-[40px] leading-none tracking-[0.14em] text-wine sm:text-[46px]">
          YOUR WORLD
        </h1>
        <p className="mt-5 font-body text-[20px] text-wine">
          Your Atlas is stored in this browser on this device.
        </p>
        <button type="button" onClick={enter} className="btn-wine mt-6 w-full">
          Enter Atlas
        </button>
      </div>
    </ScrollFrame>
  );
}
