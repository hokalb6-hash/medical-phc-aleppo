import { unstable_cache } from "next/cache";
import { DAILY_FIELDS, MONTHS_AR } from "@/lib/constants";
import { sumDailyEntryFields } from "@/lib/daily-entry-aggregate";
import { createAdminClient } from "@/lib/supabase/admin";

export type CenterRow = { id: string; name: string };

export type CenterFullRow = CenterRow & {
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export type ClinicRow = {
  id: string;
  name: string;
  center_id: string;
  clinic_type?: string;
  medical_centers?: { name: string } | { name: string }[] | null;
};

export type SuperChartsPayload = {
  monthLabel: string;
  year: number;
  centerBars: { name: string; value: number }[];
  yearLine: { label: string; value: number; month?: number }[];
  topFieldSlices: { name: string; value: number }[];
};

async function fetchCentersList(): Promise<CenterRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("medical_centers").select("id, name").order("name");
  return data ?? [];
}

async function fetchCentersFull(): Promise<CenterFullRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("medical_centers")
    .select("id, name, address, phone, email, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function fetchAllClinics(): Promise<ClinicRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clinics")
    .select("id, name, center_id, clinic_type, medical_centers(name)")
    .order("name");
  return data ?? [];
}

async function fetchClinicsByCenter(centerId: string): Promise<ClinicRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clinics")
    .select("id, name, center_id, clinic_type, medical_centers(name)")
    .eq("center_id", centerId)
    .order("name");
  return data ?? [];
}

async function fetchClinicsByCenterSimple(centerId: string): Promise<{ id: string; name: string; center_id: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clinics")
    .select("id, name, center_id")
    .eq("center_id", centerId)
    .order("name");
  return data ?? [];
}

export function getCachedCentersList() {
  return unstable_cache(fetchCentersList, ["medical-centers-list"], {
    revalidate: 120,
    tags: ["medical-centers-list"],
  })();
}

export function getCachedCentersFull() {
  return unstable_cache(fetchCentersFull, ["medical-centers-full"], {
    revalidate: 120,
    tags: ["medical-centers-list"],
  })();
}

export function getCachedAllClinics() {
  return unstable_cache(fetchAllClinics, ["clinics-list-all"], {
    revalidate: 90,
    tags: ["clinics-list-all"],
  })();
}

export function getCachedClinicsByCenter(centerId: string) {
  return unstable_cache(
    () => fetchClinicsByCenter(centerId),
    ["clinics-list", centerId],
    {
      revalidate: 90,
      tags: ["clinics-list-all", `clinics-list-${centerId}`],
    },
  )();
}

export function getCachedClinicsByCenterSimple(centerId: string) {
  return unstable_cache(
    () => fetchClinicsByCenterSimple(centerId),
    ["clinics-list-simple", centerId],
    {
      revalidate: 90,
      tags: ["clinics-list-all", `clinics-list-${centerId}`],
    },
  )();
}

async function buildSuperChartsPayload(year: number, month: number): Promise<SuperChartsPayload> {
  const admin = createAdminClient();

  const [centers, monthEntriesRes, yearEntriesRes] = await Promise.all([
    fetchCentersList(),
    admin
      .from("daily_entries")
      .select("center_id, data")
      .eq("year", year)
      .eq("month", month),
    admin.from("daily_entries").select("month, data").eq("year", year),
  ]);

  const monthEntries = monthEntriesRes.data ?? [];
  const yearEntries = yearEntriesRes.data ?? [];

  const centerBars = centers
    .map((c) => {
      let value = 0;
      for (const e of monthEntries) {
        if (e.center_id !== c.id) continue;
        value += sumDailyEntryFields(e.data as Record<string, unknown>);
      }
      return { name: c.name, value };
    })
    .sort((a, b) => b.value - a.value);

  const yearLine = MONTHS_AR.map((label, i) => {
    const monthNum = i + 1;
    let value = 0;
    for (const e of yearEntries) {
      if (Number(e.month) !== monthNum) continue;
      value += sumDailyEntryFields(e.data as Record<string, unknown>);
    }
    return { label, value, month: monthNum };
  });

  const fieldTotals = new Map<string, number>();
  for (const f of DAILY_FIELDS) fieldTotals.set(f.key, 0);
  for (const e of monthEntries) {
    const d = (e.data ?? {}) as Record<string, unknown>;
    for (const f of DAILY_FIELDS) {
      fieldTotals.set(f.key, (fieldTotals.get(f.key) ?? 0) + (Number(d[f.key]) || 0));
    }
  }

  const topFieldSlices = [...fieldTotals.entries()]
    .map(([key, value]) => ({
      name: DAILY_FIELDS.find((f) => f.key === key)?.label ?? key,
      value,
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return {
    monthLabel: `${MONTHS_AR[month - 1]} ${year}`,
    year,
    centerBars,
    yearLine,
    topFieldSlices,
  };
}

export function getCachedSuperChartsPayload(year: number, month: number) {
  return unstable_cache(
    () => buildSuperChartsPayload(year, month),
    ["super-charts", String(year), String(month)],
    {
      revalidate: 45,
      tags: [`super-charts-${year}`, `super-charts-${year}-${month}`],
    },
  )();
}

export type DailyMonitorEntry = {
  id: string;
  entry_date: string;
  month: number;
  year: number;
  data: Record<string, number>;
  created_at: string;
  clinic_name: string;
  center_name: string;
};

function getRelationName(relation: { name: string } | { name: string }[] | null): string {
  if (!relation) return "-";
  return Array.isArray(relation) ? (relation[0]?.name ?? "-") : relation.name;
}

async function fetchDailyMonitorEntries(filters: {
  centerId: string;
  entryDate: string;
  month: number;
  year: number;
}): Promise<DailyMonitorEntry[]> {
  const admin = createAdminClient();
  let query = admin
    .from("daily_entries")
    .select(
      "id, entry_date, month, year, data, created_at, clinics(name), medical_centers(name)",
    )
    .order("entry_date", { ascending: false })
    .limit(200);

  if (filters.centerId) query = query.eq("center_id", filters.centerId);
  if (filters.entryDate) {
    query = query.eq("entry_date", filters.entryDate);
  } else {
    query = query.eq("month", filters.month).eq("year", filters.year);
  }

  const { data } = await query;
  return (data ?? []).map((entry) => ({
    id: entry.id,
    entry_date: entry.entry_date,
    month: entry.month,
    year: entry.year,
    data: (entry.data ?? {}) as Record<string, number>,
    created_at: entry.created_at,
    clinic_name: getRelationName(entry.clinics),
    center_name: getRelationName(entry.medical_centers),
  }));
}

export function getCachedDailyMonitorEntries(filters: {
  centerId: string;
  entryDate: string;
  month: number;
  year: number;
}) {
  const cacheKey = [
    "daily-monitor",
    filters.centerId || "all",
    filters.entryDate || `m${filters.month}-y${filters.year}`,
  ].join(":");

  return unstable_cache(
    () => fetchDailyMonitorEntries(filters),
    [cacheKey],
    {
      revalidate: 25,
      tags: ["daily-monitor", cacheKey],
    },
  )();
}
