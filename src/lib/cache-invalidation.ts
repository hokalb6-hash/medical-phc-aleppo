import { revalidateTag } from "next/cache";

export function invalidateCentersCache() {
  revalidateTag("medical-centers-list", "max");
}

export function invalidateClinicsCache(centerId?: string) {
  revalidateTag("clinics-list-all", "max");
  if (centerId) {
    revalidateTag(`clinics-list-${centerId}`, "max");
  }
}

export function invalidateSuperChartsCache(year: number, month?: number) {
  revalidateTag(`super-charts-${year}`, "max");
  if (month != null) {
    revalidateTag(`super-charts-${year}-${month}`, "max");
  }
}

export function invalidateDailyMonitorCache() {
  revalidateTag("daily-monitor", "max");
}

export function invalidateDailyDataCaches(centerId: string, year: number, month: number) {
  invalidateSuperChartsCache(year, month);
  invalidateSuperChartsCache(year);
  invalidateDailyMonitorCache();
  revalidateTag("dashboard-counts-all", "max");
  revalidateTag(`dashboard-counts-${centerId}`, "max");
}
