"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form
      action={action}
      className="surface-card w-full max-w-md p-8 md:p-9"
    >
      <h1 className="mb-6 text-2xl font-bold text-slate-800">
        تسجيل الدخول للنظام
      </h1>

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
        className="w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "جاري الدخول..." : "دخول"}
      </button>
    </form>
  );
}
