import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { DashboardCounts } from "@/components/dashboard-counts";
import { DashboardCountsSkeleton } from "@/components/dashboard-skeleton";

export default async function DashboardPage() {
  const profile = await requireAuth();
  const centerFilter = profile.role === "super_admin" ? undefined : profile.center_id ?? undefined;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-800">لوحة التحكم</h2>
      <Suspense fallback={<DashboardCountsSkeleton />}>
        <DashboardCounts centerFilter={centerFilter} />
      </Suspense>
    </div>
  );
}
