import { createContext, useContext } from "react";
import type { Analysis, ManifestRow, Mapping, OriginMap, Resolutions, Sheet } from "./analysis";

export interface Loaded {
  fileName: string;
  fileSize: number;
  sheetName: string;
  sheet: Sheet;
  mapping: Mapping;
}

export interface Store {
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
  /** Origin prefixes available (e.g. CP, RJ). */
  prefixes: string[];
  /** Selected origin prefix (group of manifests), or null for all. */
  prefixo: string | null;
  setPrefixo: (p: string | null) => void;
  origins: OriginMap;
  setOrigins: (o: OriginMap) => void;
  originOf: (code: string) => string;
  comparison: ManifestRow[];
}

export const Ctx = createContext<Store | null>(null);

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("DataProvider ausente");
  return c;
}
