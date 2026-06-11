"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Building2, Stethoscope, RotateCcw, SlidersHorizontal } from "lucide-react";
import { MONTHS_AR } from "@/lib/constants";
import type { AppRole } from "@/lib/supabase/types";
import type { ClinicReportSource } from "@/components/clinic-reports-source-tabs";
import type { ReportsView } from "@/lib/reports-filter-params";
import {
  buildReportsFilterQuery,
  defaultDateInMonth,
  FILTER_SOURCE_LABELS,
  monthDateBoundsISO,
  parseIsoDateParts,
  resolveFilterDateForQuery,
} from "@/lib/reports-filter-params";

type CenterOption = { id: string; name: string };
type ClinicOption = { id: string; name: string; center_id: string };

export type ReportsFilterValues = {
  centerId: string;
  clinicId: string;
  view: ReportsView;
  month: number;
  year: number;
  date: string;
  source?: ClinicReportSource;
};

type ReportsFilterFormProps = {
  role: AppRole;
  centers: CenterOption[];
  clinics: ClinicOption[];
  values: ReportsFilterValues;
  showSourceField?: boolean;
};

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

function FilterGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="reports-filter-group">
      <div className="reports-filter-group-head">
        <Icon className="h-4 w-4 text-sy-green-700" aria-hidden />
        <span>{title}</span>
      </div>
      <div className="reports-filter-group-body">{children}</div>
    </div>
  );
}

export function ReportsFilterForm({
  role,
  centers,
  clinics,
  values,
  showSourceField = false,
}: ReportsFilterFormProps) {
  const router = useRouter();
  const isSuperAdmin = role === "super_admin";

  const [centerId, setCenterId] = useState(values.centerId);
  const [clinicId, setClinicId] = useState(values.clinicId);
  const [view, setView] = useState<ReportsView>(values.view);
  const [month, setMonth] = useState(values.month);
  const [year, setYear] = useState(values.year);
  const [date, setDate] = useState(values.date);

  const source = values.source ?? "daily_entry";
  const isOwnerMonthly = source === "owner_monthly_form";
  const isOwnerDaily = source === "owner_daily_form";
  const showViewToggle = !isOwnerMonthly;
  const showDateField = !isOwnerMonthly;
  const dateRequired = source === "owner_daily_form" ? view === "daily" : view === "daily";

  useEffect(() => {
    setCenterId(values.centerId);
    setClinicId(values.clinicId);
    setView(values.view);
    setMonth(values.month);
    setYear(values.year);
    setDate(values.date);
  }, [
    values.centerId,
    values.clinicId,
    values.view,
    values.month,
    values.year,
    values.date,
    values.source,
  ]);

  const visibleClinics = useMemo(() => {
    if (!isSuperAdmin || !centerId) return clinics;
    return clinics.filter((c) => c.center_id === centerId);
  }, [clinics, centerId, isSuperAdmin]);

  const bounds = monthDateBoundsISO(year, month);
  const isDaily = view === "daily";

  const selectedCenterName =
    centers.find((c) => c.id === centerId)?.name ?? (centerId ? "—" : "كل المراكز");
  const selectedClinicName = visibleClinics.find((c) => c.id === clinicId)?.name ?? "—";
  const periodLabel = isOwnerMonthly
    ? `سنة ${year} · ${MONTHS_AR[month - 1]} (مؤشرات)`
    : isDaily && date
      ? `${date} · ${MONTHS_AR[month - 1]} ${year}`
      : `${MONTHS_AR[month - 1]} ${year}`;

  function handleCenterChange(nextCenterId: string) {
    setCenterId(nextCenterId);
    const nextClinics = nextCenterId
      ? clinics.filter((c) => c.center_id === nextCenterId)
      : clinics;
    if (clinicId && !nextClinics.some((c) => c.id === clinicId)) {
      setClinicId(nextClinics[0]?.id ?? "");
    }
  }

  function handleMonthChange(nextMonth: number) {
    setMonth(nextMonth);
    if (isDaily) {
      setDate((current) => {
        const parts = parseIsoDateParts(current);
        if (parts && parts.year === year && parts.month === nextMonth) return current;
        return defaultDateInMonth(year, nextMonth);
      });
    } else if (date) {
      const parts = parseIsoDateParts(date);
      if (!parts || parts.year !== year || parts.month !== nextMonth) {
        setDate("");
      }
    }
  }

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    if (isDaily) {
      setDate((current) => {
        const parts = parseIsoDateParts(current);
        if (parts && parts.year === nextYear && parts.month === month) return current;
        return defaultDateInMonth(nextYear, month);
      });
    } else if (date) {
      const parts = parseIsoDateParts(date);
      if (!parts || parts.year !== nextYear || parts.month !== month) {
        setDate("");
      }
    }
  }

  function handleViewChange(nextView: ReportsView) {
    setView(nextView);
    if (nextView === "daily" && !date) {
      setDate(defaultDateInMonth(year, month));
    }
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    const parts = parseIsoDateParts(nextDate);
    if (parts) {
      setMonth(parts.month);
      setYear(parts.year);
    }
  }

  function navigateWith(valuesToApply: ReportsFilterValues) {
    const effectiveSource = valuesToApply.source ?? "daily_entry";
    const effectiveView = effectiveSource === "owner_monthly_form" ? "monthly" : valuesToApply.view;
    const query = buildReportsFilterQuery({
      centerId: isSuperAdmin ? valuesToApply.centerId : undefined,
      clinicId: valuesToApply.clinicId,
      view: effectiveView,
      month: valuesToApply.month,
      year: valuesToApply.year,
      date: resolveFilterDateForQuery(
        effectiveSource,
        effectiveView,
        valuesToApply.date,
      ),
      source: showSourceField ? effectiveSource : undefined,
    });
    router.push(`/dashboard/reports?${query}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOwnerMonthly && !clinicId) {
      alert("اختر عيادةً لتطبيق الفلتر.");
      return;
    }
    if (dateRequired && !date) {
      alert("اختر تاريخاً للعرض اليومي.");
      return;
    }
    if (dateRequired) {
      const parts = parseIsoDateParts(date);
      if (!parts) {
        alert("التاريخ المحدد غير صالح.");
        return;
      }
    }
    navigateWith({
      centerId,
      clinicId,
      view,
      month,
      year,
      date,
      source: values.source,
    });
  }

  function handleReset() {
    const now = new Date();
    const resetView: ReportsView = isOwnerMonthly ? "monthly" : "monthly";
    const resetValues: ReportsFilterValues = {
      centerId: "",
      clinicId: isOwnerMonthly ? "" : (clinics[0]?.id ?? ""),
      view: resetView,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      date: "",
      source: values.source,
    };
    setCenterId(resetValues.centerId);
    setClinicId(resetValues.clinicId);
    setView(resetValues.view);
    setMonth(resetValues.month);
    setYear(resetValues.year);
    setDate(resetValues.date);
    navigateWith(resetValues);
  }

  return (
    <div className="reports-filter-panel">
      <div className="reports-filter-summary">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-sy-green-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">الفلتر النشط</p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
            {showSourceField ? `${FILTER_SOURCE_LABELS[source]} · ` : ""}
            {isSuperAdmin ? `${selectedCenterName} · ` : ""}
            {isOwnerMonthly ? "جميع العيادات" : selectedClinicName || "بدون عيادة"} ·{" "}
            {isOwnerMonthly ? "سنوي" : isDaily ? "يومي" : "شهري"} · {periodLabel}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="reports-filter-form">
        <FilterGroup title="نطاق التقرير" icon={Building2}>
          <div className={`reports-filter-fields ${isSuperAdmin ? "md:grid-cols-2" : ""}`}>
            {isSuperAdmin ? (
              <label className="reports-filter-field">
                <span>المركز</span>
                <select
                  name="centerId"
                  value={centerId}
                  onChange={(e) => handleCenterChange(e.target.value)}
                  className="field-select"
                >
                  <option value="">كل المراكز</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {!isOwnerMonthly ? (
              <label className="reports-filter-field">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  العيادة
                </span>
                <select
                  name="clinicId"
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                  className="field-select"
                  required={visibleClinics.length > 0}
                >
                  <option value="">اختر العيادة</option>
                  {visibleClinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </FilterGroup>

        <FilterGroup title="الفترة الزمنية" icon={CalendarDays}>
          {showViewToggle ? (
            <div className="reports-filter-view-toggle" role="group" aria-label="نوع العرض">
              <button
                type="button"
                className={view === "monthly" ? "is-active" : ""}
                onClick={() => handleViewChange("monthly")}
                aria-pressed={view === "monthly"}
              >
                عرض شهري
              </button>
              <button
                type="button"
                className={view === "daily" ? "is-active" : ""}
                onClick={() => handleViewChange("daily")}
                aria-pressed={view === "daily"}
              >
                عرض يومي
              </button>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-slate-600">
              الاستمارة الشهرية تُعرض لسنة كاملة؛ الشهر المحدد يُستخدم في المؤشرات العلوية فقط.
            </p>
          )}
          <input type="hidden" name="view" value={isOwnerMonthly ? "monthly" : view} />

          <div
            className={`reports-filter-fields ${showDateField ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            <label className="reports-filter-field">
              <span>{isOwnerMonthly ? "الشهر (مؤشرات)" : "الشهر"}</span>
              <select
                name="month"
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="field-select"
              >
                {MONTHS_AR.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="reports-filter-field">
              <span>السنة</span>
              <select
                name="year"
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="field-select"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>

            {showDateField ? (
              <label className={`reports-filter-field ${dateRequired ? "" : "opacity-60"}`}>
                <span>
                  {dateRequired ? "التاريخ" : isOwnerDaily ? "—" : "تاريخ محدد (اختياري)"}
                  {dateRequired ? <span className="text-red-600"> *</span> : null}
                </span>
                <input
                  name="date"
                  type="date"
                  value={date}
                  min={bounds.from}
                  max={bounds.to}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required={dateRequired}
                  disabled={!dateRequired && isOwnerDaily}
                  className="field-input"
                />
                <span className="reports-filter-hint">
                  {dateRequired
                    ? `عرض يوم واحد (${bounds.from} → ${bounds.to})`
                    : isOwnerDaily
                      ? "فعّل «عرض يومي» لتحديد تاريخ واحد"
                      : "اختياري — لتصدير يوم محدد دون تغيير العرض الشهري"}
                </span>
              </label>
            ) : null}
          </div>
        </FilterGroup>

        {showSourceField && values.source ? (
          <input type="hidden" name="source" value={values.source} />
        ) : null}

        <div className="reports-filter-actions">
          <button type="submit" className="btn-primary min-w-[140px]">
            تطبيق الفلتر
          </button>
          <button type="button" onClick={handleReset} className="reports-filter-reset">
            <RotateCcw className="h-4 w-4" aria-hidden />
            إعادة ضبط
          </button>
        </div>
      </form>
    </div>
  );
}
