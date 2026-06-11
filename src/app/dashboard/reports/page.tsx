import { Suspense } from "react";
import Link from "next/link";
import {
  ensureMonthlyReport,
  generateMonthlyCellsFromDailyEntries,
  insertMonthlyReportCell,
} from "@/app/dashboard/actions";
import {
  ClinicReportsSourceTabs,
  type ClinicReportSource,
} from "@/components/clinic-reports-source-tabs";
import { ExcelDownloadLink } from "@/components/excel-download-link";
import { ReportsSection } from "@/components/reports-section";
import { ReportsFilterForm } from "@/components/reports-filter-form";
import { ReportsPageChartsSlot } from "@/components/reports-page-charts-slot";
import { SuperAdminChartsLoader } from "@/components/super-admin-charts-loader";
import { DAILY_FIELDS, MONTHS_AR } from "@/lib/constants";
import {
  aggregateDailyEntriesByMonthForCenter,
  type OwnerMonthlyAggregatedRow,
} from "@/lib/owner-monthly-from-daily";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getCachedCentersList,
  getCachedAllClinics,
  getCachedClinicsByCenterSimple,
} from "@/lib/cached-queries";
import { fetchOwnerDailySheetRows } from "@/lib/owner-daily-data";
import {
  normalizeReportsFilterParams,
  monthDateBoundsISO,
  filterDescriptionForSource,
} from "@/lib/reports-filter-params";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseClinicReportSource(raw: string | undefined): ClinicReportSource {
  if (raw === "owner_daily_form" || raw === "owner_monthly_form") return raw;
  return "daily_entry";
}

function sumMonthlyMetrics(m: Record<string, number> | undefined) {
  if (!m) return 0;
  return Object.values(m).reduce((a, v) => a + (Number(v) || 0), 0);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const isClinicHub = profile.role === "center_manager";
  const supabase = await createClient();
  const params = await Promise.resolve(searchParams);
  const now = new Date();
  const reportSource = isClinicHub ? parseClinicReportSource(asSingle(params.source)) : "daily_entry";

  const normalizedFilter = normalizeReportsFilterParams({
    month: Number(asSingle(params.month)) || now.getMonth() + 1,
    year: Number(asSingle(params.year)) || now.getFullYear(),
    date: (asSingle(params.date) ?? "").toString(),
    view: (asSingle(params.view) ?? "monthly").toString() === "daily" ? "daily" : "monthly",
    source: reportSource,
  });
  const selectedMonth = normalizedFilter.month;
  const selectedYear = normalizedFilter.year;
  const selectedDate = normalizedFilter.date;
  const selectedView = normalizedFilter.view;
  const flashError = asSingle(params.error);
  const flashSuccess = asSingle(params.success);
  const flashInfo = asSingle(params.info);
  const selectedCenterId =
    (asSingle(params.centerId) ?? profile.center_id ?? "").toString();
  const clinicIdParam = (asSingle(params.clinicId) ?? "").toString();

  const centersPromise =
    profile.role === "super_admin"
      ? getCachedCentersList()
      : Promise.resolve([] as { id: string; name: string }[]);

  const clinicsPromise =
    profile.role === "super_admin"
      ? getCachedAllClinics().then((rows) =>
          rows.map(({ id, name, center_id }) => ({ id, name, center_id })),
        )
      : profile.center_id
        ? getCachedClinicsByCenterSimple(profile.center_id)
        : Promise.resolve([] as { id: string; name: string; center_id: string }[]);

  const centerMetaPromise =
    profile.role === "center_manager" && profile.center_id
      ? supabase.from("medical_centers").select("name").eq("id", profile.center_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null });

  const [centers, clinics, { data: centerMeta }] = await Promise.all([
    centersPromise,
    clinicsPromise,
    centerMetaPromise,
  ]);

  const selectedClinicId =
    profile.role === "center_manager"
      ? clinicIdParam || (clinics?.[0]?.id ?? "")
      : clinicIdParam;

  const resolvedCenterId =
    profile.role === "super_admin"
      ? (selectedCenterId ||
          ((clinics ?? []).find((c) => c.id === selectedClinicId)?.center_id ?? ""))
      : (profile.center_id ?? "");

  const canEditMonthlyReport = profile.role !== "center_user";

  const hasCenterScope =
    profile.role === "super_admin" ? Boolean(resolvedCenterId) : Boolean(profile.center_id);

  const isDailyEntryMode = !isClinicHub || reportSource === "daily_entry";

  const { from: monthFromISO, to: monthToISO } = monthDateBoundsISO(selectedYear, selectedMonth);

  let ownerDailySheetRows: {
    entry_date: string;
    doctor_name: string | null;
    patient_count: number;
  }[] = [];

  let ownerMonthlyAggregated: Map<number, OwnerMonthlyAggregatedRow> | null = null;

  if (reportSource === "owner_daily_form" && selectedClinicId && resolvedCenterId) {
    try {
      const rows = await fetchOwnerDailySheetRows({
        centerId: resolvedCenterId,
        clinicId: selectedClinicId,
        year: selectedYear,
        month: selectedMonth,
      });
      ownerDailySheetRows = rows.map((r) => ({
        entry_date: r.entry_date,
        doctor_name: r.doctor_name,
        patient_count: r.patient_count,
      }));
      if (selectedView === "daily" && selectedDate) {
        ownerDailySheetRows = ownerDailySheetRows.filter((r) => r.entry_date === selectedDate);
      }
    } catch {
      ownerDailySheetRows = [];
    }
  }

  if (isClinicHub && profile.center_id) {
    if (reportSource === "owner_monthly_form") {
      const { data: centerYearRows } = await supabase
        .from("daily_entries")
        .select("month, data")
        .eq("center_id", profile.center_id)
        .eq("year", selectedYear);
      ownerMonthlyAggregated = aggregateDailyEntriesByMonthForCenter(centerYearRows ?? []);
    }
  }

  const reportPromise =
    isDailyEntryMode && selectedClinicId && hasCenterScope
      ? supabase
          .from("monthly_reports")
          .select("id, center_id, clinic_id, month, year, is_closed")
          .eq("clinic_id", selectedClinicId)
          .eq("center_id", profile.role === "super_admin" ? resolvedCenterId : profile.center_id!)
          .eq("month", selectedMonth)
          .eq("year", selectedYear)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: string } | null });

  const { data: report } = await reportPromise;

  const cellsQuery = isDailyEntryMode && report
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

  const entriesQuery =
    isDailyEntryMode && selectedClinicId && resolvedCenterId
      ? supabase
          .from("daily_entries")
          .select("entry_date, data")
          .eq("center_id", resolvedCenterId)
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

  const cellBars = [...(cells ?? [])]
    .map((c) => ({
      day: Number(c.report_date.slice(-2)),
      date: c.report_date,
      patients: c.patient_count,
    }))
    .sort((a, b) => a.day - b.day);

  const doctorMap = new Map<string, number>();
  for (const c of cells ?? []) {
    const name = c.doctor_name?.trim() || "غير محدد";
    doctorMap.set(name, (doctorMap.get(name) ?? 0) + c.patient_count);
  }
  const doctorSlices = [...doctorMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const monthTitle = `${MONTHS_AR[selectedMonth - 1]} ${selectedYear}`;

  const monthlyExportHref = `/dashboard/reports/export?view=monthly&centerId=${encodeURIComponent(resolvedCenterId)}&clinicId=${encodeURIComponent(selectedClinicId)}&month=${selectedMonth}&year=${selectedYear}`;
  const dailyExportHref = selectedDate
    ? `/dashboard/reports/export?view=daily&centerId=${encodeURIComponent(resolvedCenterId)}&clinicId=${encodeURIComponent(selectedClinicId)}&month=${selectedMonth}&year=${selectedYear}&date=${encodeURIComponent(selectedDate)}`
    : "";

  const pageTitle =
    profile.role === "center_manager"
      ? "تقارير عيادات المركز"
      : "التقرير الشهري";

  const selectedClinicName =
    (clinics ?? []).find((c) => c.id === selectedClinicId)?.name?.trim() ?? "";
  const kpiDailyMonthTotal = isDailyEntryMode ? trendData.reduce((acc, d) => acc + d.value, 0) : 0;
  const kpiReportDaysCount = isDailyEntryMode ? cells?.length ?? 0 : 0;

  const kpiOwnerDailyPatients = ownerDailySheetRows.reduce(
    (a, r) => a + (Number(r.patient_count) || 0),
    0,
  );
  const kpiOwnerDailyRowCount = ownerDailySheetRows.length;

  const ownerMonthlyYearTotal =
    ownerMonthlyAggregated != null
      ? [...ownerMonthlyAggregated.values()].reduce(
          (acc, row) => acc + sumMonthlyMetrics(row.metrics),
          0,
        )
      : 0;
  const ownerMonthlySelectedMonthTotal =
    ownerMonthlyAggregated != null
      ? sumMonthlyMetrics(ownerMonthlyAggregated.get(selectedMonth)?.metrics)
      : 0;

  const showClinicHeroKpis =
    isClinicHub && (reportSource === "owner_monthly_form" || Boolean(selectedClinicId));

  function clinicReportsTabHref(source: ClinicReportSource) {
    const q = new URLSearchParams();
    q.set("source", source);
    q.set("month", String(selectedMonth));
    q.set("year", String(selectedYear));
    if (selectedClinicId) q.set("clinicId", selectedClinicId);

    if (source === "owner_monthly_form") {
      q.set("view", "monthly");
      return `/dashboard/reports?${q.toString()}`;
    }

    if (source === "owner_daily_form") {
      q.set("view", "monthly");
      return `/dashboard/reports?${q.toString()}`;
    }

    q.set("view", selectedView);
    if (selectedView === "daily" && selectedDate) q.set("date", selectedDate);
    return `/dashboard/reports?${q.toString()}`;
  }

  const clinicSourceTabs = [
    {
      id: "daily_entry" as const,
      label: "الإدخال اليومي والتقرير الرسمي",
      description:
        "مؤشرات الإدخال اليومي للعيادة، والتقرير الشهري الرسمي، المخططات، والتصدير إلى CSV.",
      href: clinicReportsTabHref("daily_entry"),
    },
    {
      id: "owner_daily_form" as const,
      label: "الاستمارة اليومية",
      description: "سجل استمارة أصحاب المراكز اليومية (الطبيب والعدد) كما يُحفظ في قاعدة البيانات.",
      href: clinicReportsTabHref("owner_daily_form"),
    },
    {
      id: "owner_monthly_form" as const,
      label: "الاستمارة الشهرية (المركز)",
      description:
        "تجميع من الإدخال اليومي لجميع عيادات المركز حسب شهر السنة — نفس منطق صفحة الاستمارة الشهرية.",
      href: clinicReportsTabHref("owner_monthly_form"),
    },
  ];
  const chartsContextSubtitle = selectedClinicName
    ? `${selectedClinicName} · ${monthTitle}`
    : monthTitle;

  return (
    <div className={isClinicHub ? "space-y-8 pb-2" : "space-y-6"}>
      {flashError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {flashError}
        </div>
      ) : null}
      {flashSuccess ? (
        <div className="rounded-xl border border-sy-green-200 bg-sy-green-50 px-4 py-3 text-sm text-sy-green-800">
          {flashSuccess}
        </div>
      ) : null}
      {flashInfo ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {flashInfo}
        </div>
      ) : null}

      {isClinicHub ? <ClinicReportsSourceTabs active={reportSource} tabs={clinicSourceTabs} /> : null}

      {isClinicHub ? (
        <header className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-bl from-white via-slate-50/90 to-sy-green-50/50 px-5 py-6 shadow-sm md:px-8 md:py-8">
          <div
            className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-sy-green-600/[0.06]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sy-green-700/90">
                لوحة التقارير
              </p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                تقارير عيادات المركز
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-[15px]">
                {reportSource === "daily_entry" ? (
                  <>
                    عرض تحليلي للإدخال اليومي والتقرير الشهري الرسمي، مع تصدير CSV يفتح في Excel. فعّل التقرير
                    الشهري للعيادة ثم أضف الأيام أو ولّدها من الإدخال اليومي — كل تاريخ يُسجّل مرة واحدة فقط.
                  </>
                ) : reportSource === "owner_daily_form" ? (
                  <>
                    عرض بيانات <strong className="font-semibold text-slate-800">الاستمارة اليومية</strong> المحفوظة
                    للعيادة والشهر المحددين (طبيب وعدد مرضى). التعديل يتم من صفحة الاستمارة اليومية لأصحاب المراكز.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-slate-800">الاستمارة الشهرية للمركز</strong> تُحسب هنا من
                    سجلات الإدخال اليومي لجميع العيادات التابعة للمركز وللسنة المعروضة — للعرض والمراجعة فقط.
                  </>
                )}
              </p>
            </div>
            {centerMeta?.name ? (
              <div className="shrink-0 rounded-xl border border-sy-green-100/90 bg-white/95 px-5 py-3 text-right shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-medium text-slate-500">اسم المركز</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{centerMeta.name}</p>
              </div>
            ) : null}
          </div>
          {showClinicHeroKpis ? (
            <dl className="relative mt-6 grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-6 sm:grid-cols-3">
              {reportSource === "daily_entry" ? (
                <>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">العيادة المعروضة</dt>
                    <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {selectedClinicName || "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">مجموع مؤشرات الشهر (يومي)</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-sy-green-800">{kpiDailyMonthTotal}</dd>
                  </div>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">أيام مسجّلة في التقرير الرسمي</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-sy-green-800">{kpiReportDaysCount}</dd>
                  </div>
                </>
              ) : reportSource === "owner_daily_form" ? (
                <>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">العيادة</dt>
                    <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {selectedClinicName || "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">إجمالي العدد (الاستمارة اليومية)</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-sy-green-800">{kpiOwnerDailyPatients}</dd>
                  </div>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">
                      {selectedView === "daily" && selectedDate ? "صفوف اليوم المحدد" : "صفوف محفوظة في الشهر"}
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-sy-green-800">{kpiOwnerDailyRowCount}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">نطاق التجميع</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">جميع عيادات المركز</dd>
                  </div>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">
                      مجموع مؤشرات الشهر المحدد ({MONTHS_AR[selectedMonth - 1]})
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-sy-green-800">
                      {ownerMonthlySelectedMonthTotal}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                    <dt className="text-xs font-medium text-slate-500">مجموع السنة (جميع الشهور)</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-sy-green-800">{ownerMonthlyYearTotal}</dd>
                  </div>
                </>
              )}
            </dl>
          ) : null}
        </header>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-slate-800">{pageTitle}</h2>
          {profile.role === "super_admin" ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              اختر السنة والشهر لعرض المخططات التجميعية لكل المراكز، ونزّل ملف Excel يحتوي ورقة عمل باسم كل مركز مع
              جدول شهري للمؤشرات (ملف xlsx — يدعم عدة أوراق كما في الجداول الوزارية).
            </p>
          ) : null}
        </div>
      )}

      {profile.role === "center_manager" && !(clinics?.length) ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          لا توجد عيادات مسجّلة لهذا المركز بعد. أضف عيادة من صفحة{" "}
          <Link href="/dashboard/clinics" className="font-medium text-amber-950 underline">
            العيادات
          </Link>{" "}
          ثم ارجع لهذا القسم.
        </p>
      ) : null}

      {profile.role === "super_admin" && selectedClinicId && !resolvedCenterId ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          تعذر تحديد مركز هذه العيادة. اختر المركز من القائمة أو أعد تحميل الصفحة بعد التحقق من بيانات العيادات.
        </p>
      ) : null}

      <ReportsSection
        step="1"
        title="الفلاتر والفترة"
        description={
          isClinicHub
            ? filterDescriptionForSource(reportSource)
            : "اختر المركز والعيادة، ثم حدّد الفترة. العرض اليومي يتطلب تاريخاً محدداً للعرض والتصدير."
        }
      >
        <ReportsFilterForm
          role={profile.role}
          centers={centers ?? []}
          clinics={clinics ?? []}
          values={{
            centerId: selectedCenterId,
            clinicId: selectedClinicId,
            view: selectedView,
            month: selectedMonth,
            year: selectedYear,
            date: selectedDate,
            source: reportSource,
          }}
          showSourceField={isClinicHub}
        />
      </ReportsSection>

      {isClinicHub && reportSource === "owner_daily_form" ? (
        <ReportsSection
          step="2"
          title="الاستمارة اليومية — بيانات محفوظة"
          description={
            selectedView === "daily" && selectedDate
              ? `عرض يوم ${selectedDate} — الاستمارة اليومية للعيادة المحددة.`
              : `عرض السجلات الفعلية من جدول الاستمارة اليومية للعيادة والشهر ${MONTHS_AR[selectedMonth - 1]} ${selectedYear} (من ${monthFromISO} إلى ${monthToISO}).`
          }
        >
          {!selectedClinicId ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              اختر عيادةً من الفلاتر أعلاه لعرض بيانات الاستمارة اليومية.
            </p>
          ) : ownerDailySheetRows.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {selectedView === "daily" && selectedDate
                ? `لا توجد صفوف محفوظة في ${selectedDate} لهذه العيادة.`
                : "لا توجد صفوف محفوظة لهذه العيادة في هذا الشهر. يمكن الإدخال من صفحة الاستمارة اليومية لأصحاب المراكز."}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="surface-card flex flex-col gap-2 border border-sy-green-100 bg-gradient-to-br from-sy-green-50/60 to-white p-4 ring-1 ring-sy-green-100/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900">تصدير الاستمارة اليومية</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    ملف CSV للعيادة والشهر المحددين (UTF-8 مع BOM لعرض العربية في Excel).
                  </p>
                </div>
                <a
                  href={`/dashboard/reports/export?exportType=owner_daily_clinic&centerId=${encodeURIComponent(resolvedCenterId)}&clinicId=${encodeURIComponent(selectedClinicId)}&month=${selectedMonth}&year=${selectedYear}`}
                  className="btn-emerald shrink-0 text-sm font-medium"
                >
                  تنزيل الاستمارة اليومية (CSV)
                </a>
              </div>
              <div className="table-shell shadow-sm">
              <table className="min-w-full text-right text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-800">التاريخ</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">الطبيب</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">العدد</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerDailySheetRows.map((row, idx) => (
                    <tr
                      key={`${row.entry_date}_${idx}`}
                      className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-800">{row.entry_date}</td>
                      <td className="px-4 py-2.5">{row.doctor_name?.trim() || "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-900">{row.patient_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
          <p className="text-sm leading-relaxed text-slate-600">
            للتعديل أو الإضافة:{" "}
            <Link href="/dashboard/owner-daily" className="font-medium text-sy-green-800 underline">
              الاستمارة اليومية لأصحاب المراكز
            </Link>
            .
          </p>
        </ReportsSection>
      ) : isClinicHub && reportSource === "owner_monthly_form" ? (
        <ReportsSection
          step="2"
          title="الاستمارة الشهرية — تجميع المركز"
          description={`سنة ${selectedYear} لجميع عيادات المركز. القيم مُشتقة من سجلات الإدخال اليومي (عرض فقط، بدون تعديل من هنا).`}
        >
          {!profile.center_id ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              تعذر تحديد مركز الحساب.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="surface-card flex flex-col gap-2 border border-sy-green-100 bg-gradient-to-br from-sy-green-50/60 to-white p-4 ring-1 ring-sy-green-100/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900">تصدير الاستمارة</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    ملف CSV بنفس أعمدة الجدول أدناه (UTF-8 مع BOM لعرض العربية في Excel).
                  </p>
                </div>
                <a
                  href={`/dashboard/reports/export?exportType=owner_monthly_center&year=${selectedYear}`}
                  className="btn-emerald shrink-0 text-sm font-medium"
                >
                  تنزيل الاستمارة الشهرية (CSV)
                </a>
              </div>
              <div className="table-shell shadow-sm">
                <table className="min-w-[1800px] text-right text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 px-2 py-2">الشهر</th>
                      <th className="border border-slate-200 px-2 py-2">عدد المراجعين</th>
                      {DAILY_FIELDS.map((field) => (
                        <th key={field.key} className="border border-slate-200 px-2 py-2">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS_AR.map((monthName, index) => {
                      const month = index + 1;
                      const row = (ownerMonthlyAggregated ?? new Map()).get(month);
                      const metrics = row?.metrics ?? {};
                      return (
                        <tr key={month}>
                          <td className="border border-slate-200 px-2 py-2 font-semibold">{monthName}</td>
                          <td className="border border-slate-200 px-2 py-2 font-semibold tabular-nums">
                            {row?.reviewers_total ?? 0}
                          </td>
                          {DAILY_FIELDS.map((field) => (
                            <td
                              key={`${month}_${field.key}`}
                              className="border border-slate-200 px-2 py-2 font-semibold tabular-nums text-slate-800"
                            >
                              {Number(metrics[field.key]) || 0}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                نفس منطق صفحة «استمارة أصحاب المراكز — الشهرية»؛ لمراجعة التفاصيل حسب العيادة استخدم تبويب الإدخال
                اليومي أو صفحة الإدخال اليومي.
              </p>
            </div>
          )}
        </ReportsSection>
      ) : (
        <>
      <ReportsSection
        step="2"
        title="التصدير والملفات"
        description={
          profile.role === "super_admin"
            ? "لمشرف النظام: ملف Excel متعدد الأوراق لجميع المراكز، إضافةً إلى تصدير CSV للعيادة المختارة عند الحاجة."
            : "تنزيل التقرير الشهري الرسمي أو بيانات يوم محدد بصيغة CSV (متوافقة مع Excel)."
        }
      >
        <div className="space-y-4">
          {profile.role === "super_admin" ? (
            <div className="surface-card space-y-3 border border-sy-green-200 bg-gradient-to-br from-sy-green-50/90 to-slate-50 p-4 md:p-5">
              <h4 className="text-sm font-semibold text-slate-900">تقرير المشرف العام — جميع المراكز</h4>
              <p className="text-sm leading-relaxed text-slate-700">
                ملف{" "}
                <strong className="font-semibold text-slate-900">Excel (.xlsx)</strong> يحتوي ورقة عمل باسم كل
                مركز مع أشهر السنة والمجموع ومؤشرات الإدخال اليومي المجمّعة.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ExcelDownloadLink
                  href={`/dashboard/reports/export-super-workbook?year=${selectedYear}`}
                  className="btn-primary text-sm font-medium"
                >
                  تنزيل Excel — ورقة لكل مركز ({selectedYear})
                </ExcelDownloadLink>
                <span className="text-xs text-slate-600">حسب السنة في الفلاتر.</span>
              </div>
            </div>
          ) : null}

          {selectedClinicId && resolvedCenterId ? (
            profile.role === "center_manager" ? (
              <div className="surface-card space-y-3 border border-sy-green-100 bg-gradient-to-br from-sy-green-50/50 to-white p-4 md:p-5 ring-1 ring-sy-green-100/80">
                <h4 className="text-sm font-semibold text-slate-900">تصدير عيادة محددة</h4>
                <p className="text-sm leading-relaxed text-slate-600">
                  UTF-8 مع ترتيب مناسب للعربية في Excel. التقرير الشهري: صفوف التقرير الرسمي. التصدير اليومي:
                  بعد اختيار تاريخ في الفلاتر.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={monthlyExportHref} className="btn-emerald text-sm font-medium">
                    تنزيل التقرير الشهري (CSV)
                  </a>
                  {selectedDate ? (
                    <a href={dailyExportHref} className="btn-dark text-sm font-medium">
                      تنزيل يوم محدد (CSV)
                    </a>
                  ) : (
                    <span
                      className="inline-flex cursor-not-allowed items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400"
                      title="اختر تاريخاً من الفلاتر لتفعيل التصدير اليومي"
                    >
                      تنزيل يوم (اختر التاريخ أولاً)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <a
                href={`/dashboard/reports/export?view=${selectedView}&centerId=${encodeURIComponent(resolvedCenterId)}&clinicId=${encodeURIComponent(selectedClinicId)}&month=${selectedMonth}&year=${selectedYear}&date=${encodeURIComponent(selectedDate)}`}
                className="btn-emerald inline-flex text-sm font-medium"
              >
                تصدير CSV للنتيجة الحالية
              </a>
            )
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              اختر عيادةً (ومركزاً عند الحاجة) لتفعيل روابط التصدير التفصيلي.
            </p>
          )}
        </div>
      </ReportsSection>

      {selectedClinicId && canEditMonthlyReport && resolvedCenterId ? (
        <ReportsSection
          step="3"
          title="تهيئة التقرير الشهري الرسمي"
          description="يُنشئ سجل الشهر للعيادة المختارة حتى يمكن إضافة أيام التقرير أو توليدها من الإدخال اليومي. كل تاريخ يُسجّل مرة واحدة فقط."
        >
          <form action={ensureMonthlyReport} className="surface-card max-w-xl space-y-3 p-4 md:p-5">
            <input type="hidden" name="clinicId" value={selectedClinicId} />
            <input type="hidden" name="month" value={selectedMonth} />
            <input type="hidden" name="year" value={selectedYear} />
            {profile.role === "super_admin" ? (
              <input type="hidden" name="centerId" value={resolvedCenterId} />
            ) : null}
            <button type="submit" className="btn-primary">
              تفعيل التقرير لهذا الشهر
            </button>
          </form>
        </ReportsSection>
      ) : null}

      {selectedView === "monthly" ? (
        <ReportsSection
          step="4"
          title="المخططات التحليلية"
          description={
            selectedClinicId || profile.role === "super_admin"
              ? "مقارنة المؤشرات اليومية مع صفوف التقرير الرسمي وتوزيع الحالات حسب الطبيب عند توفر بيانات."
              : "اختر عيادةً لعرض مخططات العيادة."
          }
        >
          {profile.role === "super_admin" && selectedView === "monthly" ? (
            <Suspense
              key={`super-charts-${selectedYear}-${selectedMonth}`}
              fallback={
                <div className="surface-card flex min-h-[200px] animate-pulse items-center justify-center p-6 text-sm text-slate-500">
                  جاري تحميل مخططات المشرف العام...
                </div>
              }
            >
              <SuperAdminChartsLoader year={selectedYear} month={selectedMonth} />
            </Suspense>
          ) : null}
          <ReportsPageChartsSlot
            showSuper={false}
            superCharts={null}
            showClinic={selectedView === "monthly" && Boolean(selectedClinicId)}
            clinicCharts={
              selectedView === "monthly" && selectedClinicId
                ? { trendData, cellBars, doctorSlices, monthTitle, contextSubtitle: chartsContextSubtitle }
                : null
            }
          />
        </ReportsSection>
      ) : null}

      <ReportsSection
        step={selectedView === "monthly" ? "5" : "4"}
        title={selectedView === "daily" ? "جدول الإدخال اليومي" : "التقرير الشهري الرسمي — البيانات والإدخال"}
        description={
          selectedView === "daily"
            ? "ملخص مجموع المؤشرات لكل يوم في الشهر (مع إمكانية تقييد يوم واحد من الفلاتر)."
            : report
              ? "توليد من الإدخال اليومي أو إضافة يوم يدوياً، ثم مراجعة الجدول."
              : "فعّل التقرير أولاً من القسم السابق لعرض الجدول."
        }
      >
        {selectedView === "daily" ? (
          <div className="table-shell shadow-sm">
            <table className="min-w-full text-right text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-800">التاريخ</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">مجموع مؤشرات اليوم</th>
                </tr>
              </thead>
              <tbody>
                {(entries ?? []).filter((e) => !selectedDate || e.entry_date === selectedDate).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-500">
                      لا توجد سجلات إدخال يومي لهذا الشهر{selectedDate ? " للتاريخ المحدد" : ""}.
                    </td>
                  </tr>
                ) : (
                  (entries ?? [])
                    .filter((e) => !selectedDate || e.entry_date === selectedDate)
                    .map((entry) => {
                      const sum = Object.values(entry.data ?? {}).reduce<number>((acc, current) => {
                        const value = typeof current === "number" ? current : Number(current) || 0;
                        return acc + value;
                      }, 0);
                      return (
                        <tr
                          key={entry.entry_date}
                          className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60"
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-800">{entry.entry_date}</td>
                          <td className="px-4 py-2.5 tabular-nums text-slate-900">{sum}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        ) : report ? (
          <div className="space-y-4">
            {canEditMonthlyReport ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <form
                  action={generateMonthlyCellsFromDailyEntries}
                  className="surface-card space-y-3 border border-slate-100 p-4 md:p-5 ring-1 ring-slate-50"
                >
                  <h4 className="text-sm font-semibold text-slate-900">توليد تلقائي</h4>
                  <p className="text-sm leading-relaxed text-slate-600">
                    إضافة صف لكل يوم فيه إدخال يومي معبأ ولم يُسجّل بعد في التقرير (بدون تكرار لنفس
                    التاريخ).
                  </p>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="centerId" value={resolvedCenterId} />
                  <input type="hidden" name="clinicId" value={selectedClinicId} />
                  <input type="hidden" name="month" value={selectedMonth} />
                  <input type="hidden" name="year" value={selectedYear} />
                  <input type="hidden" name="ctxMonth" value={selectedMonth} />
                  <input type="hidden" name="ctxYear" value={selectedYear} />
                  <input type="hidden" name="ctxClinicId" value={selectedClinicId} />
                  <input type="hidden" name="ctxCenterId" value={resolvedCenterId} />
                  <input type="hidden" name="ctxView" value={selectedView} />
                  <input type="hidden" name="ctxDate" value={selectedDate} />
                  {reportSource !== "daily_entry" ? (
                    <input type="hidden" name="ctxSource" value={reportSource} />
                  ) : null}
                  <button type="submit" className="btn-primary text-sm">
                    توليد من الإدخال اليومي المعبأ
                  </button>
                </form>

                <form
                  action={insertMonthlyReportCell}
                  className="surface-card space-y-3 border border-slate-100 p-4 md:p-5 ring-1 ring-slate-50"
                >
                  <h4 className="text-sm font-semibold text-slate-900">إضافة يدوية</h4>
                  <p className="text-sm text-slate-600">تاريخ جديد فقط — لا يُقبل تكرار نفس اليوم.</p>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="ctxMonth" value={selectedMonth} />
                  <input type="hidden" name="ctxYear" value={selectedYear} />
                  <input type="hidden" name="ctxClinicId" value={selectedClinicId} />
                  <input type="hidden" name="ctxCenterId" value={resolvedCenterId} />
                  <input type="hidden" name="ctxView" value={selectedView} />
                  <input type="hidden" name="ctxDate" value={selectedDate} />
                  {reportSource !== "daily_entry" ? (
                    <input type="hidden" name="ctxSource" value={reportSource} />
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700">التاريخ</span>
                      <input name="reportDate" type="date" required className="field-input" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700">اسم الطبيب</span>
                      <input name="doctorName" placeholder="اختياري" className="field-input" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700">العدد</span>
                      <input name="patientCount" type="number" min={0} defaultValue={0} className="field-input" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-slate-700">ملاحظات</span>
                      <input name="notes" placeholder="اختياري" className="field-input" />
                    </label>
                  </div>
                  <button type="submit" className="btn-emerald text-sm">
                    إضافة يوم للتقرير
                  </button>
                </form>
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                عرض فقط: إضافة أيام التقرير متاحة لمدير المركز.
              </p>
            )}

            <div className="table-shell shadow-sm">
              <table className="min-w-full text-right text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-800">التاريخ</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">الطبيب</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">العدد</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {(cells ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        لا توجد صفوف في التقرير الشهري لهذا الشهر بعد.
                      </td>
                    </tr>
                  ) : (
                    (cells ?? []).map((cell) => (
                      <tr
                        key={cell.id}
                        className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-800">{cell.report_date}</td>
                        <td className="px-4 py-2.5">{cell.doctor_name ?? "—"}</td>
                        <td className="px-4 py-2.5 tabular-nums">{cell.patient_count}</td>
                        <td className="px-4 py-2.5 text-slate-700">{cell.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            لم يتم إنشاء تقرير شهري لهذه الفلاتر بعد. استخدم «تفعيل التقرير لهذا الشهر» في القسم 3.
          </p>
        )}
      </ReportsSection>
        </>
      )}
    </div>
  );
}
