import { ensureMonthlyReport, upsertMonthlyCell } from "@/app/dashboard/actions";
import { MONTHS_AR } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MonthlyTrendChartClient } from "@/components/monthly-trend-chart-client";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const params = await Promise.resolve(searchParams);
  const now = new Date();

  const selectedMonth = Number(asSingle(params.month)) || now.getMonth() + 1;
  const selectedYear = Number(asSingle(params.year)) || now.getFullYear();
  const selectedDate = (asSingle(params.date) ?? "").toString();
  const selectedView = ((asSingle(params.view) ?? "monthly").toString() === "daily"
    ? "daily"
    : "monthly") as "daily" | "monthly";
  const selectedCenterId =
    (asSingle(params.centerId) ?? profile.center_id ?? "").toString();
  const selectedClinicId = (asSingle(params.clinicId) ?? "").toString();

  const centersPromise =
    profile.role === "super_admin"
      ? supabase.from("medical_centers").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] });

  const clinicsPromise =
    profile.role === "super_admin"
      ? selectedCenterId
        ? supabase
            .from("clinics")
            .select("id, name")
            .eq("center_id", selectedCenterId)
            .order("name")
        : supabase.from("clinics").select("id, name").order("name")
      : supabase
          .from("clinics")
          .select("id, name")
          .eq("center_id", profile.center_id)
          .order("name");

  const reportPromise =
    selectedClinicId && (selectedCenterId || profile.center_id)
      ? supabase
          .from("monthly_reports")
          .select("id, center_id, clinic_id, month, year, is_closed")
          .eq("clinic_id", selectedClinicId)
          .eq("center_id", profile.role === "super_admin" ? selectedCenterId : profile.center_id!)
          .eq("month", selectedMonth)
          .eq("year", selectedYear)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null });

  const [{ data: centers }, { data: clinics }, { data: report }] = await Promise.all([
    centersPromise,
    clinicsPromise,
    reportPromise,
  ]);

  const cellsQuery = report
    ? supabase
        .from("monthly_report_cells")
        .select("id, report_date, doctor_name, patient_count, notes")
        .eq("report_id", report.id)
        .order("report_date")
    : Promise.resolve({
        data: [] as {
          id: string;
          report_date: string;
          doctor_name: string | null;
          patient_count: number;
          notes: string | null;
        }[],
      });

  const entriesQuery = selectedClinicId
    ? supabase
        .from("daily_entries")
        .select("entry_date, data")
        .eq("clinic_id", selectedClinicId)
        .eq("month", selectedMonth)
        .eq("year", selectedYear)
    : Promise.resolve({ data: [] as { entry_date: string; data: Record<string, number> }[] });

  const [{ data: cells }, { data: entries }] = await Promise.all([
    cellsQuery,
    entriesQuery,
  ]);

  const trendData = (entries ?? []).map((entry) => {
    const sum = Object.values(entry.data ?? {}).reduce<number>((acc, current) => {
      const value = typeof current === "number" ? current : Number(current) || 0;
      return acc + value;
    }, 0);

    return {
      day: Number(entry.entry_date.slice(-2)),
      value: sum,
    };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">التقرير الشهري</h2>

      <form className="surface-card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
        {profile.role === "super_admin" ? (
          <select name="centerId" defaultValue={selectedCenterId} className="field-select">
            <option value="">كل المراكز</option>
            {(centers ?? []).map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        ) : null}

        <select name="clinicId" defaultValue={selectedClinicId} className="field-select">
          <option value="">اختر العيادة</option>
          {(clinics ?? []).map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
        <select name="view" defaultValue={selectedView} className="field-select">
          <option value="monthly">عرض شهري</option>
          <option value="daily">عرض يومي</option>
        </select>

        <select name="month" defaultValue={String(selectedMonth)} className="field-select">
          {MONTHS_AR.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
        <input name="year" type="number" min={2000} max={2100} defaultValue={selectedYear} className="field-input" />
        <input name="date" type="date" defaultValue={selectedDate} className="field-input" />

        <button type="submit" className="btn-dark">
          تطبيق الفلاتر
        </button>
      </form>

      {selectedClinicId ? (
        <a
          href={`/dashboard/reports/export?view=${selectedView}&centerId=${encodeURIComponent(selectedCenterId)}&clinicId=${encodeURIComponent(selectedClinicId)}&month=${selectedMonth}&year=${selectedYear}&date=${encodeURIComponent(selectedDate)}`}
          className="btn-emerald text-sm"
        >
          تصدير CSV للنتيجة الحالية
        </a>
      ) : null}

      {selectedClinicId ? (
        <form action={ensureMonthlyReport} className="surface-card p-4">
          <h3 className="mb-3 text-base font-semibold text-slate-700">إنشاء/تحديث كيان التقرير الشهري</h3>
          <input type="hidden" name="clinicId" value={selectedClinicId} />
          <input type="hidden" name="month" value={selectedMonth} />
          <input type="hidden" name="year" value={selectedYear} />
          {profile.role === "super_admin" ? (
            <input type="hidden" name="centerId" value={selectedCenterId} />
          ) : null}
          <button type="submit" className="btn-primary">
            تفعيل التقرير الحالي
          </button>
        </form>
      ) : null}

      {selectedView === "monthly" ? <MonthlyTrendChartClient data={trendData} /> : null}

      {selectedView === "daily" ? (
        <div className="table-shell">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2">مجموع مؤشرات اليوم</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? [])
                .filter((e) => !selectedDate || e.entry_date === selectedDate)
                .map((entry) => {
                  const sum = Object.values(entry.data ?? {}).reduce<number>((acc, current) => {
                    const value = typeof current === "number" ? current : Number(current) || 0;
                    return acc + value;
                  }, 0);
                  return (
                    <tr key={entry.entry_date} className="border-t border-slate-100">
                      <td className="px-3 py-2">{entry.entry_date}</td>
                      <td className="px-3 py-2">{sum}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : report ? (
        <div className="space-y-4">
          <form action={upsertMonthlyCell} className="surface-card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="reportId" value={report.id} />
            <input name="reportDate" type="date" required className="field-input" />
            <input name="doctorName" placeholder="اسم الطبيب" className="field-input" />
            <input name="patientCount" type="number" min={0} defaultValue={0} className="field-input" />
            <input name="notes" placeholder="ملاحظات" className="field-input" />
            <button type="submit" className="btn-emerald">
              حفظ يوم في التقرير
            </button>
          </form>

          <div className="table-shell">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2">التاريخ</th>
                  <th className="px-3 py-2">الطبيب</th>
                  <th className="px-3 py-2">العدد</th>
                  <th className="px-3 py-2">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {(cells ?? []).map((cell) => (
                  <tr key={cell.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{cell.report_date}</td>
                    <td className="px-3 py-2">{cell.doctor_name ?? "-"}</td>
                    <td className="px-3 py-2">{cell.patient_count}</td>
                    <td className="px-3 py-2">{cell.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          لم يتم إنشاء تقرير شهري لهذه الفلاتر بعد.
        </p>
      )}
    </div>
  );
}
