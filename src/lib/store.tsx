// In-memory only store. Operational data is NEVER persisted; refresh discards it.
// Only non-sensitive settings (SP equivalents) are kept in localStorage.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  analyze,
  compareManifestos,
  DEFAULT_ORIGINS,
  DEFAULT_SP_VALUES,
  listManifestos,
  listPrefixes,
  missingFields,
  originOf,
  type OriginMap,
  type Resolutions,
} from "./analysis";

import { Ctx, type Loaded, type Store } from "./data-context";

const SETTINGS_KEY = "cd-sp:settings";

export function DataProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoadedState] = useState<Loaded | null>(null);
  const [spValues, setSpValuesState] = useState<string[]>(DEFAULT_SP_VALUES);
  const [resolutions, setResolutions] = useState<Resolutions>({});
  const [prefixo, setPrefixo] = useState<string | null>(null);
  const [origins, setOriginsState] = useState<OriginMap>(DEFAULT_ORIGINS);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
      if (Array.isArray(s?.spValues))
        setSpValuesState(s.spValues.filter((x: unknown) => typeof x === "string"));
      if (s?.origins && typeof s.origins === "object")
        setOriginsState(
          Object.fromEntries(
            Object.entries(s.origins).filter(
              ([k, v]) => typeof v === "string" && /^[A-Z]{1,6}$/.test(k),
            ),
          ) as OriginMap,
        );
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
    setPrefixo(null);
  };

  const resolve: Store["resolve"] = (cte, v) =>
    setResolutions((r) => {
      if (v) return { ...r, [cte]: v };
      const n = { ...r };
      delete n[cte];
      return n;
    });

  const valid = !!loaded && !missingFields(loaded.mapping, loaded.sheet.headers).length;
  const overall = useMemo(
    () => (valid ? analyze(loaded!.sheet, loaded!.mapping, spValues, resolutions) : null),
    [valid, loaded, spValues, resolutions],
  );
  const manifestos = useMemo(
    () => (valid ? listManifestos(loaded!.sheet, loaded!.mapping, spValues) : []),
    [valid, loaded, spValues],
  );
  const prefixes = useMemo(() => listPrefixes(manifestos), [manifestos]);
  const current = prefixo !== null && prefixes.includes(prefixo) ? prefixo : null;
  const analysis = useMemo(
    () =>
      valid && current !== null
        ? analyze(loaded!.sheet, loaded!.mapping, spValues, resolutions, null, current)
        : overall,
    [valid, loaded, spValues, resolutions, current, overall],
  );
  const comparison = useMemo(
    () =>
      valid
        ? compareManifestos(loaded!.sheet, loaded!.mapping, spValues, resolutions, origins)
        : [],
    [valid, loaded, spValues, resolutions, origins],
  );

  return (
    <Ctx.Provider
      value={{
        loaded,
        setLoaded,
        spValues,
        setSpValues,
        resolutions,
        resolve,
        analysis,
        overall,
        manifestos,
        prefixes,
        prefixo: current,
        setPrefixo,
        origins,
        setOrigins,
        originOf: (c) => originOf(c, origins),
        comparison,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
