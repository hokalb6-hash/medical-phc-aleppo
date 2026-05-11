import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DAILY_FIELDS, MONTHS_AR } from "@/lib/constants";
import { aggregateDailyEntriesByMonthForCenter } from "@/lib/owner-monthly-from-daily";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerMonthlyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const params = await Promise.resolve(searchParams);
  const now = new Date();

  const year = Number(asSingle(params.year)) || now.getFullYear();
  const selectedCenterId =
    (asSingle(params.centerId) ?? profile.center_id ?? "").toString();

  const { data: centers } =
    profile.role === "super_admin"
      ? await supabase.from("medical_centers").select("id, name").order("name")
      : { data: [] as { id: string; name: string }[] };

  const centerId = profile.role === "super_admin" ? selectedCenterId : profile.center_id!;

  const { data: dailyRows } = centerId
    ? await supabase
        .from("daily_entries")
        .select("month, data")
        .eq("center_id", centerId)
        .eq("year", year)
    : { data: [] as { month: number; data: Record<string, unknown> | null }[] };

  const monthMap = aggregateDailyEntriesByMonthForCenter(dailyRows ?? []);

  const headerFormCols =
    profile.role === "super_admin"
      ? "md:grid-cols-[280px_180px_auto]"
      : "md:grid-cols-[180px_auto]";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">استمارة أصحاب المراكز - الشهرية</h2>

      <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
        هذه الاستمارة <strong className="font-semibold text-slate-800">للعرض فقط</strong>: تُحسب القيم تلقائياً
        من سجلات <strong className="font-semibold text-slate-800">الإدخال اليومي</strong> لجميع العيادات التابعة
        للمركز وللسنة المعروضة، ولا يمكن تعديلها من هنا. لإدخال أو تصحيح البيانات استخدم صفحة «الإدخال اليومي».
      </p>

      <form className={`surface-card grid gap-3 p-4 ${headerFormCols}`}>
        {profile.role === "super_admin" ? (
          <select
            name="centerId"
            defaultValue={selectedCenterId}
            className="field-select"
          >
            <option value="">اختر المركز</option>
            {(centers ?? []).map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="number"
          name="year"
          min={2000}
          max={2100}
          defaultValue={year}
          className="field-input"
        />
        <button
          type="submit"
          className="btn-dark h-9 w-fit justify-self-start whitespace-nowrap px-3 text-sm"
        >
          عرض السنة
        </button>
      </form>

      {centerId ? (
        <div className="space-y-3">
          <div className="table-shell">
            <table className="min-w-[1800px] text-right text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-2 py-2">الشهر</th>
                  <th className="border border-slate-200 px-2 py-2">عدد المراجعين</th>
                  {DAILY_FIELDS.map((field) => (
                    <th key={field.key} className="border border-slate-200 px-2 py-2">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MONTHS_AR.map((monthName, index) => {
                  const month = index + 1;
                  const row = monthMap.get(month);
                  const metrics = row?.metrics ?? {};

                  return (
                    <tr key={month}>
                      <td className="border border-slate-200 px-2 py-2 font-semibold">{monthName}</td>
                      <td className="border border-slate-200 px-2 py-2 font-semibold tabular-nums">
                        {row?.reviewers_total ?? 0}
                      </td>
                      {DAILY_FIELDS.map((field) => (
                        <td
                          key={`${month}_${field.key}`}
                          className="border border-slate-200 px-2 py-2 font-semibold tabular-nums text-slate-800"
                        >
                          {Number(metrics[field.key]) || 0}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {profile.role === "super_admin" ? (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              وضع المشرف العام: عرض تجميعي للمركز المختار فقط، دون إمكانية التعديل.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          {profile.role === "super_admin"
            ? "اختر مركزاً لعرض الاستمارة الشهرية المجمّعة."
            : "تعذر تحديد المركز."}
        </p>
      )}
    </div>
  );
}
