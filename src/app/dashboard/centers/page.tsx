import { requireAuth } from "@/lib/auth";
import { createCenterWithManager, deleteCenter } from "@/app/dashboard/actions";
import { getCachedCentersFull } from "@/lib/cached-queries";
import { DeleteConfirmForm } from "@/components/delete-confirm-form";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CentersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireAuth();
  const params = await Promise.resolve(searchParams);
  const error = asSingle(params.error);
  const success = asSingle(params.success);

  const centers = await getCachedCentersFull();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">إدارة المراكز الطبية</h2>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-sy-green-200 bg-sy-green-50 px-4 py-3 text-sm text-sy-green-700">
          {success}
        </div>
      ) : null}

      {profile.role === "super_admin" ? (
        <form action={createCenterWithManager} className="surface-card space-y-4 p-4 md:p-5">
          <h3 className="mb-4 text-lg font-semibold text-slate-700">إضافة مركز جديد</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="centerName" required placeholder="اسم المركز" className="field-input" />
            <input name="address" placeholder="العنوان" className="field-input" />
            <input name="phone" placeholder="الهاتف" className="field-input" />
            <input name="email" type="email" placeholder="بريد المركز" className="field-input" />
            <input name="managerName" required placeholder="اسم مدير المركز" className="field-input" />
            <input name="managerEmail" required type="email" placeholder="بريد المدير" className="field-input" />
            <input name="managerPassword" required type="password" placeholder="كلمة مرور المدير" className="field-input" />
          </div>
          <button type="submit" className="btn-primary">
            إنشاء المركز والحساب الرئيسي
          </button>
        </form>
      ) : null}

      <div className="table-shell">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">المركز</th>
              <th className="px-3 py-2">العنوان</th>
              <th className="px-3 py-2">الهاتف</th>
              <th className="px-3 py-2">البريد</th>
              {profile.role === "super_admin" ? (
                <th className="px-3 py-2">إجراءات</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {(centers ?? []).map((center) => (
              <tr key={center.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{center.name}</td>
                <td className="px-3 py-2">{center.address ?? "-"}</td>
                <td className="px-3 py-2">{center.phone ?? "-"}</td>
                <td className="px-3 py-2">{center.email ?? "-"}</td>
                {profile.role === "super_admin" ? (
                  <td className="px-3 py-2">
                    <DeleteConfirmForm
                      action={deleteCenter}
                      idFieldName="centerId"
                      entityId={center.id}
                      entityName={center.name}
                      confirmMessage={
                        "هل أنت متأكد من حذف المركز «{name}»؟\n\nسيتم حذف جميع العيادات والإدخالات اليومية والتقارير المرتبطة به. هذا الإجراء نهائي."
                      }
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
