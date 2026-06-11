import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { buildSuperAdminOwnerDailyWorkbook } from "@/lib/super-admin-owner-daily-workbook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  const centerId = searchParams.get("centerId") ?? undefined;

  if (!year || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "أدخل سنة صحيحة بين 2000 و 2100" }, { status: 400 });
  }
  if (!month || month < 1 || month > 12) {
    return NextResponse.json({ error: "أدخل شهراً صحيحاً بين 1 و 12" }, { status: 400 });
  }

  try {
    const buffer = await buildSuperAdminOwnerDailyWorkbook(year, month, centerId || undefined);
    const scope = centerId ? `center-${centerId.slice(0, 8)}` : "all-centers";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="owner-daily-${scope}-${year}-${month}.xlsx"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطأ غير معروف";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
