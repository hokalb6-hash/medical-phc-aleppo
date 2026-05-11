import type { AppRole } from "@/lib/supabase/types";

export const ROLE_LABELS_AR: Record<AppRole, string> = {
  super_admin: "مسؤول النظام",
  center_manager: "مدير مركز",
  center_user: "مستخدم مركز",
};

export const MONTHS_AR = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
] as const;

export const DAILY_FIELDS = [
  { key: "chronic_diabetes", label: "السكري" },
  { key: "chronic_hypertension", label: "الضغط" },
  { key: "chronic_tuberculosis", label: "السل" },
  { key: "chronic_thalassemia", label: "الثلاسيميا" },
  { key: "chronic_psychological_support", label: "دعم نفسي" },
  { key: "chronic_gap", label: "راب فجوة" },
  { key: "nutrition_lab", label: "المخبر" },
  { key: "nutrition_chemistry_lab", label: "مخبر لاشمانيا" },
  { key: "nutrition_imci", label: "IMCI" },
  { key: "therapeutic_mam", label: "MAM" },
  { key: "therapeutic_sam", label: "SAM" },
  { key: "therapeutic_children_visits", label: "عدد الأطفال المترددين" },
  { key: "therapeutic_mother_care", label: "عناية حاملة" },
  { key: "therapeutic_fetal_health", label: "صحة جنينية" },
  { key: "therapeutic_energy", label: "لطاخة" },
  { key: "therapeutic_breast_exam", label: "فحص ثدي" },
  { key: "therapeutic_family_planning", label: "تنظيم أسرة" },
  { key: "therapeutic_pregnancy_care", label: "رعاية حامل" },
  { key: "reproductive_age_group", label: "السنبة" },
  { key: "reproductive_new_cases", label: "الجلدية" },
  { key: "reproductive_children", label: "الأطفال" },
  { key: "reproductive_internal", label: "الداخلية" },
  { key: "reproductive_companions", label: "المراهقين" },
  { key: "reproductive_cleaning", label: "التثقيف" },
  { key: "reproductive_emergency", label: "الإسعافية" },
  { key: "reproductive_elderly", label: "المسنين" },
  { key: "reproductive_pregnant_cases", label: "كراز حوامل" },
  { key: "reproductive_vaccine", label: "اللقاح" },
  { key: "reproductive_reviewers", label: "عدد المراجعين" },
] as const;
