import { createAdminClient } from "@/lib/supabase/admin";

export type OwnerDailySheetRow = {
  center_id: string;
  clinic_id: string;
  entry_date: string;
  doctor_name: string | null;
  patient_count: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function ownerDailyMonthRangeISO(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

export async function fetchOwnerDailySheetRows(filters: {
  centerId?: string;
  clinicId?: string;
  year: number;
  month: number;
}): Promise<OwnerDailySheetRow[]> {
  const admin = createAdminClient();
  const { from, to } = ownerDailyMonthRangeISO(filters.year, filters.month);

  let query = admin
    .from("owner_daily_clinic_sheet")
    .select("center_id, clinic_id, entry_date, doctor_name, patient_count")
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date");

  if (filters.centerId) query = query.eq("center_id", filters.centerId);
  if (filters.clinicId) query = query.eq("clinic_id", filters.clinicId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function buildOwnerDailyRowMap(rows: OwnerDailySheetRow[]) {
  return new Map(
    rows.map((row) => [
      `${row.clinic_id}_${row.entry_date}`,
      { doctor: row.doctor_name ?? "", count: row.patient_count },
    ]),
  );
}
