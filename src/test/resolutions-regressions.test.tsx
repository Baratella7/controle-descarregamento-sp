import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { autoMap, matrixToSheet } from "@/lib/analysis";
import { DataProvider, useData } from "@/lib/store";

afterEach(cleanup);

it.each(["__proto__", "constructor"])(
  "permite resolver e desfazer o CT-e %s na aplicação",
  (cte) => {
    const sheet = matrixToSheet([
      ["CTE", "TRECHO", "MAN", "VOLS", "LIDOS"],
      [cte, "CP/SAO", "CP001", "10", "8"],
      [cte, "CP/SAO", "CP001", "10", "9"],
    ]);
    const { result } = renderHook(() => useData(), { wrapper: DataProvider });
    act(() =>
      result.current.setLoaded({
        fileName: "teste.csv",
        fileSize: 100,
        sheetName: "CSV",
        sheet,
        mapping: autoMap(sheet.headers).mapping,
      }),
    );
    expect(result.current.analysis?.ctes[0]?.status).toBe("CONFLITO");
    act(() => result.current.resolve(cte, { vols: 10, lidos: 8 }));
    expect(result.current.analysis?.ctes[0]).toMatchObject({
      status: "INCOMPLETO",
      resolved: true,
      faltantes: 2,
    });
    act(() => result.current.resolve(cte, null));
    expect(result.current.analysis?.ctes[0]).toMatchObject({ status: "CONFLITO", resolved: false });
  },
);
