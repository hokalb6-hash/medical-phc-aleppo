"use client";

import { useState } from "react";
import clsx from "clsx";
import { downloadCsvTemplateWithSpeech } from "@/lib/speech";

type CsvTemplateDownloadLinkProps = {
  href: string;
  managerName: string;
  className?: string;
  children: React.ReactNode;
};

export function CsvTemplateDownloadLink({
  href,
  managerName,
  className,
  children,
}: CsvTemplateDownloadLinkProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await downloadCsvTemplateWithSpeech(href, managerName);
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
