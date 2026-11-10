import { File as NodeFile } from "node:buffer";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readWorkbook } from "@/lib/files";
import { autoMap, buildRecords } from "@/lib/analysis";

const headers = ["CTE", "TRECHO", "MAN", "VOLS", "LIDOS"];

describe("Linhas de origem na importação", () => {
  it.each(["\n", "\r\n", "\r"])("preserva linhas em CSV com quebra %j", async (newline) => {
    const csv = [
      "Título;;;;",
      "",
      headers.join(";"),
      'A1;CP/SAO;CP001;10;8;"observação',
      'em duas linhas"',
      "",
      "A2;CP/SAO;CP001;5;4",
    ].join(newline);
    const file = new NodeFile(["\uFEFF" + csv], "teste.csv") as unknown as File;
    const wb = await readWorkbook(file);
    const sheet = wb.getSheet("CSV");
    const records = buildRecords(sheet, autoMap(sheet.headers).mapping, ["SAO"]);
    expect(records.map((r) => [r.cte, r.line])).toEqual([
      ["A1", 4],
      ["A2", 7],
    ]);
  });

  it.each(["xlsx", "xls"])(
    "preserva linhas físicas em %s com início deslocado e lacunas",
    async (format) => {
      const ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.sheet_add_aoa(
        ws,
        [
          ["Título"],
          [],
          headers,
          ["000123", "CP/SAO", "CP001", 10, 8],
          [],
          ["A2", "CP/SAO", "CP001", 5, 4],
        ],
        { origin: "A3" },
      );
      ws["!ref"] = "A3:E8";
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, "Dados");
      const data = XLSX.write(workbook, {
        type: "buffer",
        bookType: format === "xls" ? "biff8" : "xlsx",
      });
      const file = new NodeFile([data], `teste.${format}`) as unknown as File;
      // Use the jsdom realm for ArrayBuffer, as SheetJS checks instanceof.
      Object.defineProperty(file, "arrayBuffer", {
        value: async () => Uint8Array.from(data).buffer,
      });
      const wb = await readWorkbook(file);
      const sheet = wb.getSheet("Dados");
      const records = buildRecords(sheet, autoMap(sheet.headers).mapping, ["SAO"]);
      expect(records.map((r) => [r.cte, r.line])).toEqual([
        ["000123", 6],
        ["A2", 8],
      ]);
    },
  );
});
