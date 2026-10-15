// In-memory only store. Operational data is NEVER persisted; refresh discards it.
// Only non-sensitive settings (SP equivalents) are kept in localStorage.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { analyze, compareManifestos, DEFAULT_ORIGINS, DEFAULT_SP_VALUES, listManifestos, missingFields, originOf, type Analysis, type ManifestRow, type Mapping, type OriginMap, type Resolutions, type Sheet } from "./analysis";

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
  /** Analysis for the current view (selected manifest or all). */
  analysis: Analysis | null;
  /** Consolidated analysis of all manifests. */
  overall: Analysis | null;
  manifestos: string[];
  manifesto: string | null;
  setManifesto: (m: string | null) => void;
  origins: OriginMap;
  setOrigins: (o: OriginMap) => void;
  originOf: (code: string) => string;
  comparison: ManifestRow[];
}

const Ctx = createContext<Store | null>(null);
const SETTINGS_KEY = "cd-sp:settings";

export function DataProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoadedState] = useState<Loaded | null>(null);
  const [spValues, setSpValuesState] = useState<string[]>(DEFAULT_SP_VALUES);
  const [resolutions, setResolutions] = useState<Resolutions>({});
  const [manifesto, setManifesto] = useState<string | null>(null);
  const [origins, setOriginsState] = useState<OriginMap>(DEFAULT_ORIGINS);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
      if (Array.isArray(s?.spValues)) setSpValuesState(s.spValues.filter((x: unknown) => typeof x === "string"));
      if (s?.origins && typeof s.origins === "object")
        setOriginsState(Object.fromEntries(Object.entries(s.origins).filter(([k, v]) => typeof v === "string" && /^[A-Z]{1,6}$/.test(k))) as OriginMap);
    } catch {
      /* ignore */
    }
  }, []);

  const save = (patch: object) => {
    try {
      const cur = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") ?? {};
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...cur, ...patch }));
    } catch {
      /* ignore */
    }
  };
  const setSpValues = (v: string[]) => {
    setSpValuesState(v);
    save({ spValues: v });
  };
  const setOrigins = (o: OriginMap) => {
    setOriginsState(o);
    save({ origins: o });
  };

  const setLoaded = (l: Loaded | null) => {
    setLoadedState(l);
    setResolutions({});
    setManifesto(null);
  };

  const resolve: Store["resolve"] = (cte, v) =>
    setResolutions((r) => {
      const n = { ...r };
      if (v) n[cte] = v;
      else delete n[cte];
      return n;
    });

  const valid = !!loaded && !missingFields(loaded.mapping, loaded.sheet.headers).length;
  const overall = useMemo(
    () => (valid ? analyze(loaded!.sheet, loaded!.mapping, spValues, resolutions) : null),
    [valid, loaded, spValues, resolutions],
  );
  const manifestos = useMemo(() => (valid ? listManifestos(loaded!.sheet, loaded!.mapping, spValues) : []), [valid, loaded, spValues]);
  const current = manifesto !== null && manifestos.includes(manifesto) ? manifesto : null;
  const analysis = useMemo(
    () => (valid && current !== null ? analyze(loaded!.sheet, loaded!.mapping, spValues, resolutions, current) : overall),
    [valid, loaded, spValues, resolutions, current, overall],
  );
  const comparison = useMemo(
    () => (valid ? compareManifestos(loaded!.sheet, loaded!.mapping, spValues, resolutions, origins) : []),
    [valid, loaded, spValues, resolutions, origins],
  );

  return (
    <Ctx.Provider
      value={{
        loaded, setLoaded, spValues, setSpValues, resolutions, resolve, analysis, overall, manifestos,
        manifesto: current, setManifesto, origins, setOrigins, originOf: (c) => originOf(c, origins), comparison,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("DataProvider ausente");
  return c;
}
