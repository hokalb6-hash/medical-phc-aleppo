import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildDailyEntryCsvContent,
  buildDailyEntryCsvSampleRows,
} from "@/lib/daily-entry-csv";

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const supabase = await createClient();
  const centerId = profile.center_id;

  let centerName = "";
  if (centerId) {
    const { data } = await supabase
      .from("medical_centers")
      .select("name")
      .eq("id", centerId)
      .maybeSingle();
    centerName = data?.name ?? "";
  }

  const csv = buildDailyEntryCsvContent(
    buildDailyEntryCsvSampleRows({ centerName }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="daily-entry-template.csv"',
    },
  });
}
