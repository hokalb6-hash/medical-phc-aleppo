import { requireAuth } from "@/lib/auth";
import { createClinic } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClinicsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const params = await Promise.resolve(searchParams);
  const error = asSingle(params.error);
  const success = asSingle(params.success);

  const centerId = profile.role === "super_admin" ? null : profile.center_id;

  const centersPromise =
    profile.role === "super_admin"
      ? supabase.from("medical_centers").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] });

  const clinicsQuery = centerId
    ? supabase
        .from("clinics")
        .select("id, name, clinic_type, medical_centers(name)")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false })
    : supabase
        .from("clinics")
        .select("id, name, clinic_type, medical_centers(name)")
        .order("created_at", { ascending: false });

  const [{ data: centers }, { data: clinics }] = await Promise.all([
    centersPromise,
    clinicsQuery,
  ]);

  function getCenterName(
    relation: { name: string } | { name: string }[] | null,
  ): string {
    if (!relation) return "-";
    return Array.isArray(relation) ? relation[0]?.name ?? "-" : relation.name;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">إدارة العيادات</h2>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {profile.role !== "center_user" ? (
        <form action={createClinic} className="surface-card space-y-4 p-4 md:p-5">
          <h3 className="mb-4 text-lg font-semibold text-slate-700">إضافة عيادة</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {profile.role === "super_admin" ? (
              <select name="centerId" required className="field-select">
                <option value="">اختر المركز</option>
                {(centers ?? []).map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            ) : null}
            <input name="name" required placeholder="اسم العيادة" className="field-input" />
            <input name="clinicType" required placeholder="نوع العيادة (نسائية، أسنان...)" className="field-input" />
          </div>
          <button type="submit" className="btn-primary">
            حفظ العيادة
          </button>
        </form>
      ) : null}

      <div className="table-shell">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">اسم العيادة</th>
              <th className="px-3 py-2">النوع</th>
              <th className="px-3 py-2">المركز</th>
            </tr>
          </thead>
          <tbody>
            {(clinics ?? []).map((clinic) => (
              <tr key={clinic.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{clinic.name}</td>
                <td className="px-3 py-2">{clinic.clinic_type}</td>
                <td className="px-3 py-2">{getCenterName(clinic.medical_centers)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
