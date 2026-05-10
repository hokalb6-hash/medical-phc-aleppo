"use client";

import dynamic from "next/dynamic";

type TrendPoint = {
  day: number;
  value: number;
};

const MonthlyTrendChart = dynamic(
  () => import("@/components/monthly-trend-chart").then((m) => m.MonthlyTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="surface-card flex h-72 w-full items-center justify-center p-3 text-sm text-slate-500">
        جاري تحميل الرسم البياني...
      </div>
    ),
  },
);

export function MonthlyTrendChartClient({ data }: { data: TrendPoint[] }) {
  return <MonthlyTrendChart data={data} />;
}

