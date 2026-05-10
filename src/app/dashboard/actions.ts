"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DAILY_FIELDS } from "@/lib/constants";

const createCenterSchema = z.object({
  centerName: z.string().min(3, "اسم المركز مطلوب"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("بريد المركز غير صحيح").optional().or(z.literal("")),
  managerName: z.string().min(3, "اسم مدير المركز مطلوب"),
  managerEmail: z.string().email("بريد المدير غير صحيح"),
  managerPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current.trim());
      current = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell !== "")) rows.push(row);
  }

  return rows;
}

export async function createCenterWithManager(formData: FormData) {
  const actor = await requireAuth();
  if (actor.role !== "super_admin") {
    redirect(
      `/dashboard/centers?error=${encodeURIComponent("غير مصرح")}`,
    );
  }

  const parsed = createCenterSchema.safeParse({
    centerName: formData.get("centerName"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    managerName: formData.get("managerName"),
    managerEmail: formData.get("managerEmail"),
    managerPassword: formData.get("managerPassword"),
  });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "البيانات غير مكتملة.";
    redirect(`/dashboard/centers?error=${encodeURIComponent(firstIssue)}`);
  }
  const payload = parsed.data;

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: center, error: centerError } = await supabase
    .from("medical_centers")
    .insert({
      name: payload.centerName,
      address: payload.address || null,
      phone: payload.phone || null,
      email: payload.email || null,
    })
    .select("id")
    .single();

  if (centerError || !center) {
    const msg = centerError?.message ?? "فشل إنشاء المركز.";
    redirect(`/dashboard/centers?error=${encodeURIComponent(msg)}`);
  }

  const { data: managerUser, error: managerError } =
    await admin.auth.admin.createUser({
      email: payload.managerEmail,
      password: payload.managerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.managerName,
      },
    });

  if (managerError || !managerUser.user) {
    const msg = managerError?.message ?? "فشل إنشاء حساب المدير.";
    redirect(`/dashboard/centers?error=${encodeURIComponent(msg)}`);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: managerUser.user.id,
    full_name: payload.managerName,
    role: "center_manager",
    center_id: center.id,
  });

  if (profileError) {
    redirect(`/dashboard/centers?error=${encodeURIComponent(profileError.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/centers");
  revalidateTag("dashboard-counts-all", "max");
  redirect(
    `/dashboard/centers?success=${encodeURIComponent(
      "تم إنشاء المركز والمدير بنجاح",
    )}`,
  );
}

const createClinicSchema = z.object({
  name: z.string().min(2, "اسم العيادة مطلوب"),
  clinicType: z.string().min(2, "نوع العيادة مطلوب"),
});

export async function createClinic(formData: FormData) {
  const actor = await requireAuth();
  if (actor.role === "center_user") {
    redirect(`/dashboard/clinics?error=${encodeURIComponent("غير مصرح")}`);
  }
  if (actor.role !== "super_admin" && !actor.center_id) {
    redirect(`/dashboard/clinics?error=${encodeURIComponent("المركز غير محدد")}`);
  }

  const parsed = createClinicSchema.safeParse({
    name: formData.get("name"),
    clinicType: formData.get("clinicType"),
  });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "البيانات غير مكتملة.";
    redirect(`/dashboard/clinics?error=${encodeURIComponent(firstIssue)}`);
  }
  const payload = parsed.data;

  const supabase = await createClient();
  const centerId =
    actor.role === "super_admin"
      ? String(formData.get("centerId"))
      : actor.center_id;
  if (!centerId) {
    redirect(`/dashboard/clinics?error=${encodeURIComponent("اختر المركز أولاً")}`);
  }

  const { error } = await supabase.from("clinics").insert({
    center_id: centerId,
    name: payload.name,
    clinic_type: payload.clinicType,
  });

  if (error) {
    redirect(`/dashboard/clinics?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/clinics");
  revalidateTag("dashboard-counts-all", "max");
  revalidateTag(`dashboard-counts-${centerId}`, "max");
  revalidateTag("owner-daily-clinics", "max");
  revalidateTag(`owner-daily-clinics-${centerId}`, "max");
  redirect(`/dashboard/clinics?success=${encodeURIComponent("تم حفظ العيادة بنجاح")}`);
}

export async function saveDailyEntry(formData: FormData) {
  const actor = await requireAuth();
  if (!actor.center_id && actor.role !== "super_admin") {
    redirect(`/dashboard/daily-entry?error=${encodeURIComponent("غير مصرح")}`);
  }

  const supabase = await createClient();
  const centerId =
    actor.role === "super_admin"
      ? String(formData.get("centerId"))
      : actor.center_id!;
  let clinicId = String(formData.get("clinicId") ?? "");
  const entryDate = String(formData.get("entryDate"));
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  if (!clinicId) {
    const { data: fallbackClinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("center_id", centerId)
      .order("name")
      .limit(1)
      .maybeSingle();
    clinicId = fallbackClinic?.id ?? "";
  }
  const resultParams = new URLSearchParams({
    entryDate,
    month: String(month),
    year: String(year),
  });
  if (!clinicId) {
    redirect(
      `/dashboard/daily-entry?${resultParams.toString()}&error=${encodeURIComponent("لا توجد عيادة مرتبطة بالمركز")}`,
    );
  }

  const payload: Record<string, number> = {};

  formData.forEach((value, key) => {
    if (key.startsWith("field_")) {
      const normalized = key.replace("field_", "");
      payload[normalized] = Number(value) || 0;
    }
  });

  const { error } = await supabase.from("daily_entries").upsert(
    {
      center_id: centerId,
      clinic_id: clinicId,
      entry_date: entryDate,
      month,
      year,
      data: payload,
      created_by: actor.id,
    },
    { onConflict: "center_id,clinic_id,entry_date" },
  );

  if (error) {
    redirect(
      `/dashboard/daily-entry?${resultParams.toString()}&error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard/daily-entry");
  revalidatePath("/dashboard/reports");
  revalidateTag("dashboard-counts-all", "max");
  revalidateTag(`dashboard-counts-${centerId}`, "max");
  redirect(
    `/dashboard/daily-entry?${resultParams.toString()}&success=${encodeURIComponent("تم حفظ البيانات ويمكنك تعديلها مباشرة")}`,
  );
}

export async function importDailyEntryCsv(formData: FormData) {
  const actor = await requireAuth();
  if (!actor.center_id && actor.role !== "super_admin") {
    redirect(`/dashboard/daily-entry?error=${encodeURIComponent("غير مصرح")}`);
  }

  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    redirect(
      `/dashboard/daily-entry?error=${encodeURIComponent("اختر ملف CSV صالح")}`,
    );
  }

  const centerId =
    actor.role === "super_admin"
      ? String(formData.get("centerId"))
      : actor.center_id!;
  if (!centerId) {
    redirect(
      `/dashboard/daily-entry?error=${encodeURIComponent("اختر المركز أولاً")}`,
    );
  }

  const text = (await file.text()).replace(/^\uFEFF/, "");
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    redirect(
      `/dashboard/daily-entry?error=${encodeURIComponent("ملف CSV فارغ أو بدون بيانات")}`,
    );
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const getIndex = (name: string) => headers.indexOf(name.toLowerCase());

  const dateIdx = getIndex("entry_date");
  const clinicIdIdx = getIndex("clinic_id");
  const clinicNameIdx = getIndex("clinic_name");
  const monthIdx = getIndex("month");
  const yearIdx = getIndex("year");

  if (dateIdx < 0 || (clinicIdIdx < 0 && clinicNameIdx < 0)) {
    redirect(
      `/dashboard/daily-entry?error=${encodeURIComponent(
        "الأعمدة المطلوبة: entry_date و clinic_id أو clinic_name",
      )}`,
    );
  }

  const supabase = await createClient();
  const { data: clinics } = await supabase
    .from("clinics")
    .select("id, name")
    .eq("center_id", centerId);

  const clinicByName = new Map<string, string>(
    (clinics ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]),
  );

  const fieldIndexes = DAILY_FIELDS.map((field) => ({
    key: field.key,
    index: getIndex(field.key),
  }));

  const upsertRows: {
    center_id: string;
    clinic_id: string;
    entry_date: string;
    month: number;
    year: number;
    data: Record<string, number>;
    created_by: string;
  }[] = [];

  let skipped = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const entryDate = row[dateIdx];
    if (!entryDate) {
      skipped += 1;
      continue;
    }

    let clinicId = clinicIdIdx >= 0 ? row[clinicIdIdx] : "";
    if (!clinicId && clinicNameIdx >= 0) {
      clinicId =
        clinicByName.get((row[clinicNameIdx] ?? "").trim().toLowerCase()) ?? "";
    }
    if (!clinicId) {
      skipped += 1;
      continue;
    }

    const dateObj = new Date(entryDate);
    if (Number.isNaN(dateObj.getTime())) {
      skipped += 1;
      continue;
    }

    const month = monthIdx >= 0 ? Number(row[monthIdx]) || dateObj.getMonth() + 1 : dateObj.getMonth() + 1;
    const year = yearIdx >= 0 ? Number(row[yearIdx]) || dateObj.getFullYear() : dateObj.getFullYear();

    const data: Record<string, number> = {};
    fieldIndexes.forEach(({ key, index }) => {
      data[key] = index >= 0 ? Number(row[index]) || 0 : 0;
    });

    upsertRows.push({
      center_id: centerId,
      clinic_id: clinicId,
      entry_date: entryDate,
      month,
      year,
      data,
      created_by: actor.id,
    });
  }

  if (upsertRows.length === 0) {
    redirect(
      `/dashboard/daily-entry?error=${encodeURIComponent("لم يتم استيراد أي صف. تحقق من تنسيق الملف")}`,
    );
  }

  const { error } = await supabase.from("daily_entries").upsert(upsertRows, {
    onConflict: "center_id,clinic_id,entry_date",
  });

  if (error) {
    redirect(`/dashboard/daily-entry?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/daily-entry");
  revalidatePath("/dashboard/reports");
  revalidateTag("dashboard-counts-all", "max");
  revalidateTag(`dashboard-counts-${centerId}`, "max");

  const successMessage =
    skipped > 0
      ? `تم استيراد ${upsertRows.length} صف وتخطي ${skipped} صف`
      : `تم استيراد ${upsertRows.length} صف بنجاح`;
  redirect(
    `/dashboard/daily-entry?success=${encodeURIComponent(successMessage)}`,
  );
}

export async function upsertMonthlyCell(formData: FormData) {
  const actor = await requireAuth();
  if (actor.role === "center_user") {
    throw new Error("غير مصرح.");
  }

  const supabase = await createClient();
  const reportId = String(formData.get("reportId"));
  const reportDate = String(formData.get("reportDate"));
  const doctorName = String(formData.get("doctorName") ?? "");
  const patientCount = Number(formData.get("patientCount") ?? 0);
  const notes = String(formData.get("notes") ?? "");

  const { error } = await supabase.from("monthly_report_cells").upsert(
    {
      report_id: reportId,
      report_date: reportDate,
      doctor_name: doctorName || null,
      patient_count: patientCount,
      notes: notes || null,
      created_by: actor.id,
    },
    { onConflict: "report_id,report_date" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/reports");
}

export async function ensureMonthlyReport(formData: FormData) {
  const actor = await requireAuth();
  if (actor.role === "center_user") {
    throw new Error("غير مصرح.");
  }

  const supabase = await createClient();
  const clinicId = String(formData.get("clinicId"));
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const centerId =
    actor.role === "super_admin"
      ? String(formData.get("centerId"))
      : actor.center_id!;

  const { error } = await supabase.from("monthly_reports").upsert(
    {
      center_id: centerId,
      clinic_id: clinicId,
      month,
      year,
    },
    { onConflict: "center_id,clinic_id,month,year" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/reports");
}

export async function saveOwnerDailyClinicSheet(formData: FormData) {
  const actor = await requireAuth();
  if (actor.role !== "center_manager") {
    throw new Error("غير مصرح.");
  }
  if (!actor.center_id) {
    throw new Error("غير مصرح.");
  }

  const supabase = await createClient();
  const centerId = actor.center_id;
  const month = Number(formData.get("month")) || new Date().getMonth() + 1;
  const year = Number(formData.get("year")) || new Date().getFullYear();
  const clinicId = String(formData.get("clinicId") ?? "");
  const resultParams = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (clinicId) {
    resultParams.set("clinicId", clinicId);
  }

  const rows: {
    center_id: string;
    clinic_id: string;
    entry_date: string;
    doctor_name: string | null;
    patient_count: number;
    created_by: string;
  }[] = [];

  formData.forEach((value, key) => {
    if (!key.startsWith("od_")) return;
    if (!key.endsWith("_count")) return;

    const parts = key.split("_");
    const clinicId = parts[1];
    const entryDate = parts[2];
    if (!clinicId || !entryDate) return;

    const doctorKey = `od_${clinicId}_${entryDate}_doctor`;
    const doctorValue = String(formData.get(doctorKey) ?? "").trim();
    const countValue = Number(value) || 0;

    rows.push({
      center_id: centerId,
      clinic_id: clinicId,
      entry_date: entryDate,
      doctor_name: doctorValue || null,
      patient_count: countValue,
      created_by: actor.id,
    });
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("owner_daily_clinic_sheet").upsert(rows, {
      onConflict: "center_id,clinic_id,entry_date",
    });

    if (error) {
      redirect(
        `/dashboard/owner-daily?${resultParams.toString()}&error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  revalidatePath("/dashboard/owner-daily");
  const parsed = new Date(rows[0]?.entry_date ?? "");
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    revalidateTag(`owner-daily-rows-${centerId}-${y}-${m}`, "max");
  }
  redirect(
    `/dashboard/owner-daily?${resultParams.toString()}&success=${encodeURIComponent("تم الحفظ وبقيت القيم ظاهرة للتعديل")}`,
  );
}

export async function saveOwnerMonthlySummarySheet(formData: FormData) {
  const actor = await requireAuth();
  if (actor.role !== "center_manager") {
    throw new Error("غير مصرح.");
  }

  const supabase = await createClient();
  const centerId = actor.center_id!;
  const year = Number(formData.get("year"));

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const rows = months.map((month) => {
    const metrics: Record<string, number> = {};

    DAILY_FIELDS.forEach((field) => {
      const key = `ms_${month}_${field.key}`;
      metrics[field.key] = Number(formData.get(key)) || 0;
    });

    const reviewersTotal = Number(formData.get(`ms_${month}_reviewers_total`)) || 0;

    return {
      center_id: centerId,
      year,
      month,
      metrics,
      reviewers_total: reviewersTotal,
      created_by: actor.id,
    };
  });

  const { error } = await supabase
    .from("owner_monthly_summary_sheet")
    .upsert(rows, { onConflict: "center_id,year,month" });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/owner-monthly");
}

export async function generateOwnerMonthlyFromDaily(formData: FormData) {
  const actor = await requireAuth();
  if (actor.role !== "center_manager") {
    throw new Error("غير مصرح.");
  }

  const supabase = await createClient();
  const centerId = actor.center_id!;
  const year = Number(formData.get("year"));
  const scope = String(formData.get("generationScope") ?? "year");
  const selectedMonth = Number(formData.get("generationMonth") ?? 1);
  const generationMode = String(formData.get("generationMode") ?? "overwrite");

  const monthsToGenerate =
    scope === "month" && selectedMonth >= 1 && selectedMonth <= 12
      ? [selectedMonth]
      : Array.from({ length: 12 }, (_, i) => i + 1);

  const rows: {
    center_id: string;
    year: number;
    month: number;
    metrics: Record<string, number>;
    reviewers_total: number;
    created_by: string;
  }[] = [];

  for (const month of monthsToGenerate) {
    const { data: dailyRows, error } = await supabase
      .from("daily_entries")
      .select("data")
      .eq("center_id", centerId)
      .eq("year", year)
      .eq("month", month);

    if (error) {
      throw new Error(error.message);
    }

    const metrics: Record<string, number> = {};
    DAILY_FIELDS.forEach((field) => {
      metrics[field.key] = 0;
    });

    (dailyRows ?? []).forEach((row) => {
      const payload = (row.data ?? {}) as Record<string, unknown>;
      DAILY_FIELDS.forEach((field) => {
        const value = payload[field.key];
        const num = typeof value === "number" ? value : Number(value) || 0;
        metrics[field.key] += num;
      });
    });

    let reviewersTotal = metrics.reproductive_reviewers ?? 0;

    if (generationMode === "append") {
      const { data: currentRow, error: currentError } = await supabase
        .from("owner_monthly_summary_sheet")
        .select("metrics, reviewers_total")
        .eq("center_id", centerId)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (currentError) {
        throw new Error(currentError.message);
      }

      const currentMetrics = (currentRow?.metrics ?? {}) as Record<string, unknown>;
      DAILY_FIELDS.forEach((field) => {
        const existing = currentMetrics[field.key];
        const existingNum =
          typeof existing === "number" ? existing : Number(existing) || 0;
        metrics[field.key] += existingNum;
      });

      reviewersTotal += currentRow?.reviewers_total ?? 0;
    }

    rows.push({
      center_id: centerId,
      year,
      month,
      metrics,
      reviewers_total: reviewersTotal,
      created_by: actor.id,
    });
  }

  const { error: upsertError } = await supabase
    .from("owner_monthly_summary_sheet")
    .upsert(rows, { onConflict: "center_id,year,month" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  revalidatePath("/dashboard/owner-monthly");
}
