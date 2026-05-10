"use client";

import { generateOwnerMonthlyFromDaily } from "@/app/dashboard/actions";
import { MONTHS_AR } from "@/lib/constants";

type Props = {
  year: number;
  centerId?: string;
};

export function OwnerMonthlyGenerateForm({ year, centerId }: Props) {
  return (
    <form action={generateOwnerMonthlyFromDaily} className="surface-card border-emerald-200 bg-emerald-50 p-3">
      {centerId ? <input type="hidden" name="centerId" value={centerId} /> : null}
      <input type="hidden" name="year" value={year} />

      <div className="grid gap-3 md:grid-cols-[220px_220px_220px_auto] md:items-end">
        <select
          name="generationScope"
          defaultValue="year"
          className="field-select border-emerald-300 text-sm"
        >
          <option value="year">توليد سنة كاملة</option>
          <option value="month">توليد شهر واحد</option>
        </select>
        <select
          name="generationMonth"
          defaultValue={String(new Date().getMonth() + 1)}
          className="field-select border-emerald-300 text-sm"
        >
          {MONTHS_AR.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          name="generationMode"
          className="field-select border-emerald-300 text-sm"
        >
          <option value="append">إضافة على القيم الحالية</option>
        </select>
        <button
          type="submit"
          className="btn-emerald h-9 w-fit justify-self-start whitespace-nowrap px-3 text-sm"
        >
          توليد تلقائي من اليومي
        </button>
      </div>

      <div className="mt-2 text-xs text-emerald-900">
        سيتم توليد القيم بطريقة الإضافة فقط، أي ضم القيم الجديدة إلى الأرقام الحالية.
      </div>
    </form>
  );
}
