import {
  csvEscape,
  normalizeEntityName,
  parseEntryDateParts,
  parseMonthValue,
} from "@/lib/daily-entry-csv";

export const OWNER_DAILY_CSV_META = [
  {
    key: "entry_date",
    label: "التاريخ",
    aliases: ["entry_date", "date", "التاريخ"],
  },
  {
    key: "clinic_name",
    label: "اسم العيادة",
    aliases: ["clinic_name", "اسم العيادة", "العيادة"],
  },
  {
    key: "clinic_id",
    label: "معرف العيادة",
    aliases: ["clinic_id", "معرف العيادة"],
  },
  {
    key: "doctor_name",
    label: "الطبيب",
    aliases: ["doctor_name", "doctor", "الطبيب", "اسم الطبيب"],
  },
  {
    key: "patient_count",
    label: "عدد المرضى",
    aliases: ["patient_count", "count", "عدد المرضى", "العدد", "عدد"],
  },
  {
    key: "month",
    label: "الشهر",
    aliases: ["month", "الشهر"],
  },
  {
    key: "year",
    label: "السنة",
    aliases: ["year", "السنة"],
  },
] as const;

export type OwnerDailyCsvColumnMap = {
  dateIdx: number;
  clinicIdIdx: number;
  clinicNameIdx: number;
  doctorIdx: number;
  countIdx: number;
  monthIdx: number;
  yearIdx: number;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findHeaderIndex(headers: string[], aliases: readonly string[]) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(normalizeHeader(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function ownerDailyCsvHeaders(includeClinicId = false): string[] {
  const meta = includeClinicId
    ? OWNER_DAILY_CSV_META
    : OWNER_DAILY_CSV_META.filter((col) => col.key !== "clinic_id");
  return meta.map((col) => col.label);
}

export function buildOwnerDailyCsvSampleRows(options: {
  clinics: { name: string }[];
  year: number;
  month: number;
}): string[][] {
  const date = `${options.year}-${String(options.month).padStart(2, "0")}-01`;

  if (options.clinics.length === 0) {
    return [["2026-06-01", "اسم العيادة كما في النظام", "د. مثال", "0", "6", "2026"]];
  }

  return options.clinics.map((clinic) => [
    date,
    clinic.name,
    "",
    "0",
    String(options.month),
    String(options.year),
  ]);
}

export function resolveOwnerDailyCsvColumns(headerRow: string[]): OwnerDailyCsvColumnMap {
  const dateIdx = findHeaderIndex(
    headerRow,
    OWNER_DAILY_CSV_META.find((col) => col.key === "entry_date")!.aliases,
  );
  const clinicIdIdx = findHeaderIndex(
    headerRow,
    OWNER_DAILY_CSV_META.find((col) => col.key === "clinic_id")!.aliases,
  );
  const clinicNameIdx = findHeaderIndex(
    headerRow,
    OWNER_DAILY_CSV_META.find((col) => col.key === "clinic_name")!.aliases,
  );
  const doctorIdx = findHeaderIndex(
    headerRow,
    OWNER_DAILY_CSV_META.find((col) => col.key === "doctor_name")!.aliases,
  );
  const countIdx = findHeaderIndex(
    headerRow,
    OWNER_DAILY_CSV_META.find((col) => col.key === "patient_count")!.aliases,
  );
  const monthIdx = findHeaderIndex(
    headerRow,
    OWNER_DAILY_CSV_META.find((col) => col.key === "month")!.aliases,
  );
  const yearIdx = findHeaderIndex(
    headerRow,
    OWNER_DAILY_CSV_META.find((col) => col.key === "year")!.aliases,
  );

  return { dateIdx, clinicIdIdx, clinicNameIdx, doctorIdx, countIdx, monthIdx, yearIdx };
}

export function resolveClinicIdForOwnerDailyRow(options: {
  rowClinicId: string;
  rowClinicName: string;
  clinicByName: Map<string, string>;
}) {
  if (options.rowClinicId) return options.rowClinicId;
  const normalized = normalizeEntityName(options.rowClinicName);
  if (!normalized) return "";
  return options.clinicByName.get(normalized) ?? "";
}

export function buildOwnerDailyCsvContent(sampleRows: string[][]) {
  const headers = ownerDailyCsvHeaders();
  const lines = [
    headers.map(csvEscape).join(","),
    ...sampleRows.map((row) => row.map(csvEscape).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export { parseEntryDateParts, parseMonthValue, normalizeEntityName };
