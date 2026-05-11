"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = {
  day: number;
  value: number;
};

type MonthlyTrendChartProps = {
  data: TrendPoint[];
  /** عنوان داخل البطاقة (اختياري) */
  heading?: string;
};

export function MonthlyTrendChart({ data, heading }: MonthlyTrendChartProps) {
  if (!data.length) {
    return (
      <div className="surface-card flex h-72 w-full flex-col items-center justify-center gap-2 p-3 text-sm text-slate-500">
        {heading ? <p className="font-medium text-slate-600">{heading}</p> : null}
        لا توجد بيانات كافية لعرض الرسم البياني.
      </div>
    );
  }

  return (
    <div className="surface-card flex h-80 w-full min-w-[320px] flex-col p-3">
      {heading ? (
        <h4 className="mb-2 text-right text-sm font-semibold text-slate-800">{heading}</h4>
      ) : null}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" name="اليوم" />
            <YAxis />
            <Tooltip
              formatter={(value) => [Number(value) || 0, "المجموع"]}
              labelFormatter={(label) => `اليوم ${label}`}
            />
            <Line type="monotone" dataKey="value" name="المجموع" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
