"use client";

import { MonthlyTrendChart } from "@/components/monthly-trend-chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#1d4ed8",
  "#0d9488",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#15803d",
  "#0369a1",
  "#a21caf",
];

export type CellBarPoint = { day: number; date: string; patients: number };
export type DoctorSlice = { name: string; value: number };

type ReportsChartsPanelProps = {
  trendData: { day: number; value: number }[];
  cellBars: CellBarPoint[];
  doctorSlices: DoctorSlice[];
  monthTitle: string;
  /** سطر إضافي تحت عنوان المخططات (مثلاً اسم العيادة) */
  contextSubtitle?: string;
};

export function ReportsChartsPanel({
  trendData,
  cellBars,
  doctorSlices,
  monthTitle,
  contextSubtitle,
}: ReportsChartsPanelProps) {
  return (
    <div dir="rtl" className="space-y-6">
      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-l from-slate-50/90 to-white px-4 py-3 md:px-5">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">مخططات تحليلية</h3>
        <p className="mt-0.5 text-sm font-medium text-slate-700">{monthTitle}</p>
        {contextSubtitle ? (
          <p className="mt-1 text-xs text-slate-500 md:text-sm">{contextSubtitle}</p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <MonthlyTrendChart
          data={trendData}
          heading="مجموع مؤشرات الإدخال اليومي حسب اليوم في الشهر"
        />

        <div className="surface-card flex h-80 flex-col p-4 ring-1 ring-slate-100">
          <h4 className="mb-2 text-right text-sm font-semibold text-slate-800">
            التقرير الشهري الرسمي — عدد الحالات لكل يوم
          </h4>
          {!cellBars.length ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 text-center text-sm text-slate-500">
              <span>لا توجد صفوف مسجّلة في التقرير الشهري لهذا الشهر.</span>
              <span className="text-xs text-slate-400">
                فعّل التقرير للشهر ثم أضف الأيام من الجدول أدناه.
              </span>
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={200}>
                <BarChart
                  data={cellBars}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [Number(value) || 0, "عدد الحالات"]}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as CellBarPoint | undefined;
                      if (row?.date) return `التاريخ: ${row.date}`;
                      return `اليوم ${label}`;
                    }}
                  />
                  <Bar
                    dataKey="patients"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                    name="العدد"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {doctorSlices.length > 0 ? (
        <div className="surface-card p-4 ring-1 ring-slate-100">
          <h4 className="mb-4 text-right text-sm font-semibold text-slate-800">
            توزيع إجمالي الحالات حسب الطبيب (التقرير الشهري)
          </h4>
          <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
            <div className="h-72 w-full lg:flex-1">
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <PieChart>
                  <Pie
                    data={doctorSlices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={96}
                    paddingAngle={1}
                    label={false}
                  >
                    {doctorSlices.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [Number(value) || 0, "العدد"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full shrink-0 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/80 text-sm lg:max-w-sm">
              {doctorSlices.map((d, i) => (
                <li key={d.name} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      aria-hidden
                    />
                    <span className="truncate text-slate-800">{d.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
