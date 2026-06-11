import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
type DashboardCounts = {
  centers: number;
  clinics: number;
  users: number;
  reports: number;
};

async function fetchDashboardCounts(centerId?: string): Promise<DashboardCounts> {
  const admin = createAdminClient();

  const [centersRes, clinicsRes, usersRes, reportsRes] = await Promise.all([
    centerId
      ? admin
          .from("medical_centers")
          .select("id", { count: "exact", head: true })
          .eq("id", centerId)
      : admin.from("medical_centers").select("id", { count: "exact", head: true }),
    centerId
      ? admin
          .from("clinics")
          .select("id", { count: "exact", head: true })
          .eq("center_id", centerId)
      : admin.from("clinics").select("id", { count: "exact", head: true }),
    centerId
      ? admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("center_id", centerId)
      : admin.from("profiles").select("id", { count: "exact", head: true }),
    centerId
      ? admin
          .from("monthly_reports")
          .select("id", { count: "exact", head: true })
          .eq("center_id", centerId)
      : admin.from("monthly_reports").select("id", { count: "exact", head: true }),
  ]);

  return {
    centers: centersRes.count ?? 0,
    clinics: clinicsRes.count ?? 0,
    users: usersRes.count ?? 0,
    reports: reportsRes.count ?? 0,
  };
}

export async function DashboardCounts({ centerFilter }: { centerFilter?: string }) {
  const getCounts = unstable_cache(
    async () => fetchDashboardCounts(centerFilter),
    ["dashboard-counts", centerFilter ?? "all"],
    {
      revalidate: 30,
      tags: ["dashboard-counts-all", `dashboard-counts-${centerFilter ?? "all"}`],
    },
  );
  const counts = await getCounts();

  const cards = [
    { label: "عدد المراكز", value: counts.centers },
    { label: "عدد العيادات", value: counts.clinics },
    { label: "عدد المستخدمين", value: counts.users },
    { label: "عدد التقارير الشهرية", value: counts.reports },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="surface-card p-4">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-2 text-3xl font-bold text-sy-green-800">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
