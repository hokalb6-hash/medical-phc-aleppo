import { DAILY_FIELDS } from "@/lib/constants";

/** مجموع جميع الحقول الرقمية في سجل إدخال يومي واحد */
export function sumDailyEntryFields(data: Record<string, unknown> | null | undefined): number {
  if (!data) return 0;
  return DAILY_FIELDS.reduce((acc, f) => acc + (Number(data[f.key]) || 0), 0);
}
