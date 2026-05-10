import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();
  if (profile) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />
      <div className="login-grid-overlay" />

      <div className="login-shell relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/10 bg-slate-900/60 shadow-2xl backdrop-blur-lg lg:grid-cols-2">
        <section className="hidden p-8 text-white lg:block lg:p-10">
          <div className="login-chip mb-6">منصة الرعاية الصحية - حلب</div>
          <h1 className="text-3xl font-extrabold leading-tight">
            إدارة ذكية للمراكز والعيادات
          </h1>
          <p className="mt-4 max-w-md text-sm text-slate-200/90">
            تجربة احترافية لإدخال البيانات اليومية والشهرية، متابعة الأداء، وإخراج
            التقارير بدقة ووضوح.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="login-stat-card">
              <p className="text-xs text-slate-300">الأمان</p>
              <p className="mt-1 text-base font-bold">صلاحيات متعددة المستويات</p>
            </div>
            <div className="login-stat-card">
              <p className="text-xs text-slate-300">التقارير</p>
              <p className="mt-1 text-base font-bold">تصفية وتصدير CSV</p>
            </div>
            <div className="login-stat-card">
              <p className="text-xs text-slate-300">الإدخال</p>
              <p className="mt-1 text-base font-bold">نماذج يومية وشهرية</p>
            </div>
            <div className="login-stat-card">
              <p className="text-xs text-slate-300">الأداء</p>
              <p className="mt-1 text-base font-bold">واجهة سريعة ومنظمة</p>
            </div>
          </div>
        </section>

        <section className="p-5 md:p-8">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
