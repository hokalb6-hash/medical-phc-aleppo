import { DAILY_FIELDS, MONTHS_AR } from "@/lib/constants";

export const DAILY_ENTRY_CSV_META = [
  {
    key: "entry_date",
    label: "التاريخ",
    aliases: ["entry_date", "date", "التاريخ"],
  },
  {
    key: "center_name",
    label: "اسم المركز",
    aliases: [
      "center_name",
      "اسم المركز",
      "المركز",
      "clinic_name",
      "اسم العيادة",
      "العيادة",
    ],
  },
  {
    key: "clinic_id",
    label: "معرف العيادة",
    aliases: ["clinic_id", "معرف العيادة"],
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

export type DailyEntryCsvColumnMap = {
  dateIdx: number;
  clinicIdIdx: number;
  centerNameIdx: number;
  monthIdx: number;
  yearIdx: number;
  fieldIndexes: { key: string; index: number }[];
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeEntityName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^مركز\s+/u, "")
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ة/gu, "ه");
}

export function detectCsvDelimiter(line: string): "," | ";" | "\t" {
  let comma = 0;
  let semi = 0;
  let tab = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (char === ",") comma += 1;
    else if (char === ";") semi += 1;
    else if (char === "\t") tab += 1;
  }

  if (semi > comma && semi >= tab) return ";";
  if (tab > comma && tab >= semi) return "\t";
  return ",";
}

export function parseCsvRows(content: string, delimiter = detectCsvDelimiter(content)): string[][] {
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

    if (char === delimiter && !inQuotes) {
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

function findHeaderIndex(headers: string[], aliases: readonly string[]) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(normalizeHeader(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function dailyEntryCsvHeaders(includeClinicId = false): string[] {
  const meta = includeClinicId
    ? DAILY_ENTRY_CSV_META
    : DAILY_ENTRY_CSV_META.filter((col) => col.key !== "clinic_id");
  return [...meta.map((col) => col.label), ...DAILY_FIELDS.map((field) => field.label)];
}

export function buildDailyEntryCsvSampleRows(options: {
  centerName: string;
  date?: string;
}): string[][] {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const parts = parseEntryDateParts(date);
  const month = parts?.month ?? new Date().getMonth() + 1;
  const year = parts?.year ?? new Date().getFullYear();
  const centerName = options.centerName.trim() || "اسم المركز كما في النظام";

  return [
    [
      date,
      centerName,
      String(month),
      String(year),
      ...DAILY_FIELDS.map(() => "0"),
    ],
  ];
}

export function resolveDailyEntryCsvColumns(headerRow: string[]): DailyEntryCsvColumnMap {
  const dateIdx = findHeaderIndex(
    headerRow,
    DAILY_ENTRY_CSV_META.find((col) => col.key === "entry_date")!.aliases,
  );
  const clinicIdIdx = findHeaderIndex(
    headerRow,
    DAILY_ENTRY_CSV_META.find((col) => col.key === "clinic_id")!.aliases,
  );
  const centerNameIdx = findHeaderIndex(
    headerRow,
    DAILY_ENTRY_CSV_META.find((col) => col.key === "center_name")!.aliases,
  );
  const monthIdx = findHeaderIndex(
    headerRow,
    DAILY_ENTRY_CSV_META.find((col) => col.key === "month")!.aliases,
  );
  const yearIdx = findHeaderIndex(
    headerRow,
    DAILY_ENTRY_CSV_META.find((col) => col.key === "year")!.aliases,
  );

  const fieldIndexes = DAILY_FIELDS.map((field) => ({
    key: field.key,
    index: findHeaderIndex(headerRow, [field.key, field.label]),
  }));

  return { dateIdx, clinicIdIdx, centerNameIdx, monthIdx, yearIdx, fieldIndexes };
}

function isValidDateParts(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function toIsoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseEntryDateParts(
  value: string,
): { year: number; month: number; day: number; iso: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidDateParts(year, month, day)) return null;
    return { year, month, day, iso: toIsoDate(year, month, day) };
  }

  const slashMatch = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const a = Number(slashMatch[1]);
    const b = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    // Prefer DD/MM/YYYY (as shown in the site date picker), fallback to MM/DD/YYYY.
    const dayFirst = isValidDateParts(year, b, a);
    const monthFirst = isValidDateParts(year, a, b);
    if (dayFirst && !monthFirst) {
      return { year, month: b, day: a, iso: toIsoDate(year, b, a) };
    }
    if (monthFirst && !dayFirst) {
      return { year, month: a, day: b, iso: toIsoDate(year, a, b) };
    }
    if (dayFirst) {
      return { year, month: b, day: a, iso: toIsoDate(year, b, a) };
    }
    return null;
  }

  return null;
}

export function parseMonthValue(value: string | undefined, fallback: number) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;

  const numeric = Number(trimmed);
  if (numeric >= 1 && numeric <= 12) return numeric;

  const normalized = normalizeHeader(trimmed);
  const monthIndex = MONTHS_AR.findIndex(
    (month) => normalizeHeader(month) === normalized,
  );
  if (monthIndex >= 0) return monthIndex + 1;

  return fallback;
}

export function resolveClinicIdForImportRow(options: {
  rowName: string;
  clinicIdFromColumn: string;
  clinicByName: Map<string, string>;
  centerNameNormalized: string;
  defaultClinicId: string;
  allowCenterFallback: boolean;
}) {
  const {
    rowName,
    clinicIdFromColumn,
    clinicByName,
    centerNameNormalized,
    defaultClinicId,
    allowCenterFallback,
  } = options;

  if (clinicIdFromColumn) return clinicIdFromColumn;

  const normalizedRowName = normalizeEntityName(rowName);
  if (normalizedRowName) {
    const clinicMatch = clinicByName.get(normalizedRowName);
    if (clinicMatch) return clinicMatch;
    if (
      centerNameNormalized &&
      (normalizedRowName === centerNameNormalized ||
        normalizeEntityName(centerNameNormalized) === normalizedRowName)
    ) {
      return defaultClinicId;
    }
  }

  if (allowCenterFallback && defaultClinicId) {
    return defaultClinicId;
  }

  return "";
}

export function csvEscape(value: string | number | null | undefined) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildDailyEntryCsvContent(sampleRows: string[][]) {
  const headers = dailyEntryCsvHeaders();
  const lines = [
    headers.map(csvEscape).join(","),
    ...sampleRows.map((row) => row.map(csvEscape).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
