// Local-only file reading & export. Nothing here performs network requests.
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { matrixToSheet, type Sheet } from "./analysis";

export const LIMITS = { maxBytes: 25 * 1024 * 1024, maxRows: 200_000 };
const EXT = /\.(xlsx|xls|csv)$/i;

export class FileError extends Error {}

export function validateFile(file: File, maxBytes = LIMITS.maxBytes) {
  if (!EXT.test(file.name)) throw new FileError("Formato não suportado. Use .xlsx, .xls ou .csv.");
  if (file.size === 0) throw new FileError("O arquivo está vazio.");
  if (file.size > maxBytes)
    throw new FileError(`Arquivo maior que o limite de ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`);
}

export interface Workbook {
  kind: "excel" | "csv";
  sheetNames: string[];
  getSheet: (name: string) => Sheet;
}

export async function readWorkbook(file: File): Promise<Workbook> {
  validateFile(file);
  if (/\.csv$/i.test(file.name)) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const matrix: string[][] = [];
    const rowNumbers: number[] = [];
    let line = 1;
    let cursor = 0;
    Papa.parse<string[]>(text, {
      skipEmptyLines: false,
      dynamicTyping: false,
      step: (result) => {
        matrix.push(result.data);
        rowNumbers.push(line);
        line += (text.slice(cursor, result.meta.cursor).match(/\r\n|\r|\n/g) ?? []).length;
        cursor = result.meta.cursor;
      },
    });
    const sheet = matrixToSheet(matrix, rowNumbers);
    return { kind: "csv", sheetNames: ["CSV"], getSheet: () => sheet };
  }
  const buf = await file.arrayBuffer();
  let wb: XLSX.WorkBook;
  try {
    // No formulas, no HTML, no macros: values only.
    wb = XLSX.read(buf, { type: "array", cellFormula: false, cellHTML: false, bookVBA: false, cellStyles: false });
  } catch {
    throw new FileError("Não foi possível ler o arquivo. Ele pode estar corrompido ou protegido.");
  }
  if (!wb.SheetNames.length) throw new FileError("A planilha não contém abas.");
  return {
    kind: "excel",
    sheetNames: wb.SheetNames,
    getSheet: (name) => {
      const ws = wb.Sheets[name];
      if (!ws) throw new FileError("Aba não encontrada.");
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: true,
      });
      const firstRow = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r + 1 : 1;
      return matrixToSheet(
        matrix,
        matrix.map((_, i) => firstRow + i),
      );
    },
  };
}

/** Neutralizes spreadsheet formula injection (=, +, -, @, tab, CR). */
export function safeCell(v: unknown): string | number {
  if (typeof v === "number") return Number.isFinite(v) ? v : "";
  const s = v === null || v === undefined ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function exportRows(filename: string, headers: string[], rows: unknown[][], format: "xlsx" | "csv") {
  const aoa = [headers.map(safeCell), ...rows.map((r) => r.map(safeCell))];
  let blob: Blob;
  if (format === "csv") {
    const csv = Papa.unparse(aoa, { delimiter: ";" });
    blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  } else {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Force every string cell to text so CT-e codes keep leading zeros.
    for (const k of Object.keys(ws)) {
      const c = ws[k] as XLSX.CellObject;
      if (k[0] !== "!" && c.t === "s") c.z = "@";
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
