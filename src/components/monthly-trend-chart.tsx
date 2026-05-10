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

export function MonthlyTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) {
    return (
      <div className="surface-card flex h-72 w-full items-center justify-center p-3 text-sm text-slate-500">
        لا توجد بيانات كافية لعرض الرسم البياني.
      </div>
    );
  }

  return (
    <div className="surface-card h-72 w-full min-w-[320px] p-3">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#1d4ed8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
