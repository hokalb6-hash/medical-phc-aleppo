"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { speakSuperAdminWelcome } from "@/lib/speech";

function SuperAdminWelcomeSpeechInner({ role }: { role: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (role !== "super_admin") return;
    if (searchParams.get("welcome") !== "1") return;

    const timer = window.setTimeout(() => {
      speakSuperAdminWelcome();
    }, 400);

    const next = new URLSearchParams(searchParams.toString());
    next.delete("welcome");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);

    return () => window.clearTimeout(timer);
  }, [role, searchParams, router, pathname]);

  return null;
}

export function SuperAdminWelcomeSpeech({ role }: { role: string }) {
  if (role !== "super_admin") return null;

  return (
    <Suspense fallback={null}>
      <SuperAdminWelcomeSpeechInner role={role} />
    </Suspense>
  );
}
