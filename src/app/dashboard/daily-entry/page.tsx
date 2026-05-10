import { DAILY_FIELDS, MONTHS_AR } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";
import { importDailyEntryCsv, saveDailyEntry } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import SuperAdminDailyMonitor from "@/components/super-admin-daily-monitor";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DailyEntryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const params = await Promise.resolve(searchParams);
  const error = asSingle(params.error);
  const success = asSingle(params.success);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const selectedCenterId =
    (asSingle(params.centerId) ?? profile.center_id ?? "").toString();
  const selectedDate = (asSingle(params.entryDate) ?? "").toString();
  const selectedMonth = Number(asSingle(params.month)) || now.getMonth() + 1;
  const selectedYear = Number(asSingle(params.year)) || now.getFullYear();

  const { data: centers } =
    profile.role === "super_admin"
      ? await supabase.from("medical_centers").select("id, name").order("name")
      : { data: [] as { id: string; name: string }[] };

  const clinicsQuery =
    profile.role === "super_admin"
      ? supabase
          .from("clinics")
          .select("id, name, center_id, medical_centers(name)")
          .order("name")
      : supabase
          .from("clinics")
          .select("id, name, center_id, medical_centers(name)")
          .eq("center_id", profile.center_id)
          .order("name");

  const { data: clinics } = await clinicsQuery;
  const defaultClinicId = (clinics ?? [])[0]?.id ?? "";
  const formEntryDate = selectedDate || today;
  const { data: latestCenterEntryForDate } =
    profile.role !== "super_admin" && profile.center_id
      ? await supabase
          .from("daily_entries")
          .select("clinic_id, data, month, year, created_at")
          .eq("center_id", profile.center_id)
          .eq("entry_date", formEntryDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : {
          data: null as {
            clinic_id: string;
            data: Record<string, number>;
            month: number;
            year: number;
            created_at: string;
          } | null,
        };
  const formClinicId = latestCenterEntryForDate?.clinic_id ?? defaultClinicId;

  function getCenterName(
    relation: { name: string } | { name: string }[] | null,
  ): string {
    if (!relation) return "";
    return Array.isArray(relation) ? relation[0]?.name ?? "" : relation.name;
  }

  function getRelationName(
    relation: { name: string } | { name: string }[] | null,
  ): string {
    if (!relation) return "-";
    return Array.isArray(relation) ? relation[0]?.name ?? "-" : relation.name;
  }

  const monitoringQuery =
    profile.role === "super_admin"
      ? (() => {
          let query = supabase
            .from("daily_entries")
            .select(
              "id, entry_date, month, year, data, created_at, clinics(name), medical_centers(name)",
            )
            .order("entry_date", { ascending: false })
            .limit(200);

          if (selectedCenterId) query = query.eq("center_id", selectedCenterId);
          if (selectedDate) {
            query = query.eq("entry_date", selectedDate);
          } else {
            query = query.eq("month", selectedMonth).eq("year", selectedYear);
          }
          return query;
        })()
      : Promise.resolve({
          data: [] as {
            id: string;
            entry_date: string;
            month: number;
            year: number;
            data: Record<string, number>;
            created_at: string;
            clinics: { name: string } | { name: string }[] | null;
            medical_centers: { name: string } | { name: string }[] | null;
          }[],
        });

  const { data: monitoredEntries } = await monitoringQuery;
  const monitorRows = (monitoredEntries ?? []).map((entry) => ({
    id: entry.id,
    entry_date: entry.entry_date,
    month: entry.month,
    year: entry.year,
    data: (entry.data ?? {}) as Record<string, number>,
    created_at: entry.created_at,
    clinic_name: getRelationName(entry.clinics),
    center_name: getRelationName(entry.medical_centers),
  }));
  const existingData = (latestCenterEntryForDate?.data ?? {}) as Record<
    string,
    number
  >;
  const formMonth = latestCenterEntryForDate?.month ?? selectedMonth;
  const formYear = latestCenterEntryForDate?.year ?? selectedYear;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">نموذج الإدخال اليومي</h2>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {profile.role === "super_admin" ? (
        <div className="space-y-4">
          <form className="surface-card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
            <select name="centerId" defaultValue={selectedCenterId} className="field-select">
              <option value="">كل المراكز</option>
              {(centers ?? []).map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
            <input name="entryDate" type="date" defaultValue={selectedDate} className="field-input" />
            <select name="month" defaultValue={String(selectedMonth)} className="field-select">
              {MONTHS_AR.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <input name="year" type="number" min={2000} max={2100} defaultValue={selectedYear} className="field-input" />
            <button type="submit" className="btn-dark">
              متابعة البيانات
            </button>
          </form>

          <SuperAdminDailyMonitor entries={monitorRows} />
        </div>
      ) : (
        <>
          <form
            action={importDailyEntryCsv}
            className="surface-card space-y-3 border-emerald-200 bg-emerald-50 p-4"
          >
            <h3 className="text-base font-semibold text-emerald-900">
              استيراد CSV للاستمارة اليومية
            </h3>
            <p className="text-xs text-emerald-900">
              الأعمدة المطلوبة: <code>entry_date</code> و{" "}
              <code>clinic_id</code> أو <code>clinic_name</code>. الأعمدة الاختيارية:{" "}
              <code>month</code> و <code>year</code> وباقي الحقول حسب المفاتيح
              البرمجية مثل <code>chronic_diabetes</code>.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="file"
                name="csvFile"
                accept=".csv,text/csv"
                required
                className="field-input border-emerald-300"
              />
              <button
                type="submit"
                className="btn-emerald"
              >
                استيراد CSV
              </button>
            </div>
            <a
              href="/dashboard/daily-entry/template"
              className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-300"
            >
              تحميل Template CSV
            </a>
          </form>

          <form className="surface-card grid gap-3 border-blue-200 bg-blue-50 p-4 md:grid-cols-4">
            <input
              name="entryDate"
              type="date"
              defaultValue={formEntryDate}
              className="field-input border-blue-300"
            />
            <select
              name="month"
              defaultValue={String(formMonth)}
              className="field-select border-blue-300"
            >
              {MONTHS_AR.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <input
              name="year"
              type="number"
              min={2000}
              max={2100}
              defaultValue={formYear}
              className="field-input border-blue-300"
            />
            <button
              type="submit"
              className="btn-primary"
            >
              تحديث
            </button>
          </form>

          <form action={saveDailyEntry} className="surface-card space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                المركز: {getCenterName((clinics ?? [])[0]?.medical_centers ?? null) || "-"}
              </div>
              <input type="hidden" name="clinicId" value={formClinicId} />

              <input name="entryDate" type="date" defaultValue={formEntryDate} required className="field-input" />
              <select name="month" defaultValue={String(formMonth)} className="field-select">
                {MONTHS_AR.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <input
                name="year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={formYear}
                className="field-input"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {DAILY_FIELDS.map((field) => (
                <label key={field.key} className="rounded-xl border border-slate-200 p-3">
                  <span className="mb-2 block text-sm font-medium text-slate-700">{field.label}</span>
                  <input
                    type="number"
                    min={0}
                    name={`field_${field.key}`}
                    defaultValue={Number(existingData[field.key]) || 0}
                    className="field-input"
                  />
                </label>
              ))}
            </div>

            <button type="submit" className="btn-primary">
              حفظ البيانات اليومية
            </button>
            {!formClinicId ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                لا يمكن الحفظ قبل إنشاء عيادة واحدة على الأقل داخل المركز.
              </p>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
