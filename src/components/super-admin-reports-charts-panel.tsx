"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#007a3d",
  "#ce1126",
  "#c8a028",
  "#005c2f",
  "#1c1c1c",
  "#6fbf8f",
  "#a60e1f",
  "#004d26",
  "#d4eddf",
  "#8b6914",
  "#e85d6f",
  "#003d1f",
];

type SuperAdminReportsChartsPanelProps = {
  monthLabel: string;
  year: number;
  centerBars: { name: string; value: number }[];
  yearLine: { label: string; value: number }[];
  topFieldSlices: { name: string; value: number }[];
};

export function SuperAdminReportsChartsPanel({
  monthLabel,
  year,
  centerBars,
  yearLine,
  topFieldSlices,
}: SuperAdminReportsChartsPanelProps) {
  const barData = centerBars.slice(0, 28);

  return (
    <div dir="rtl" className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-900">مخططات المشرف العام</h3>
        <p className="text-sm text-slate-600">
          نظرة على السنة {year} — التركيز على شهر العرض: {monthLabel}
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="surface-card flex min-h-[380px] flex-col p-4">
          <h4 className="mb-3 text-right text-sm font-semibold text-slate-800">
            مقارنة المراكز — مجموع المؤشرات في شهر العرض
          </h4>
          {!barData.length || barData.every((d) => d.value === 0) ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              لا توجد بيانات إدخال يومي مسجّلة لهذا الشهر عبر المراكز.
            </div>
          ) : (
            <div className="min-h-0 flex-1" style={{ minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <BarChart
                  layout="vertical"
                  data={barData}
                  margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={132}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <Tooltip formatter={(value) => [Number(value) || 0, "المجموع"]} />
                  <Bar dataKey="value" fill="#007a3d" radius={[0, 6, 6, 0]} name="المجموع" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-card flex min-h-[380px] flex-col p-4">
          <h4 className="mb-3 text-right text-sm font-semibold text-slate-800">
            المسار الشهري لجميع المراكز مجتمعة خلال السنة
          </h4>
          {!yearLine.some((d) => d.value > 0) ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              لا توجد بيانات إدخال يومي لهذه السنة بعد.
            </div>
          ) : (
            <div className="min-h-0 flex-1" style={{ minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <LineChart data={yearLine} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [Number(value) || 0, "المجموع"]} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#007a3d"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#005c2f" }}
                    activeDot={{ r: 6 }}
                    name="المجموع"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {topFieldSlices.length > 0 ? (
        <div className="surface-card p-4">
          <h4 className="mb-4 text-right text-sm font-semibold text-slate-800">
            أكبر المؤشرات خلال شهر العرض (كل المراكز)
          </h4>
          <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
            <div className="h-72 w-full lg:flex-1">
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <PieChart>
                  <Pie
                    data={topFieldSlices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={96}
                    paddingAngle={1}
                    label={false}
                  >
                    {topFieldSlices.map((_, i) => (
                      <Cell key={`slice-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [Number(value) || 0, "القيمة"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full shrink-0 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/80 text-sm lg:max-w-md">
              {topFieldSlices.map((d, i) => (
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
