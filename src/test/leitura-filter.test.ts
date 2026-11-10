import { describe, expect, it } from "vitest";
import { analyze, autoMap, compareManifestos, matrixToSheet } from "@/lib/analysis";

const headers = ["MAN", "CTE", "fstrechoid", "leitura", "VOLS", "LIDOS"];
const sheet = matrixToSheet([
  headers,
  ["ES001", "A1", "VIX/SP2", "SAO", "10", "8"],
  ["ES002", "A1", "VIX/SP2", "SAO", "10", "8"],
  ["ES001", "B1", "VIX/SP3", "SAO", "5", "5"],
  ["ES001", "C1", "SAO/RIO", "SAO", "3", "1"],
  ["RJ001", "D1", "RIO/SAO", "RIO", "20", "20"],
  ["ES001", "E1", "VIX/SAO", "SP", "30", "30"],
  ["ES001", "F1", "", " sao ", "2", "2"],
  ["ES001", "G1", "VIX/SAO", "VIX/SAO", "40", "40"],
]);

describe("Filtro por unidade de leitura", () => {
  it("seleciona leitura automaticamente antes de trecho e destino", () => {
    expect(autoMap([...headers, "TRECHO", "DESTINO"]).mapping.destino).toBe("leitura");
  });
  it("mantém todos os trechos com leitura SAO e exclui as outras unidades", () => {
    const result = analyze(sheet, autoMap(headers).mapping, ["SAO", "SP", "RIO"]);
    expect(result.ctes.map((c) => c.cte).sort()).toEqual(["A1", "B1", "C1", "F1"]);
    expect(result.summary).toMatchObject({
      linhasSP: 5,
      linhasOutras: 3,
      ctesUnicos: 4,
      registrosDuplicados: 1,
      completos: 2,
      incompletos: 2,
      volsPrevistos: 20,
      volsLidos: 16,
      volsFaltantes: 4,
      conflitos: 0,
      pendentes: 0,
    });
  });
  it("ignora mapeamento antigo e equivalências salvas quando a coluna leitura existe", () => {
    const mapping = { ...autoMap(headers).mapping, destino: "fstrechoid" };
    expect(analyze(sheet, mapping, ["RIO"]).summary.volsPrevistos).toBe(20);
  });
  it("aplica a mesma regra nos filtros de origem e no comparativo por manifesto", () => {
    const mapping = autoMap(headers).mapping;
    const comparison = compareManifestos(sheet, mapping, ["SAO"], {}, {});
    expect(comparison.map((m) => m.manifesto)).toEqual(["ES001", "ES002"]);
    expect(comparison[0]?.summary.volsPrevistos).toBe(20);
    expect(analyze(sheet, mapping, ["SAO"], {}, null, "ES").summary.volsPrevistos).toBe(20);
    expect(analyze(sheet, mapping, ["SAO"], {}, null, "RJ").summary.ctesUnicos).toBe(0);
  });
  it("mantém a compatibilidade com arquivos sem coluna leitura", () => {
    const legacy = matrixToSheet([
      ["CTE", "TRECHO", "VOLS", "LIDOS"],
      ["A1", "CP/SAO", "10", "8"],
      ["B1", "SAO/RIO", "5", "5"],
    ]);
    expect(
      analyze(legacy, autoMap(legacy.headers).mapping, ["SAO"]).ctes.map((c) => c.cte),
    ).toEqual(["A1"]);
  });
});
