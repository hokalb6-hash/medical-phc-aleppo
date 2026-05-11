"use client";

import dynamic from "next/dynamic";
import type { CellBarPoint, DoctorSlice } from "@/components/reports-charts-panel";

const SuperAdminReportsChartsPanel = dynamic(
  () =>
    import("@/components/super-admin-reports-charts-panel").then((mod) => ({
      default: mod.SuperAdminReportsChartsPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="surface-card flex min-h-[200px] items-center justify-center p-6 text-sm text-slate-500">
        جاري تحميل مخططات المشرف العام...
      </div>
    ),
  },
);

const ReportsChartsPanel = dynamic(
  () =>
    import("@/components/reports-charts-panel").then((mod) => ({
      default: mod.ReportsChartsPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="surface-card flex min-h-[220px] items-center justify-center p-6 text-sm text-slate-500">
        جاري تحميل المخططات التوضيحية...
      </div>
    ),
  },
);

export type SuperChartsPayload = {
  monthLabel: string;
  year: number;
  centerBars: { name: string; value: number }[];
  yearLine: { label: string; value: number; month?: number }[];
  topFieldSlices: { name: string; value: number }[];
};

export type ClinicChartsPayload = {
  trendData: { day: number; value: number }[];
  cellBars: CellBarPoint[];
  doctorSlices: DoctorSlice[];
  monthTitle: string;
  contextSubtitle?: string;
};

export function ReportsPageChartsSlot({
  superCharts,
  clinicCharts,
  showSuper,
  showClinic,
}: {
  superCharts: SuperChartsPayload | null;
  clinicCharts: ClinicChartsPayload | null;
  showSuper: boolean;
  showClinic: boolean;
}) {
  return (
    <>
      {showSuper && superCharts ? <SuperAdminReportsChartsPanel {...superCharts} /> : null}
      {showClinic && clinicCharts ? <ReportsChartsPanel {...clinicCharts} /> : null}
    </>
  );
}
