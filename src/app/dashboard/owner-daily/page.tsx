import { ExcelDownloadLink } from "@/components/excel-download-link";
import { CsvImportSuccessSpeech } from "@/components/csv-import-success-speech";
import { CsvTemplateDownloadLink } from "@/components/csv-template-download-link";
import { SpeechSubmitButton } from "@/components/speech-submit-button";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { importOwnerDailyCsv, saveOwnerDailyClinicSheet } from "@/app/dashboard/actions";
import { getCachedCentersList } from "@/lib/cached-queries";
import { MONTHS_AR } from "@/lib/constants";
import {
  buildOwnerDailyRowMap,
  fetchOwnerDailySheetRows,
} from "@/lib/owner-daily-data";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(year: number, month: number, day: number) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default async function OwnerDailyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const admin = createAdminClient();
  const params = await Promise.resolve(searchParams);
  const now = new Date();
  const error = asSingle(params.error);
  const success = asSingle(params.success);

  const month = Number(asSingle(params.month)) || now.getMonth() + 1;
  const year = Number(asSingle(params.year)) || now.getFullYear();
  const selectedCenterId =
    (asSingle(params.centerId) ?? profile.center_id ?? "").toString();
  const centers =
    profile.role === "super_admin" ? await getCachedCentersList() : [];

  const centerId = profile.role === "super_admin" ? selectedCenterId : profile.center_id ?? "";

  const { data: clinics } = centerId
    ? await admin.from("clinics").select("id, name").eq("center_id", centerId).order("name")
    : { data: [] as { id: string; name: string }[] };

  const daysInMonth = new Date(year, month, 0).getDate();
  const templateHref = `/dashboard/owner-daily/template?month=${month}&year=${year}`;

  let existingRows: Awaited<ReturnType<typeof fetchOwnerDailySheetRows>> = [];
  let fetchError: string | null = null;

  if (centerId && (clinics?.length ?? 0) > 0) {
    try {
      existingRows = await fetchOwnerDailySheetRows({
        centerId,
        year,
        month,
      });
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "تعذر تحميل بيانات الاستمارة.";
    }
  }

  const rowMap = buildOwnerDailyRowMap(existingRows);
  const savedRowCount = existingRows.filter(
    (r) => (r.doctor_name?.trim() ?? "") !== "" || (Number(r.patient_count) || 0) > 0,
  ).length;

  const exportAllHref = `/dashboard/reports/export-owner-daily-workbook?year=${year}&month=${month}`;
  const exportCenterHref = centerId
    ? `/dashboard/reports/export-owner-daily-workbook?year=${year}&month=${month}&centerId=${encodeURIComponent(centerId)}`
    : "";

  return (
    <div className="space-y-4">
      {profile.role === "center_manager" ? <CsvImportSuccessSpeech /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">استمارة أصحاب المراكز — اليومية</h2>
          <p className="mt-1 text-sm text-slate-600">
            {profile.role === "super_admin"
              ? "متابعة الاستمارات المحفوظة لجميع المراكز أو مركز محدد."
              : "إدخال الطبيب وعدد المرضى يومياً لكل عيادة في المركز."}
          </p>
        </div>
        {profile.role === "super_admin" ? (
          <div className="flex flex-wrap gap-2">
            <ExcelDownloadLink href={exportAllHref} className="btn-primary text-sm font-medium">
              تنزيل Excel — جميع المراكز
            </ExcelDownloadLink>
            {exportCenterHref ? (
              <ExcelDownloadLink href={exportCenterHref} className="btn-emerald text-sm font-medium">
                تنزيل Excel — المركز المحدد
              </ExcelDownloadLink>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-sy-green-50 p-3 text-sm text-sy-green-700">{success}</p>
      ) : null}
      {fetchError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {fetchError}
          <span className="mt-1 block text-xs text-red-700/90">
            تأكد من تنفيذ ملفات SQL الخاصة بجدول owner_daily_clinic_sheet في Supabase.
          </span>
        </p>
      ) : null}

      <form className="surface-card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
        {profile.role === "super_admin" ? (
          <select name="centerId" defaultValue={selectedCenterId} className="field-select" required>
            <option value="">اختر المركز</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        ) : null}
        <select name="month" defaultValue={String(month)} className="field-select">
          {MONTHS_AR.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="year"
          min={2000}
          max={2100}
          defaultValue={year}
          className="field-input"
        />
        <SpeechSubmitButton speech="action" className="btn-dark">
          عرض الجدول
        </SpeechSubmitButton>
      </form>

      {profile.role === "center_manager" ? (
        <form
          action={importOwnerDailyCsv}
          className="surface-card space-y-3 border-sy-green-200 bg-sy-green-50 p-4"
        >
          <h3 className="text-base font-semibold text-sy-green-900">استيراد CSV للاستمارة اليومية</h3>
          <p className="text-xs leading-relaxed text-sy-green-900">
            حمّل القالب واملأ صفاً لكل <strong>يوم وعيادة</strong>: التاريخ، اسم العيادة، الطبيب،
            عدد المرضى، الشهر، السنة. بعد الاستيراد تظهر كل العيادات في الجدول أدناه.
          </p>
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
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
            href={templateHref}
            managerName={profile.full_name}
            className="inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sy-green-700 ring-1 ring-sy-green-300"
          >
            تحميل Template CSV
          </CsvTemplateDownloadLink>
        </form>
      ) : null}

      {centerId && (clinics?.length ?? 0) > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-800">
              {MONTHS_AR[month - 1]} {year}
            </span>
            <span className="rounded-full bg-sy-green-50 px-3 py-1 font-medium text-sy-green-900">
              {savedRowCount} سجل محفوظ
            </span>
          </div>

          {profile.role === "super_admin" ? (
            <div className="space-y-3">
              <div className="table-shell">
                <table className="min-w-[900px] text-right text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 px-2 py-2">التاريخ</th>
                      {(clinics ?? []).map((clinic) => (
                        <th key={clinic.id} className="border border-slate-200 px-2 py-2">
                          {clinic.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const date = formatDate(year, month, day);
                      return (
                        <tr key={date}>
                          <td className="border border-slate-200 px-2 py-2 font-semibold">
                            {day}/{month}/{year}
                          </td>
                          {(clinics ?? []).map((clinic) => {
                            const saved = rowMap.get(`${clinic.id}_${date}`);
                            return (
                              <td key={`${clinic.id}_${date}`} className="border border-slate-200 p-2">
                                <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                  الطبيب: {saved?.doctor || "—"}
                                </div>
                                <div className="mt-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800">
                                  العدد: {saved?.count ?? 0}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="rounded-lg bg-sy-green-50 p-3 text-sm text-sy-green-800">
                وضع السوبر آدمن: متابعة فقط. التعديل يتم من حساب مدير المركز. استخدم «تنزيل Excel — جميع
                المراكز» للحصول على ملف واحد يضم كل المراكز.
              </p>
            </div>
          ) : (
            <form action={saveOwnerDailyClinicSheet} className="space-y-3">
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="year" value={year} />
              <div className="table-shell">
                <table className="min-w-[900px] text-right text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 px-2 py-2">التاريخ</th>
                      {(clinics ?? []).map((clinic) => (
                        <th key={clinic.id} className="border border-slate-200 px-2 py-2">
                          <div>{clinic.name}</div>
                          <div className="mt-1 text-xs font-normal text-slate-500">طبيب / عدد</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const date = formatDate(year, month, day);
                      return (
                        <tr key={date}>
                          <td className="border border-slate-200 px-2 py-2 font-semibold">
                            {day}/{month}/{year}
                          </td>
                          {(clinics ?? []).map((clinic) => {
                            const saved = rowMap.get(`${clinic.id}_${date}`);
                            return (
                              <td key={`${clinic.id}_${date}`} className="border border-slate-200 p-2">
                                <input
                                  name={`od_${clinic.id}_${date}_doctor`}
                                  defaultValue={saved?.doctor ?? ""}
                                  placeholder="الطبيب"
                                  className="mb-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  name={`od_${clinic.id}_${date}_count`}
                                  defaultValue={saved?.count ?? 0}
                                  placeholder="العدد"
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button type="submit" className="btn-primary">
                حفظ الاستمارة اليومية
              </button>
            </form>
          )}
        </>
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          {profile.role === "center_manager"
            ? "لا توجد عيادات في المركز. أنشئ عيادة واحدة على الأقل أولاً."
            : "اختر مركزاً من القائمة ثم اضغط «عرض الجدول»."}
        </p>
      )}
    </div>
  );
}
