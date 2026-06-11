import type { ClinicReportSource } from "@/components/clinic-reports-source-tabs";

export type ReportsView = "daily" | "monthly";

export type NormalizedReportsFilter = {
  month: number;
  year: number;
  date: string;
  view: ReportsView;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function monthDateBoundsISO(year: number, month: number) {
  const last = daysInMonth(year, month);
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(last)}`,
  };
}

export function parseIsoDateParts(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function defaultDateInMonth(year: number, month: number, reference = new Date()) {
  const todayYear = reference.getFullYear();
  const todayMonth = reference.getMonth() + 1;
  const todayDay = reference.getDate();
  if (year === todayYear && month === todayMonth) {
    return `${year}-${pad2(month)}-${pad2(todayDay)}`;
  }
  return `${year}-${pad2(month)}-01`;
}

export function resolveFilterDateForQuery(
  source: ClinicReportSource | "daily_entry",
  view: ReportsView,
  date: string,
): string | undefined {
  if (source === "owner_monthly_form") return undefined;
  if (view === "daily") return date || undefined;
  if (source === "daily_entry" && date.trim()) return date.trim();
  return undefined;
}

export function normalizeReportsFilterParams(input: {
  month: number;
  year: number;
  date: string;
  view: ReportsView;
  source?: ClinicReportSource | "daily_entry";
}): NormalizedReportsFilter {
  const now = new Date();
  const source = input.source ?? "daily_entry";

  let month =
    Number.isFinite(input.month) && input.month >= 1 && input.month <= 12
      ? input.month
      : now.getMonth() + 1;
  let year =
    Number.isFinite(input.year) && input.year >= 2000 && input.year <= 2100
      ? input.year
      : now.getFullYear();

  if (source === "owner_monthly_form") {
    return { month, year, date: "", view: "monthly" };
  }

  if (source === "owner_daily_form") {
    const view = input.view === "daily" ? "daily" : "monthly";
    if (view === "daily") {
      const parsed = input.date ? parseIsoDateParts(input.date) : null;
      if (parsed) {
        return {
          month: parsed.month,
          year: parsed.year,
          date: `${parsed.year}-${pad2(parsed.month)}-${pad2(parsed.day)}`,
          view: "daily",
        };
      }
      return {
        month,
        year,
        date: defaultDateInMonth(year, month, now),
        view: "daily",
      };
    }
    return { month, year, date: "", view: "monthly" };
  }

  const view = input.view === "daily" ? "daily" : "monthly";
  let date = (input.date ?? "").trim();

  if (view === "daily") {
    const parsed = date ? parseIsoDateParts(date) : null;
    if (parsed) {
      month = parsed.month;
      year = parsed.year;
      date = `${parsed.year}-${pad2(parsed.month)}-${pad2(parsed.day)}`;
    } else {
      date = defaultDateInMonth(year, month, now);
    }
  } else if (date) {
    const parsed = parseIsoDateParts(date);
    if (!parsed || parsed.month !== month || parsed.year !== year) {
      date = "";
    }
  }

  return { month, year, date, view };
}

export function buildReportsFilterQuery(values: {
  centerId?: string;
  clinicId?: string;
  view: ReportsView;
  month: number;
  year: number;
  date?: string;
  source?: ClinicReportSource | "daily_entry";
}) {
  const source = values.source ?? "daily_entry";
  const q = new URLSearchParams();
  if (values.centerId) q.set("centerId", values.centerId);
  if (values.clinicId) q.set("clinicId", values.clinicId);
  if (source !== "daily_entry") q.set("source", source);

  q.set("year", String(values.year));
  q.set("month", String(values.month));

  if (source === "owner_monthly_form") {
    q.set("view", "monthly");
    return q.toString();
  }

  q.set("view", values.view);
  const date = resolveFilterDateForQuery(source, values.view, values.date ?? "");
  if (date) q.set("date", date);

  return q.toString();
}

export const FILTER_SOURCE_LABELS: Record<ClinicReportSource | "daily_entry", string> = {
  daily_entry: "الإدخال اليومي",
  owner_daily_form: "الاستمارة اليومية",
  owner_monthly_form: "الاستمارة الشهرية",
};

export function filterDescriptionForSource(source: ClinicReportSource | "daily_entry"): string {
  switch (source) {
    case "owner_daily_form":
      return "اختر العيادة والشهر والسنة. للعرض اليومي حدّد تاريخاً واحداً ضمن الشهر.";
    case "owner_monthly_form":
      return "اختر السنة لعرض تجميع جميع شهور المركز. الشهر يُستخدم في المؤشرات العلوية فقط.";
    default:
      return "اختر العيادة والفترة. العرض الشهري للمخططات والتقرير الرسمي؛ اليومي لجدول يوم محدد والتصدير.";
  }
}
