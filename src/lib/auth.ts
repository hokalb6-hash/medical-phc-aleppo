import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/supabase/types";

export const getCurrentUserProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Prefer user-scoped query (RLS) to avoid service-role overhead on every request.
  // Fallback to admin client only if policies block this read.
  const { data: rlsData, error: rlsError } = await supabase
    .from("profiles")
    .select("id, full_name, role, center_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!rlsError && rlsData) return rlsData;

  const admin = createAdminClient();
  const { data: adminData, error: adminError } = await admin
    .from("profiles")
    .select("id, full_name, role, center_id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !adminData) return null;
  return adminData;
});

export const requireAuth = cache(async () => {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  return profile;
});
