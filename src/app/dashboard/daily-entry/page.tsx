import { SpeechSubmitButton } from "@/components/speech-submit-button";
import { Suspense } from "react";
import { DAILY_FIELDS, MONTHS_AR } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";
import { importDailyEntryCsv, saveDailyEntry } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { getCachedCentersList, getCachedAllClinics } from "@/lib/cached-queries";
import { DailyEntryMonitorSection } from "@/components/daily-entry-monitor-section";
import { DailyEntryMonitorSkeleton } from "@/components/dashboard-skeleton";
import { CsvTemplateDownloadLink } from "@/components/csv-template-download-link";
import { CsvImportSuccessSpeech } from "@/components/csv-import-success-speech";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCenterName(relation: { name: string } | { name: string }[] | null): string {
  if (!relation) return "";
  return Array.isArray(relation) ? (relation[0]?.name ?? "") : relation.name;
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
  const formEntryDate = selectedDate || today;

  const isSuperAdmin = profile.role === "super_admin";

  const centersPromise = isSuperAdmin
    ? getCachedCentersList()
    : Promise.resolve([] as { id: string; name: string }[]);

  const clinicsPromise = isSuperAdmin
    ? getCachedAllClinics()
    : supabase
        .from("clinics")
        .select("id, name, center_id, medical_centers(name)")
        .eq("center_id", profile.center_id)
        .order("name")
        .then(({ data }) => data ?? []);

  const latestEntryPromise =
    !isSuperAdmin && profile.center_id
      ? supabase
          .from("daily_entries")
          .select("clinic_id, data, month, year, created_at")
          .eq("center_id", profile.center_id)
          .eq("entry_date", formEntryDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({
          data: null as {
            clinic_id: string;
            data: Record<string, number>;
            month: number;
            year: number;
            created_at: string;
          } | null,
        });

  const [centers, clinics, latestEntryResult] = await Promise.all([
    centersPromise,
    clinicsPromise,
    latestEntryPromise,
  ]);

  const latestCenterEntryForDate = latestEntryResult.data;

  const defaultClinicId = (clinics ?? [])[0]?.id ?? "";
  const formClinicId = latestCenterEntryForDate?.clinic_id ?? defaultClinicId;
  const existingData = (latestCenterEntryForDate?.data ?? {}) as Record<string, number>;
  const formMonth = latestCenterEntryForDate?.month ?? selectedMonth;
  const formYear = latestCenterEntryForDate?.year ?? selectedYear;

  return (
    <div className="space-y-6">
      {!isSuperAdmin ? <CsvImportSuccessSpeech /> : null}
      <h2 className="text-xl font-bold text-slate-800">نموذج الإدخال اليومي</h2>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-sy-green-200 bg-sy-green-50 px-4 py-3 text-sm text-sy-green-700">
          {success}
        </div>
      ) : null}

      {isSuperAdmin ? (
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
            <SpeechSubmitButton speech="action" className="btn-dark">
              متابعة البيانات
            </SpeechSubmitButton>
          </form>

          <Suspense
            key={`${selectedCenterId}-${selectedDate}-${selectedMonth}-${selectedYear}`}
            fallback={<DailyEntryMonitorSkeleton />}
          >
            <DailyEntryMonitorSection
              selectedCenterId={selectedCenterId}
              selectedDate={selectedDate}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </Suspense>
        </div>
      ) : (
        <>
          <form
            action={importDailyEntryCsv}
            className="surface-card space-y-3 border-sy-green-200 bg-sy-green-50 p-4"
          >
            <h3 className="text-base font-semibold text-sy-green-900">
              استيراد CSV للاستمارة اليومية
            </h3>
            <p className="text-xs leading-relaxed text-sy-green-900">
              حمّل القالب واملأ <strong>صفاً واحداً</strong> لكل يوم بنفس حقول النموذج:{" "}
              <strong>التاريخ</strong> (مثل 2026-06-11 أو 11/06/2026)،{" "}
              <strong>اسم المركز</strong> (اختياري — يُؤخذ من حسابك تلقائياً)،{" "}
              <strong>الشهر</strong> و<strong>السنة</strong>، ثم المؤشرات مثل{" "}
              <strong>السكري</strong> و<strong>الضغط</strong>…
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="file"
                name="csvFile"
                accept=".csv,text/csv"
                required
                className="field-input border-sy-green-300"
              />
              <button type="submit" className="btn-emerald">
                استيراد CSV
              </button>
            </div>
            <CsvTemplateDownloadLink
              href="/dashboard/daily-entry/template"
              managerName={profile.full_name}
              className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sy-green-700 ring-1 ring-sy-green-300"
            >
              تحميل Template CSV
            </CsvTemplateDownloadLink>
          </form>

          <form className="surface-card grid gap-3 border-sy-green-200 bg-sy-green-50 p-4 md:grid-cols-4">
            <input
              name="entryDate"
              type="date"
              defaultValue={formEntryDate}
              className="field-input border-sy-green-300"
            />
            <select
              name="month"
              defaultValue={String(formMonth)}
              className="field-select border-sy-green-300"
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
              className="field-input border-sy-green-300"
            />
            <button type="submit" className="btn-primary">
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
