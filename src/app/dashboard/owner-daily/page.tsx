import { requireAuth } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveOwnerDailyClinicSheet } from "@/app/dashboard/actions";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(year: number, month: number, day: number) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default async function OwnerDailyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const admin = createAdminClient();
  const params = await Promise.resolve(searchParams);
  const now = new Date();
  const error = asSingle(params.error);
  const success = asSingle(params.success);

  const month = Number(asSingle(params.month)) || now.getMonth() + 1;
  const year = Number(asSingle(params.year)) || now.getFullYear();
  const selectedCenterId =
    (asSingle(params.centerId) ?? profile.center_id ?? "").toString();
  const selectedClinicFromParams = (asSingle(params.clinicId) ?? "").toString();

  const getCenters = unstable_cache(
    async () =>
      admin.from("medical_centers").select("id, name").order("name"),
    ["owner-daily-centers"],
    { revalidate: 60, tags: ["owner-daily-centers"] },
  );

  const { data: centers } =
    profile.role === "super_admin"
      ? await getCenters()
      : { data: [] as { id: string; name: string }[] };

  const clinicsQuery =
    profile.role === "super_admin"
      ? selectedCenterId
        ? unstable_cache(
            async () =>
              admin
                .from("clinics")
                .select("id, name")
                .eq("center_id", selectedCenterId)
                .order("name"),
            ["owner-daily-clinics", selectedCenterId],
            {
              revalidate: 30,
              tags: ["owner-daily-clinics", `owner-daily-clinics-${selectedCenterId}`],
            },
          )()
        : Promise.resolve({ data: [] as { id: string; name: string }[] })
      : unstable_cache(
          async () =>
            admin
              .from("clinics")
              .select("id, name")
              .eq("center_id", profile.center_id)
              .order("name"),
          ["owner-daily-clinics", profile.center_id ?? ""],
          {
            revalidate: 30,
            tags: ["owner-daily-clinics", `owner-daily-clinics-${profile.center_id ?? ""}`],
          },
        )();

  const { data: clinics } = await clinicsQuery;
  const centerId = profile.role === "super_admin" ? selectedCenterId : profile.center_id!;
  const selectedClinicId = selectedClinicFromParams || (clinics?.[0]?.id ?? "");
  const selectedClinic =
    profile.role === "center_manager"
      ? (clinics ?? []).find((c) => c.id === selectedClinicId) ?? null
      : null;

  const daysInMonth = new Date(year, month, 0).getDate();
  const from = formatDate(year, month, 1);
  const to = formatDate(year, month, daysInMonth);

  const { data: existingRows } =
    centerId &&
    (profile.role === "center_manager"
      ? Boolean(selectedClinicId)
      : (clinics?.length ?? 0) > 0)
      ? await unstable_cache(
          async () =>
            (() => {
              let query = admin
                .from("owner_daily_clinic_sheet")
                .select("clinic_id, entry_date, doctor_name, patient_count")
                .eq("center_id", centerId)
                .gte("entry_date", from)
                .lte("entry_date", to);
              if (profile.role === "center_manager") {
                query = query.eq("clinic_id", selectedClinicId);
              }
              return query;
            })(),
          [
            "owner-daily-rows",
            centerId,
            profile.role === "center_manager" ? selectedClinicId : "all-clinics",
            String(year),
            String(month),
          ],
          {
            revalidate: 20,
            tags: [
              "owner-daily-rows",
              `owner-daily-rows-${centerId}-${year}-${month}`,
            ],
          },
        )()
      : { data: [] as { clinic_id: string; entry_date: string; doctor_name: string | null; patient_count: number }[] };

  const rowMap = new Map(
    (existingRows ?? []).map((row) => [
      `${row.clinic_id}_${row.entry_date}`,
      { doctor: row.doctor_name ?? "", count: row.patient_count },
    ]),
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">استمارة أصحاب المراكز - اليومية</h2>
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>
      ) : null}

      <form className="surface-card grid gap-3 p-4 md:grid-cols-5">
        {profile.role === "super_admin" ? (
          <select name="centerId" defaultValue={selectedCenterId} className="field-select">
            <option value="">اختر المركز</option>
            {(centers ?? []).map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        ) : null}
        {profile.role === "center_manager" ? (
          <select name="clinicId" defaultValue={selectedClinicId} className="field-select">
            <option value="">اختر العيادة</option>
            {(clinics ?? []).map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="number"
          name="month"
          min={1}
          max={12}
          defaultValue={month}
          className="field-input"
        />
        <input
          type="number"
          name="year"
          min={2000}
          max={2100}
          defaultValue={year}
          className="field-input"
        />
        <button type="submit" className="btn-dark">
          عرض الجدول
        </button>
      </form>

      {centerId &&
      (profile.role === "center_manager"
        ? Boolean(selectedClinic)
        : (clinics?.length ?? 0) > 0) ? (
        profile.role === "super_admin" ? (
          <div className="space-y-3">
            <div className="table-shell">
              <table className="min-w-[900px] text-right text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-200 px-2 py-2">التاريخ</th>
                    {(clinics ?? []).map((clinic) => (
                      <th key={clinic.id} className="border border-slate-200 px-2 py-2">
                        {clinic.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const date = formatDate(year, month, day);
                    return (
                      <tr key={date}>
                        <td className="border border-slate-200 px-2 py-2 font-semibold">
                          {day}/{month}/{year}
                        </td>
                        {(clinics ?? []).map((clinic) => {
                          const saved = rowMap.get(`${clinic.id}_${date}`);
                          return (
                            <td key={`${clinic.id}_${date}`} className="border border-slate-200 p-2">
                              <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                الطبيب: {saved?.doctor || "-"}
                              </div>
                              <div className="mt-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800">
                                العدد: {saved?.count ?? 0}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              وضع السوبر آدمن: متابعة فقط. لا يمكن التعديل أو الحفظ من هذه الصفحة.
            </p>
          </div>
        ) : (
          <form action={saveOwnerDailyClinicSheet} className="space-y-3">
            <input type="hidden" name="clinicId" value={selectedClinic?.id ?? ""} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="year" value={year} />
            <div className="table-shell">
              <table className="min-w-[500px] text-right text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-200 px-2 py-2">التاريخ</th>
                      <th className="border border-slate-200 px-2 py-2">{selectedClinic?.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const date = formatDate(year, month, day);
                    return (
                      <tr key={date}>
                        <td className="border border-slate-200 px-2 py-2 font-semibold">
                          {day}/{month}/{year}
                        </td>
                        {(() => {
                          const saved = rowMap.get(`${selectedClinic?.id}_${date}`);
                          return (
                            <td className="border border-slate-200 p-2">
                              <input
                                name={`od_${selectedClinic?.id}_${date}_doctor`}
                                defaultValue={saved?.doctor ?? ""}
                                placeholder="الطبيب"
                                className="mb-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                type="number"
                                min={0}
                                name={`od_${selectedClinic?.id}_${date}_count`}
                                defaultValue={saved?.count ?? 0}
                                placeholder="العدد"
                                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                              />
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button type="submit" className="btn-primary">
              حفظ الاستمارة اليومية
            </button>
          </form>
        )
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          {profile.role === "center_manager"
            ? "اختر عيادة لعرض الاستمارة اليومية."
            : "اختر مركزًا (للسوبر آدمن) وتأكد من وجود عيادات لعرض الجدول."}
        </p>
      )}
    </div>
  );
}
