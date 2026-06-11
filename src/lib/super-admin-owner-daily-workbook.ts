import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONTHS_AR } from "@/lib/constants";
import { ownerDailyMonthRangeISO } from "@/lib/owner-daily-data";

const INVALID_SHEET_CHARS = /[[\]*?:/\\]/g;

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDisplayDate(year: number, month: number, day: number) {
  return `${day}/${month}/${year}`;
}

/**
 * Excel workbook: one worksheet per medical center.
 * Each sheet mirrors the owner daily UI — days × clinics (doctor + count).
 */
export async function buildSuperAdminOwnerDailyWorkbook(
  year: number,
  month: number,
  centerIdFilter?: string,
): Promise<Buffer> {
  const admin = createAdminClient();
  const { from, to } = ownerDailyMonthRangeISO(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const centersQuery = admin.from("medical_centers").select("id, name").order("name");
  const centersPromise = centerIdFilter
    ? centersQuery.eq("id", centerIdFilter)
    : centersQuery;

  const [{ data: centers, error: centersError }, { data: clinics, error: clinicsError }, { data: rows, error: rowsError }] =
    await Promise.all([
      centersPromise,
      centerIdFilter
        ? admin.from("clinics").select("id, name, center_id").eq("center_id", centerIdFilter).order("name")
        : admin.from("clinics").select("id, name, center_id").order("name"),
      (() => {
        let q = admin
          .from("owner_daily_clinic_sheet")
          .select("center_id, clinic_id, entry_date, doctor_name, patient_count")
          .gte("entry_date", from)
          .lte("entry_date", to);
        if (centerIdFilter) q = q.eq("center_id", centerIdFilter);
        return q;
      })(),
    ]);

  if (centersError) throw new Error(centersError.message);
  if (clinicsError) throw new Error(clinicsError.message);
  if (rowsError) throw new Error(rowsError.message);

  const centersList = centers ?? [];
  const clinicsList = clinics ?? [];
  const sheetRows = rows ?? [];

  const rowMap = new Map<string, { doctor: string; count: number }>();
  for (const row of sheetRows) {
    rowMap.set(`${row.center_id}_${row.clinic_id}_${row.entry_date}`, {
      doctor: row.doctor_name?.trim() ?? "",
      count: Number(row.patient_count) || 0,
    });
  }

  const clinicsByCenter = new Map<string, { id: string; name: string }[]>();
  for (const clinic of clinicsList) {
    const list = clinicsByCenter.get(clinic.center_id) ?? [];
    list.push({ id: clinic.id, name: clinic.name });
    clinicsByCenter.set(clinic.center_id, list);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة المراكز الطبية";
  workbook.created = new Date();

  const usedSheetNames = new Set<string>();
  const monthLabel = MONTHS_AR[month - 1] ?? String(month);

  const summary = workbook.addWorksheet("ملخص جميع المراكز", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  const summaryHeader = summary.addRow(["المركز", "العيادة", "التاريخ", "الطبيب", "العدد"]);
  summaryHeader.font = { bold: true };
  summaryHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  const centerNameById = new Map(centersList.map((c) => [c.id, c.name]));
  const clinicNameById = new Map(clinicsList.map((c) => [c.id, c.name]));

  for (const row of sheetRows) {
    summary.addRow([
      centerNameById.get(row.center_id) ?? row.center_id,
      clinicNameById.get(row.clinic_id) ?? row.clinic_id,
      row.entry_date,
      row.doctor_name?.trim() || "—",
      Number(row.patient_count) || 0,
    ]);
  }
  summary.columns = [{ width: 24 }, { width: 22 }, { width: 14 }, { width: 20 }, { width: 10 }];

  if (centersList.length === 0) {
    const ws = workbook.addWorksheet("تنبيه", { views: [{ rightToLeft: true }] });
    ws.getCell(1, 1).value = "لا توجد مراكز مطابقة للفلتر.";
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  for (const center of centersList) {
    const centerClinics = clinicsByCenter.get(center.id) ?? [];
    const sheetName = allocateSheetName(center.name, usedSheetNames);
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
    });

    const colCount = 1 + centerClinics.length * 2;
    ws.mergeCells(1, 1, 1, Math.max(colCount, 1));
    ws.getCell(1, 1).value = `استمارة يومية — ${center.name}`;
    ws.getCell(1, 1).font = { bold: true, size: 14 };
    ws.getCell(1, 1).alignment = { horizontal: "right" };

    ws.mergeCells(2, 1, 2, Math.max(colCount, 1));
    ws.getCell(2, 1).value = `${monthLabel} ${year} (من ${from} إلى ${to})`;
    ws.getCell(2, 1).font = { size: 11, color: { argb: "FF475569" } };
    ws.getCell(2, 1).alignment = { horizontal: "right" };

    const headerRow1 = ["التاريخ"];
    const headerRow2 = [""];
    for (const clinic of centerClinics) {
      headerRow1.push(clinic.name, "");
      headerRow2.push("الطبيب", "العدد");
    }
    ws.addRow(headerRow1);
    ws.addRow(headerRow2);
    ws.getRow(3).font = { bold: true };
    ws.getRow(4).font = { bold: true };
    ws.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    ws.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${pad2(month)}-${pad2(day)}`;
      const cells: (string | number)[] = [formatDisplayDate(year, month, day)];
      for (const clinic of centerClinics) {
        const saved = rowMap.get(`${center.id}_${clinic.id}_${iso}`);
        cells.push(saved?.doctor || "—", saved?.count ?? 0);
      }
      ws.addRow(cells);
    }

    ws.getColumn(1).width = 14;
    for (let i = 2; i <= colCount; i += 1) {
      ws.getColumn(i).width = i % 2 === 0 ? 18 : 10;
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
