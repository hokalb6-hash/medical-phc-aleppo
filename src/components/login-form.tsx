"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

export function LoginForm() {
  const [logoFailed, setLogoFailed] = useState(false);
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form
      action={action}
      className="surface-card login-card animate-fade-up w-full max-w-md p-8 md:p-9"
    >
      <div className="mb-5 flex justify-center">
        <div className="login-logo-shell">
          {!logoFailed ? (
            // ضع ملف اللوغو في public باسم aleppo-eagle.png
            <img
              src="/aleppo-eagle.png"
              alt="شعار النظام"
              className="h-16 w-16 object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-sm font-bold tracking-wide text-amber-200">
              MED
            </span>
          )}
        </div>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold text-slate-800">تسجيل الدخول</h1>
      <p className="mb-6 text-center text-sm text-slate-500">
        ادخل بيانات حسابك للوصول إلى لوحة التحكم
      </p>

      <label className="mb-2 block text-sm font-medium text-slate-700">
        البريد الإلكتروني
      </label>
      <input
        name="email"
        type="email"
        required
        className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder="manager@center.com"
      />

      <label className="mb-2 block text-sm font-medium text-slate-700">
        كلمة المرور
      </label>
      <input
        name="password"
        type="password"
        required
        className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder="********"
      />

      {state.error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="login-submit-btn h-10 w-full rounded-xl px-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        <span className="login-submit-inner">
          {pending ? <span className="login-spinner" aria-hidden="true" /> : null}
          <span>{pending ? "جاري الدخول..." : "دخول"}</span>
        </span>
      </button>
    </form>
  );
}
