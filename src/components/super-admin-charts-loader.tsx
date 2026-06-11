import { getCachedSuperChartsPayload } from "@/lib/cached-queries";
import { ReportsPageChartsSlot } from "@/components/reports-page-charts-slot";

type Props = {
  year: number;
  month: number;
};

export async function SuperAdminChartsLoader({ year, month }: Props) {
  const superCharts = await getCachedSuperChartsPayload(year, month);

  return (
    <ReportsPageChartsSlot
      showSuper
      superCharts={superCharts}
      showClinic={false}
      clinicCharts={null}
    />
  );
}
