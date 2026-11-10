import { describe, it, expect } from "vitest";
import { analyze, listPrefixes, type Sheet, type Mapping } from "@/lib/analysis";
const sheet: Sheet = {
  headers: ["CTE", "TRECHO", "MAN", "VOLS", "LIDOS"],
  rows: [
    { CTE: "A1", TRECHO: "RJ/SAO", MAN: "RJ001E", VOLS: "5", LIDOS: "4" },
    { CTE: "A1", TRECHO: "RJ/SAO", MAN: "RJ002E", VOLS: "5", LIDOS: "4" },
    { CTE: "B1", TRECHO: "RJ/SAO", MAN: "RJ002E", VOLS: "3", LIDOS: "3" },
    { CTE: "C1", TRECHO: "CPQ/SAO", MAN: "CP001E", VOLS: "2", LIDOS: "1" },
  ],
};
const map: Mapping = {
  cte: "CTE",
  destino: "TRECHO",
  manifesto: "MAN",
  vols: "VOLS",
  lidos: "LIDOS",
};
describe("filtro por origem", () => {
  it("agrupa por sigla sem duplicar CT-e", () => {
    expect(listPrefixes(["RJ001E", "RJ002E", "CP001E"])).toEqual(["CP", "RJ"]);
    const s = analyze(sheet, map, ["SAO"], {}, null, "RJ").summary;
    expect(s.ctesUnicos).toBe(2);
    expect(s.volsPrevistos).toBe(8);
    expect(s.volsLidos).toBe(7);
    expect(analyze(sheet, map, ["SAO"], {}, null, "CP").summary.volsPrevistos).toBe(2);
  });
});
