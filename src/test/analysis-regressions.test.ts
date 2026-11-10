import { describe, expect, it } from "vitest";
import {
  analyze,
  buildRecords,
  compareManifestos,
  DEFAULT_ORIGINS,
  matrixToSheet,
  type Mapping,
  type Resolutions,
} from "@/lib/analysis";

const headers = ["CTE", "TRECHO", "MAN", "VOLS", "LIDOS"];
const mapping: Mapping = {
  cte: "CTE",
  destino: "TRECHO",
  manifesto: "MAN",
  vols: "VOLS",
  lidos: "LIDOS",
};

describe("Regressões da conferência", () => {
  it("preserva todas as colunas quando nomes gerados colidem com sufixos existentes", () => {
    const sheet = matrixToSheet([
      [...headers, "VOLS", "VOLS (2)", "", "Coluna 8"],
      ["A1", "CP/SAO", "CP001", "10", "8", "20", "99", "vazio", "nomeado"],
    ]);
    expect(new Set(sheet.headers).size).toBe(sheet.headers.length);
    expect(sheet.rows[0]).toEqual({
      CTE: "A1",
      TRECHO: "CP/SAO",
      MAN: "CP001",
      VOLS: "10",
      LIDOS: "8",
      "VOLS (3)": "20",
      "VOLS (2)": "99",
      "Coluna 8": "vazio",
      "Coluna 8 (2)": "nomeado",
    });
  });

  it("mantém as linhas originais após títulos e linhas vazias", () => {
    const sheet = matrixToSheet([
      ["Título"],
      [],
      headers,
      ["A1", "CP/SAO", "CP001", "10", "8"],
      [],
      ["A2", "CP/SAO", "CP001", "x", "8"],
    ]);
    const records = buildRecords(sheet, mapping, ["SAO"]);
    expect(records.map((r) => r.line)).toEqual([4, 6]);
    expect(analyze(sheet, mapping, ["SAO"]).ctes.find((c) => c.cte === "A2")?.issues).toContain(
      "Linha 6: VOLS não numérico",
    );
  });

  it("detecta o cabeçalho após muitas linhas vazias sem perder a posição original", () => {
    const sheet = matrixToSheet([
      ["Título"],
      ...Array.from({ length: 40 }, () => []),
      headers,
      ["A1", "CP/SAO", "CP001", "10", "8"],
    ]);
    expect(sheet.headers).toEqual(headers);
    expect(buildRecords(sheet, mapping, ["SAO"])[0]?.line).toBe(43);
  });

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])(
    "não trata o código %s como resolução automática",
    (cte) => {
      const sheet = matrixToSheet([headers, [cte, "CP/SAO", "CP001", "10", "8"]]);
      const result = analyze(sheet, mapping, ["SAO"]);
      expect(result.ctes[0]).toMatchObject({
        cte,
        status: "INCOMPLETO",
        resolved: false,
        vols: 10,
        lidos: 8,
        faltantes: 2,
      });
      expect(result.summary.volsPrevistos).toBe(10);
      expect(result.summary.volsLidos).toBe(8);
    },
  );

  it("aceita resoluções próprias para códigos especiais e rejeita valores inválidos", () => {
    const sheet = matrixToSheet([headers, ["__proto__", "CP/SAO", "CP001", "10", "8"]]);
    const resolutions: Resolutions = { ["__proto__"]: { vols: 10, lidos: 10 } };
    expect(analyze(sheet, mapping, ["SAO"], resolutions).ctes[0]?.resolved).toBe(true);
    resolutions["__proto__"] = { vols: NaN, lidos: -1 };
    expect(analyze(sheet, mapping, ["SAO"], resolutions).ctes[0]).toMatchObject({
      resolved: false,
      vols: 10,
      lidos: 8,
    });
  });

  it.each([{}, { A1: { vols: 10, lidos: 9 } }])(
    "preserva os totais por manifesto com duplicatas, conflitos e inválidos",
    (resolutions) => {
      const sheet = matrixToSheet([
        headers,
        ["A1", "CP/SAO", "CP001", "10", "8"],
        ["A1", "CP/SAO", "CP001", "10", "8"],
        ["A1", "RJ/SAO", "RJ001", "10", "9"],
        ["A1", "RJ/SAO", "", "10", "8"],
        ["B1", "RJ/SAO", "RJ001", "5", "0"],
        ["B1", "RJ/SAO", "RJ001", "5", "3"],
        ["C1", "RJ/SAO", "RJ001", "x", "1"],
        ["D1", "CP/RJ", "CP001", "5", "5"],
        ["E1", "", "CP001", "5", "2"],
        ["", "CP/SAO", "CP001", "5", "1"],
        ["F1", "CP/RJ", "OUTRO", "5", "1"],
      ]);
      const comparison = compareManifestos(sheet, mapping, ["SAO"], resolutions, DEFAULT_ORIGINS);
      expect(comparison.map((m) => m.manifesto)).toEqual(["CP001", "RJ001"]);
      for (const manifest of comparison) {
        expect(manifest.summary).toEqual(
          analyze(sheet, mapping, ["SAO"], resolutions, manifest.manifesto).summary,
        );
      }
      expect(comparison[0]?.summary.compartilhados).toBe(1);
    },
  );

  it("não relê cada linha da planilha para cada manifesto", () => {
    const sheet = matrixToSheet([
      headers,
      ...Array.from({ length: 1000 }, (_, i) => ["A" + i, "CP/SAO", "CP" + i, "10", "8"]),
    ]);
    let reads = 0;
    for (const row of sheet.rows) {
      const cte = row["CTE"];
      Object.defineProperty(row, "CTE", {
        get: () => {
          reads++;
          return cte;
        },
      });
    }
    const comparison = compareManifestos(sheet, mapping, ["SAO"], {}, DEFAULT_ORIGINS);
    expect(comparison).toHaveLength(1000);
    expect(comparison.every((m) => m.summary.volsFaltantes === 2)).toBe(true);
    expect(reads).toBeLessThanOrEqual(sheet.rows.length * 2);
  });
});
