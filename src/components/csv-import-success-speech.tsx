"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { speakCsvImportSuccess } from "@/lib/speech";

function CsvImportSuccessSpeechInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    if (!success?.includes("تم استيراد")) return;

    const timer = window.setTimeout(() => {
      speakCsvImportSuccess();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  return null;
}

export function CsvImportSuccessSpeech() {
  return (
    <Suspense fallback={null}>
      <CsvImportSuccessSpeechInner />
    </Suspense>
  );
}
