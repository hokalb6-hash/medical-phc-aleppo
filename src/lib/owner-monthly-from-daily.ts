import { DAILY_FIELDS } from "@/lib/constants";

export type OwnerMonthlyAggregatedRow = {
  metrics: Record<string, number>;
  reviewers_total: number;
};

/**
 * يجمع إدخالات `daily_entries` لمركز وسنة معيّنة حسب الشهر (نفس منطق التوليد السابق).
 */
export function aggregateDailyEntriesByMonthForCenter(
  rows: { month: number; data: Record<string, unknown> | null }[],
): Map<number, OwnerMonthlyAggregatedRow> {
  const byMonth = new Map<number, Record<string, number>>();
  for (let m = 1; m <= 12; m++) {
    const o: Record<string, number> = {};
    for (const f of DAILY_FIELDS) o[f.key] = 0;
    byMonth.set(m, o);
  }

  for (const row of rows) {
    const m = Number(row.month);
    if (m < 1 || m > 12) continue;
    const tgt = byMonth.get(m);
    if (!tgt) continue;
    const payload = (row.data ?? {}) as Record<string, unknown>;
    for (const f of DAILY_FIELDS) {
      const raw = payload[f.key];
      const num = typeof raw === "number" ? raw : Number(raw) || 0;
      tgt[f.key] += num;
    }
  }

  const out = new Map<number, OwnerMonthlyAggregatedRow>();
  for (let m = 1; m <= 12; m++) {
    const metrics = byMonth.get(m)!;
    out.set(m, {
      metrics,
      reviewers_total: metrics.reproductive_reviewers ?? 0,
    });
  }
  return out;
}
