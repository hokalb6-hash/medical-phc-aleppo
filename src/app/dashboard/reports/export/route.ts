import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { DAILY_FIELDS } from "@/lib/constants";

function csvEscape(value: string | number | null | undefined) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toExcelFriendlyCsv(lines: string[]) {
  // UTF-8 BOM helps Excel detect Arabic text correctly.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export async function GET(request: Request) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get("clinicId") ?? "";
  const year = Number(searchParams.get("year") ?? 0);
  const month = Number(searchParams.get("month") ?? 0);
  const date = searchParams.get("date") ?? "";
  const view = searchParams.get("view") ?? "monthly";
  const centerIdParam = searchParams.get("centerId") ?? "";
  const centerId =
    profile.role === "super_admin" ? centerIdParam : profile.center_id ?? "";

  if (!centerId || !clinicId) {
    return NextResponse.json(
      { error: "اختر المركز والعيادة أولاً" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  if (view === "daily") {
    if (!date) {
      return NextResponse.json(
        { error: "التاريخ مطلوب للعرض اليومي" },
        { status: 400 },
      );
    }

    const { data: entry, error } = await supabase
      .from("daily_entries")
      .select("entry_date, data")
      .eq("center_id", centerId)
      .eq("clinic_id", clinicId)
      .eq("entry_date", date)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const header = ["التاريخ", ...DAILY_FIELDS.map((f) => f.label)];
    const values = DAILY_FIELDS.map((f) =>
      Number((entry?.data as Record<string, unknown> | undefined)?.[f.key]) || 0,
    );
    const row = [entry?.entry_date ?? date, ...values];
    const csv = toExcelFriendlyCsv([
      header.map(csvEscape).join(","),
      row.map(csvEscape).join(","),
    ]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="daily-report-${date}.csv"`,
      },
    });
  }

  if (!month || !year) {
    return NextResponse.json(
      { error: "الشهر والسنة مطلوبان للعرض الشهري" },
      { status: 400 },
    );
  }

  const { data: report } = await supabase
    .from("monthly_reports")
    .select("id")
    .eq("center_id", centerId)
    .eq("clinic_id", clinicId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const { data: cells, error: cellsError } = report
    ? await supabase
        .from("monthly_report_cells")
        .select("report_date, doctor_name, patient_count, notes")
        .eq("report_id", report.id)
        .order("report_date")
    : { data: [], error: null };

  if (cellsError) {
    return NextResponse.json({ error: cellsError.message }, { status: 500 });
  }

  const header = ["التاريخ", "الطبيب", "العدد", "ملاحظات"];
  const lines = [header.map(csvEscape).join(",")];
  (cells ?? []).forEach((cell) => {
    lines.push(
      [cell.report_date, cell.doctor_name, cell.patient_count, cell.notes]
        .map(csvEscape)
        .join(","),
    );
  });

  const csv = toExcelFriendlyCsv(lines);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monthly-report-${year}-${month}.csv"`,
    },
  });
}
