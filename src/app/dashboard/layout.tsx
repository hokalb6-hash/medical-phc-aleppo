import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import { ROLE_LABELS_AR } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  const navItems = [
    { href: "/dashboard", label: "لوحة التحكم" },
    { href: "/dashboard/centers", label: "المراكز" },
    { href: "/dashboard/clinics", label: "العيادات" },
    { href: "/dashboard/daily-entry", label: "الإدخال اليومي" },
    { href: "/dashboard/owner-daily", label: "استمارة يومية (أصحاب المراكز)" },
    { href: "/dashboard/owner-monthly", label: "استمارة شهرية (أصحاب المراكز)" },
    {
      href: "/dashboard/reports",
      label: profile.role === "center_manager" ? "تقارير العيادات" : "التقارير",
    },
  ];

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="surface-card mb-6 px-5 py-4 md:px-6 md:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white ring-2 ring-amber-200/70 shadow-sm">
              <img
                src="/aleppo-eagle.png"
                alt="شعار النظام"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 md:text-xl">
              نظام إدارة المراكز الطبية
              </h1>
              <p className="text-sm text-slate-600">
                {profile.full_name} — {ROLE_LABELS_AR[profile.role]}
              </p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              تسجيل خروج
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[250px_1fr] lg:gap-5">
        <aside className="surface-card sticky top-4 h-fit p-3 md:top-6 md:p-4">
          <DashboardNav items={navItems} />
        </aside>

        <section className="surface-card content-auto p-5 md:p-6">{children}</section>
      </div>
    </div>
  );
}
