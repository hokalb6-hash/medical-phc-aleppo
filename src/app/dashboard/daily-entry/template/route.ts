import { NextResponse } from "next/server";
import { DAILY_FIELDS } from "@/lib/constants";
import { getCurrentUserProfile } from "@/lib/auth";

function csvEscape(value: string | number | null | undefined) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const headers = [
    "entry_date",
    "clinic_id",
    "clinic_name",
    "month",
    "year",
    ...DAILY_FIELDS.map((f) => f.key),
  ];

  const sample = [
    "2026-05-06",
    "",
    "العيادة الداخلية",
    "5",
    "2026",
    ...DAILY_FIELDS.map(() => "0"),
  ];

  const csv = `\uFEFF${headers.map(csvEscape).join(",")}\r\n${sample
    .map(csvEscape)
    .join(",")}\r\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="daily-entry-template.csv"',
    },
  });
}
