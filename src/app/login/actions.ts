"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "الرجاء إدخال البريد وكلمة المرور." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "تم تسجيل الدخول لكن تعذر قراءة الجلسة. أعد المحاولة." };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    return {
      error: `تعذر التحقق من صلاحية الحساب: ${profileError.message}`,
    };
  }

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        "الحساب موجود في Auth لكنه غير مرتبط بجدول profiles بنفس UUID. تأكد من تطابق auth.users.id مع profiles.id.",
    };
  }

  redirect("/dashboard");
}
