import SuperAdminDailyMonitor from "@/components/super-admin-daily-monitor";
import { getCachedDailyMonitorEntries } from "@/lib/cached-queries";

type Props = {
  selectedCenterId: string;
  selectedDate: string;
  selectedMonth: number;
  selectedYear: number;
};

export async function DailyEntryMonitorSection({
  selectedCenterId,
  selectedDate,
  selectedMonth,
  selectedYear,
}: Props) {
  const monitorRows = await getCachedDailyMonitorEntries({
    centerId: selectedCenterId,
    entryDate: selectedDate,
    month: selectedMonth,
    year: selectedYear,
  });

  return <SuperAdminDailyMonitor entries={monitorRows} />;
}
