import { describe, expect, it } from "vitest";
import { analyze, autoMap, matrixToSheet, missingFields, readPct, missing, classify, type Mapping } from "@/lib/analysis";
import { safeCell } from "@/lib/files";

const H = ["MANIFESTO", "CTE", "FILIAL DESTINO", "VOLS", "LIDOS"];
const map: Mapping = { manifesto: "MANIFESTO", cte: "CTE", destino: "FILIAL DESTINO", vols: "VOLS", lidos: "LIDOS" };
const run = (rows: string[][]) => analyze(matrixToSheet([H, ...rows]), map, ["SP"]);

describe("Cálculos de conferência", () => {
  it("T1: 15 previstos / 14 lidos → 1 faltante, 93,33%", () => {
    const a = run([["001", "ES3671232E", "SP", "15", "14"]]);
    expect(a.ctes[0]!.faltantes).toBe(1);
    expect(a.ctes[0]!.pct!.toFixed(2)).toBe("93.33");
    expect(a.ctes[0]!.status).toBe("INCOMPLETO");
  });
  it("T2: 10/10 → completo, 100%", () => {
    const c = run([["001", "A1", "SP", "10", "10"]]).ctes[0]!;
    expect(c.status).toBe("COMPLETO");
    expect(c.pct).toBe(100);
  });
  it("T3: 8/0 → sem leitura, 8 faltantes", () => {
    const c = run([["001", "A1", "SP", "8", "0"]]).ctes[0]!;
    expect(c.status).toBe("SEM_LEITURA");
    expect(c.faltantes).toBe(8);
  });
  it("T4: duplicado com valores iguais conta uma vez", () => {
    const a = run([
      ["001", "ES3671232E", "SP", "15", "14"],
      ["002", "ES3671232E", "SP", "15", "14"],
    ]);
    expect(a.summary.ctesUnicos).toBe(1);
    expect(a.summary.volsPrevistos).toBe(15);
    expect(a.summary.volsLidos).toBe(14);
    expect(a.summary.volsFaltantes).toBe(1);
    expect(a.summary.registrosDuplicados).toBe(1);
  });
  it("T5: duplicado com valores diferentes → conflito, fora dos totais", () => {
    const a = run([
      ["001", "X1", "SP", "15", "14"],
      ["002", "X1", "SP", "15", "12"],
    ]);
    expect(a.ctes[0]!.status).toBe("CONFLITO");
    expect(a.summary.volsPrevistos).toBe(0);
    expect(a.summary.definitivo).toBe(false);
  });
  it("T5b: conflito resolvido manualmente entra nos totais", () => {
    const sheet = matrixToSheet([H, ["001", "X1", "SP", "15", "14"], ["002", "X1", "SP", "15", "12"]]);
    const a = analyze(sheet, map, ["SP"], { X1: { vols: 15, lidos: 14 } });
    expect(a.ctes[0]!.status).toBe("INCOMPLETO");
    expect(a.summary.volsFaltantes).toBe(1);
  });
  it("T6: destino RJ é excluído (prefixo SP não importa)", () => {
    const a = run([["001", "SP1234567E", "RJ", "10", "10"]]);
    expect(a.summary.ctesUnicos).toBe(0);
    expect(a.summary.linhasOutras).toBe(1);
  });
  it("T7: código ES com destino SP é incluído", () => {
    const a = run([
      ["001", "ES3671232E", "SP", "10", "10"],
      ["001", "RJ4589211A", "sp", "5", "5"],
    ]);
    expect(a.summary.ctesUnicos).toBe(2);
  });
  it("T8: 10/12 → leitura excedente, % não limitado", () => {
    const c = run([["001", "A1", "SP", "10", "12"]]).ctes[0]!;
    expect(c.status).toBe("EXCEDENTE");
    expect(c.pct).toBe(120);
  });
  it("T9: coluna obrigatória ausente → solicita mapeamento", () => {
    const headers = ["MANIFESTO", "CTE", "DESTINO", "VOLS"];
    const { mapping } = autoMap(headers);
    expect(missingFields(mapping, headers)).toEqual(["lidos"]);
  });
  it("T10: preserva letras e zeros à esquerda", () => {
    const a = run([["001", "00012345AB", "SP", "3", "3"]]);
    expect(a.ctes[0]!.cte).toBe("00012345AB");
  });
  it("dados inválidos não são completos", () => {
    const a = run([["001", "A1", "SP", "-1", "abc"]]);
    expect(a.ctes[0]!.status).toBe("INVALIDO");
    expect(a.summary.completos).toBe(0);
  });
  it("percentual geral e funções base", () => {
    expect(readPct(1000, 980)).toBe(98);
    expect(missing(10, 12)).toBe(0);
    expect(classify(5, 3)).toBe("INCOMPLETO");
  });
  it("detecta cabeçalho abaixo de linhas de título", () => {
    const s = matrixToSheet([["Relatório"], [], H, ["1", "A", "SP", "1", "1"]]);
    expect(s.headers).toEqual(H);
    expect(s.rows).toHaveLength(1);
  });
  it("exportação neutraliza fórmulas", () => {
    expect(safeCell("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(safeCell("ES123")).toBe("ES123");
    expect(safeCell(-5)).toBe(-5);
  });
});
