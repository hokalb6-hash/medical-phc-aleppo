import { createAdminClient } from "@/lib/supabase/admin";

/** عيادات مرتبطة بإدخالات أو تقارير — لا يُسمح لمدير المركز بحذفها */
export async function getClinicsWithProtectedData(clinicIds: string[]) {
  const blocked = new Set<string>();
  if (clinicIds.length === 0) return blocked;

  const admin = createAdminClient();

  const [dailyResult, ownerDailyResult, reportsResult] = await Promise.all([
    admin.from("daily_entries").select("clinic_id").in("clinic_id", clinicIds),
    admin
      .from("owner_daily_clinic_sheet")
      .select("clinic_id")
      .in("clinic_id", clinicIds),
    admin.from("monthly_reports").select("id, clinic_id").in("clinic_id", clinicIds),
  ]);

  for (const row of dailyResult.data ?? []) {
    blocked.add(row.clinic_id);
  }
  for (const row of ownerDailyResult.data ?? []) {
    blocked.add(row.clinic_id);
  }

  const reports = reportsResult.data ?? [];
  if (reports.length > 0) {
    const reportIdToClinic = new Map(reports.map((r) => [r.id, r.clinic_id]));
    const { data: cells } = await admin
      .from("monthly_report_cells")
      .select("report_id")
      .in(
        "report_id",
        reports.map((r) => r.id),
      );

    for (const cell of cells ?? []) {
      const clinicId = reportIdToClinic.get(cell.report_id);
      if (clinicId) blocked.add(clinicId);
    }
  }

  return blocked;
}

export async function clinicHasProtectedData(clinicId: string) {
  const blocked = await getClinicsWithProtectedData([clinicId]);
  return blocked.has(clinicId);
}
