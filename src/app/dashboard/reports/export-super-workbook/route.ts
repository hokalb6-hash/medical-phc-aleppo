import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { buildSuperAdminMonthlyWorkbook } from "@/lib/super-admin-monthly-workbook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!year || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "أدخل سنة صحيحة بين 2000 و 2100" }, { status: 400 });
  }

  try {
    const buffer = await buildSuperAdminMonthlyWorkbook(year);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="all-centers-monthly-${year}.xlsx"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطأ غير معروف";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
