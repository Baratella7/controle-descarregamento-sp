// In-memory only store. Operational data is NEVER persisted; refresh discards it.
// Only non-sensitive settings (SP equivalents) are kept in localStorage.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { analyze, DEFAULT_SP_VALUES, missingFields, type Analysis, type Mapping, type Resolutions, type Sheet } from "./analysis";

interface Loaded {
  fileName: string;
  fileSize: number;
  sheetName: string;
  sheet: Sheet;
  mapping: Mapping;
}

interface Store {
  loaded: Loaded | null;
  setLoaded: (l: Loaded | null) => void;
  spValues: string[];
  setSpValues: (v: string[]) => void;
  resolutions: Resolutions;
  resolve: (cte: string, v: { vols: number; lidos: number } | null) => void;
  analysis: Analysis | null;
}

const Ctx = createContext<Store | null>(null);
const SETTINGS_KEY = "cd-sp:settings";

export function DataProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoadedState] = useState<Loaded | null>(null);
  const [spValues, setSpValuesState] = useState<string[]>(DEFAULT_SP_VALUES);
  const [resolutions, setResolutions] = useState<Resolutions>({});

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
      if (Array.isArray(s?.spValues)) setSpValuesState(s.spValues.filter((x: unknown) => typeof x === "string"));
    } catch {
      /* ignore */
    }
  }, []);

  const setSpValues = (v: string[]) => {
    setSpValuesState(v);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ spValues: v }));
    } catch {
      /* ignore */
    }
  };

  const setLoaded = (l: Loaded | null) => {
    setLoadedState(l);
    setResolutions({});
  };

  const resolve: Store["resolve"] = (cte, v) =>
    setResolutions((r) => {
      const n = { ...r };
      if (v) n[cte] = v;
      else delete n[cte];
      return n;
    });

  const analysis = useMemo(() => {
    if (!loaded || missingFields(loaded.mapping, loaded.sheet.headers).length) return null;
    return analyze(loaded.sheet, loaded.mapping, spValues, resolutions);
  }, [loaded, spValues, resolutions]);

  return (
    <Ctx.Provider value={{ loaded, setLoaded, spValues, setSpValues, resolutions, resolve, analysis }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("DataProvider ausente");
  return c;
}
