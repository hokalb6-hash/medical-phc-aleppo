"use client";

import { useState } from "react";
import clsx from "clsx";
import { downloadFileWithSpeech } from "@/lib/speech";

type ExcelDownloadLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function ExcelDownloadLink({ href, className, children }: ExcelDownloadLinkProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await downloadFileWithSpeech(href);
    } catch {
      window.location.href = href;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={clsx(className, loading && "cursor-wait opacity-80")}
    >
      {loading ? "جاري التحميل..." : children}
    </button>
  );
}
