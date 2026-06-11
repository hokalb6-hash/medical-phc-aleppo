import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildOwnerDailyCsvContent,
  buildOwnerDailyCsvSampleRows,
} from "@/lib/owner-daily-csv";

export async function GET(request: Request) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "center_manager") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const centerId = profile.center_id;

  let clinics: { name: string }[] = [];
  if (centerId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clinics")
      .select("name")
      .eq("center_id", centerId)
      .order("name");
    clinics = data ?? [];
  }

  const csv = buildOwnerDailyCsvContent(
    buildOwnerDailyCsvSampleRows({ clinics, month, year }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="owner-daily-template-${year}-${month}.csv"`,
    },
  });
}
