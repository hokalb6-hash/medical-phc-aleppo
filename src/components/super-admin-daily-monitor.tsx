"use client";

import { useMemo, useState } from "react";
import { DAILY_FIELDS } from "@/lib/constants";

type MonitorEntry = {
  id: string;
  entry_date: string;
  month: number;
  year: number;
  data: Record<string, number>;
  created_at: string;
  clinic_name: string;
  center_name: string;
};

type Props = {
  entries: MonitorEntry[];
};

const GROUPS = [
  { key: "chronic", title: "الأمراض المزمنة" },
  { key: "nutrition", title: "التغذية" },
  { key: "therapeutic", title: "الرعاية العلاجية" },
  { key: "reproductive", title: "الصحة الإنجابية" },
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-EG").format(value);
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export default function SuperAdminDailyMonitor({ entries }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const enrichedEntries = useMemo(
    () =>
      entries.map((entry) => {
        const total = Object.values(entry.data ?? {}).reduce(
          (acc, current) => acc + (Number(current) || 0),
          0,
        );
        return { ...entry, total };
      }),
    [entries],
  );

  const selectedEntry = useMemo(
    () => enrichedEntries.find((entry) => entry.id === activeId) ?? null,
    [activeId, enrichedEntries],
  );

  const stats = useMemo(() => {
    const records = enrichedEntries.length;
    const totals = enrichedEntries.reduce((acc, entry) => acc + entry.total, 0);
    return {
      records,
      totals,
      avg: records > 0 ? Math.round(totals / records) : 0,
    };
  }, [enrichedEntries]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="surface-card bg-slate-50 p-4">
          <p className="text-xs text-slate-500">عدد السجلات</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {formatNumber(stats.records)}
          </p>
        </div>
        <div className="surface-card bg-slate-50 p-4">
          <p className="text-xs text-slate-500">إجمالي القيم</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {formatNumber(stats.totals)}
          </p>
        </div>
        <div className="surface-card bg-slate-50 p-4">
          <p className="text-xs text-slate-500">متوسط السجل</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {formatNumber(stats.avg)}
          </p>
        </div>
      </div>

      <div className="table-shell">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">التاريخ</th>
              <th className="px-3 py-2">المركز</th>
              <th className="px-3 py-2">العيادة</th>
              <th className="px-3 py-2">إجمالي القيم</th>
              <th className="px-3 py-2">وقت الإدخال</th>
              <th className="px-3 py-2">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {enrichedEntries.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{entry.entry_date}</td>
                <td className="px-3 py-2">{entry.center_name}</td>
                <td className="px-3 py-2">{entry.clinic_name}</td>
                <td className="px-3 py-2 font-semibold text-slate-800">
                  {formatNumber(entry.total)}
                </td>
                <td className="px-3 py-2">{formatTimestamp(entry.created_at)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setActiveId(entry.id)}
                    className="rounded-xl border border-sy-green-200 bg-sy-green-50 px-3 py-1.5 text-xs font-semibold text-sy-green-700 hover:bg-sy-green-100"
                  >
                    عرض التفاصيل
                  </button>
                </td>
              </tr>
            ))}
            {enrichedEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  لا توجد بيانات مطابقة للفلاتر المختارة.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedEntry ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="h-full w-full overflow-y-auto bg-white shadow-2xl sm:max-w-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  تفاصيل سجل الإدخال اليومي
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEntry.center_name} - {selectedEntry.clinic_name} -{" "}
                  {selectedEntry.entry_date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">تاريخ الإدخال</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedEntry.entry_date}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">وقت الحفظ</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatTimestamp(selectedEntry.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">الشهر</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedEntry.month}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">السنة</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedEntry.year}
                  </p>
                </div>
              </div>

              {GROUPS.map((group) => {
                const groupFields = DAILY_FIELDS.filter((field) =>
                  field.key.startsWith(`${group.key}_`),
                );

                return (
                  <section
                    key={group.key}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <h4 className="mb-3 text-sm font-bold text-slate-800">
                      {group.title}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {groupFields.map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span className="text-xs text-slate-600">
                            {field.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {formatNumber(Number(selectedEntry.data[field.key] ?? 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
