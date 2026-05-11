import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_FIELDS, MONTHS_AR } from "@/lib/constants";

const INVALID_SHEET_CHARS = /[[\]*?:/\\]/g;

function makeEmptyFieldTotals(): Record<string, number> {
  const o: Record<string, number> = {};
  for (const f of DAILY_FIELDS) {
    o[f.key] = 0;
  }
  return o;
}

function addEntryData(target: Record<string, number>, data: Record<string, unknown> | null | undefined) {
  if (!data) return;
  for (const f of DAILY_FIELDS) {
    target[f.key] += Number(data[f.key]) || 0;
  }
}

function allocateSheetName(raw: string, used: Set<string>): string {
  let base = raw.replace(INVALID_SHEET_CHARS, " ").trim().slice(0, 31);
  if (!base) base = "مركز";
  let name = base;
  let n = 2;
  while (used.has(name)) {
    const suffix = ` (${n})`;
    name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`.slice(0, 31);
    n += 1;
  }
  used.add(name);
  return name;
}

/**
 * Excel workbook: one worksheet per medical center.
 * Each sheet = months (rows) × daily indicator fields (columns) aggregated across all clinics of the center.
 */
export async function buildSuperAdminMonthlyWorkbook(year: number): Promise<Buffer> {
  const admin = createAdminClient();

  const [{ data: centers, error: centersError }, { data: entries, error: entriesError }] = await Promise.all([
    admin.from("medical_centers").select("id, name").order("name"),
    admin.from("daily_entries").select("center_id, month, data").eq("year", year),
  ]);

  if (centersError) {
    throw new Error(centersError.message);
  }
  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const centersList = centers ?? [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة المراكز الطبية";
  workbook.created = new Date();

  const usedSheetNames = new Set<string>();

  const byCenterMonth = new Map<string, Map<number, Record<string, number>>>();
  for (const row of entries ?? []) {
    const cid = row.center_id as string;
    const month = Number(row.month);
    if (!cid || month < 1 || month > 12) continue;
    if (!byCenterMonth.has(cid)) {
      const inner = new Map<number, Record<string, number>>();
      for (let m = 1; m <= 12; m++) {
        inner.set(m, makeEmptyFieldTotals());
      }
      byCenterMonth.set(cid, inner);
    }
    const inner = byCenterMonth.get(cid)!;
    addEntryData(inner.get(month)!, row.data as Record<string, unknown>);
  }

  const headerLabels = ["الشهر", ...DAILY_FIELDS.map((f) => f.label)];

  if (centersList.length === 0) {
    const ws = workbook.addWorksheet("تنبيه", {
      views: [{ rightToLeft: true }],
    });
    ws.getCell(1, 1).value = "لا توجد مراكز مسجّلة في النظام.";
    const bufEmpty = await workbook.xlsx.writeBuffer();
    return Buffer.from(bufEmpty);
  }

  for (const center of centersList) {
    const sheetName = allocateSheetName(center.name, usedSheetNames);
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
    });

    ws.mergeCells(1, 1, 1, headerLabels.length);
    const title = ws.getCell(1, 1);
    title.value = `جرد مؤشرات العيادات — ${center.name}`;
    title.font = { bold: true, size: 14 };
    title.alignment = { vertical: "middle", horizontal: "right", wrapText: true };

    ws.getCell(2, 1).value = `السنة ${year} — تجميع جميع العيادات التابعة للمركز`;
    ws.getCell(2, 1).font = { size: 11, color: { argb: "FF475569" } };
    ws.getCell(2, 1).alignment = { horizontal: "right" };

    const headerRow = ws.addRow(headerLabels);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.height = 36;

    const monthMap =
      byCenterMonth.get(center.id) ??
      new Map(
        Array.from({ length: 12 }, (_, i) => [i + 1, makeEmptyFieldTotals()] as const),
      );

    const yearTotals = makeEmptyFieldTotals();

    for (let m = 1; m <= 12; m++) {
      const sums = monthMap.get(m) ?? makeEmptyFieldTotals();
      const row = ws.addRow([MONTHS_AR[m - 1], ...DAILY_FIELDS.map((f) => sums[f.key])]);
      row.alignment = { horizontal: "right" };
      for (const f of DAILY_FIELDS) {
        yearTotals[f.key] += sums[f.key];
      }
    }

    const totalRow = ws.addRow(["المجموع", ...DAILY_FIELDS.map((f) => yearTotals[f.key])]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    };
    totalRow.alignment = { horizontal: "right" };

    ws.columns = [{ width: 18 }, ...DAILY_FIELDS.map(() => ({ width: 14 }))];
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
