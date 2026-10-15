// Pure, browser-only analysis logic. Never logs or transmits row content.

export type Field = "cte" | "destino" | "manifesto" | "vols" | "lidos";
export type Mapping = Record<Field, string | null>;

export const FIELD_LABELS: Record<Field, string> = {
  cte: "Código do CT-e",
  destino: "Trecho (destino após a barra)",
  manifesto: "Manifesto",
  vols: "VOLS (previstos)",
  lidos: "LIDOS (lidos)",
};
export const REQUIRED_FIELDS: Field[] = ["cte", "destino", "vols", "lidos"];

export type Status =
  | "COMPLETO"
  | "INCOMPLETO"
  | "SEM_LEITURA"
  | "EXCEDENTE"
  | "INVALIDO"
  | "CONFLITO";

export const STATUS_LABELS: Record<Status, string> = {
  COMPLETO: "Completo",
  INCOMPLETO: "Incompleto",
  SEM_LEITURA: "Sem leitura",
  EXCEDENTE: "Leitura excedente",
  INVALIDO: "Dados inválidos",
  CONFLITO: "Duplicidade com conflito",
};

export type Sheet = { headers: string[]; rows: Record<string, string>[] };

export interface SourceRecord {
  line: number; // line number in the original file (1-based, incl. header)
  cte: string;
  destino: string;
  manifesto: string;
  vols: number | null;
  lidos: number | null;
  errors: string[];
  isSP: boolean;
}

export interface CteResult {
  cte: string;
  destino: string;
  manifestos: string[];
  records: SourceRecord[];
  vols: number | null;
  lidos: number | null;
  faltantes: number;
  pct: number | null;
  status: Status;
  duplicated: boolean;
  resolved: boolean;
  issues: string[];
}

export interface Summary {
  totalLinhas: number;
  linhasSP: number;
  linhasOutras: number;
  linhasSemDestino: number;
  ctesUnicos: number;
  registrosDuplicados: number;
  conflitos: number;
  registrosInvalidos: number;
  pendentes: number;
  completos: number;
  incompletos: number;
  semLeitura: number;
  excedentes: number;
  invalidos: number;
  volsPrevistos: number;
  volsLidos: number;
  volsFaltantes: number;
  pctGeral: number | null;
  definitivo: boolean;
  /** CT-es of this view that also appear in other manifests (only set in per-manifest view). */
  compartilhados: number;
}

export interface Analysis {
  ctes: CteResult[];
  invalidRecords: SourceRecord[]; // records not attributable to a valid SP CT-e (e.g. missing destination/code)
  summary: Summary;
}

export const normalize = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const PATTERNS: Record<Field, RegExp[]> = {
  cte: [/^CT-?E$/, /^(N(UM(ERO)?|O|º)?\.? ?)?CT-?E/, /CT-?E/, /CONHEC/],
  destino: [/^TRECHO$/, /TRECHO/, /^(FILIAL )?DEST(INO)?$/, /DEST/, /^FIL(IAL)? ?DEST/],
  manifesto: [/^MANIF(ESTO)?$/, /^MAN$/, /MANIF/, /^MDF-?E/],
  vols: [/^VOLS$/, /^VOL(UME)?S?( PREVISTOS?)?$/],
  lidos: [/^LIDOS$/, /^(VOL(UME)?S? )?LIDOS?$/],
};

export interface AutoMapResult {
  mapping: Mapping;
  candidates: Record<Field, string[]>;
}

export function autoMap(headers: string[]): AutoMapResult {
  const candidates = {} as Record<Field, string[]>;
  const mapping = {} as Mapping;
  (Object.keys(PATTERNS) as Field[]).forEach((f) => {
    const found: string[] = [];
    for (const re of PATTERNS[f]) {
      for (const h of headers) if (re.test(normalize(h)) && !found.includes(h)) found.push(h);
      if (found.length) break; // most specific pattern wins
    }
    candidates[f] = found;
    mapping[f] = found.length === 1 ? found[0]! : null;
  });
  return { mapping, candidates };
}

export function missingFields(mapping: Mapping, headers: string[]): Field[] {
  return REQUIRED_FIELDS.filter((f) => !mapping[f] || !headers.includes(mapping[f]!));
}

/** Parses an integer-like volume cell. Returns null for empty, NaN for invalid. */
export function parseVolume(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  let s = String(v).trim().replace(/\s/g, "");
  if (s === "") return null;
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
  else s = s.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

export const DEFAULT_SP_VALUES = ["SAO", "SP", "SAO PAULO", "SÃO PAULO"];

/** Extracts the destination from a route like "CPQ/SAO" (last segment). Plain values pass through. */
export function destinoFromTrecho(v: unknown): string {
  const parts = String(v ?? "").split(/[/\\>]|\s-\s/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : "";
}

export function buildRecords(sheet: Sheet, mapping: Mapping, spValues: string[]): SourceRecord[] {
  const sp = new Set(spValues.map(normalize).filter(Boolean));
  return sheet.rows.map((row, i) => {
    const cte = String(row[mapping.cte!] ?? "").trim();
    const destino = destinoFromTrecho(row[mapping.destino!]);
    const manifesto = mapping.manifesto ? String(row[mapping.manifesto] ?? "").trim() : "";
    const vols = parseVolume(row[mapping.vols!]);
    const lidos = parseVolume(row[mapping.lidos!]);
    const errors: string[] = [];
    if (!cte) errors.push("Código do CT-e ausente");
    if (!destino) errors.push("Destino ausente");
    if (vols === null) errors.push("VOLS ausente");
    else if (Number.isNaN(vols)) errors.push("VOLS não numérico");
    else if (vols < 0) errors.push("VOLS negativo");
    else if (vols === 0) errors.push("VOLS igual a zero");
    else if (!Number.isInteger(vols)) errors.push("VOLS não inteiro");
    if (lidos === null) errors.push("LIDOS ausente");
    else if (Number.isNaN(lidos)) errors.push("LIDOS não numérico");
    else if (lidos < 0) errors.push("LIDOS negativo");
    else if (!Number.isInteger(lidos)) errors.push("LIDOS não inteiro");
    return { line: i + 2, cte, destino, manifesto, vols, lidos, errors, isSP: sp.has(normalize(destino)) };
  });
}

export function classify(vols: number, lidos: number): Status {
  if (lidos === vols) return "COMPLETO";
  if (lidos > vols) return "EXCEDENTE";
  if (lidos === 0) return "SEM_LEITURA";
  return "INCOMPLETO";
}

export const missing = (vols: number, lidos: number) => Math.max(vols - lidos, 0);
export const readPct = (vols: number, lidos: number) => (vols > 0 ? (lidos / vols) * 100 : null);

export type Resolutions = Record<string, { vols: number; lidos: number }>;

export function analyze(
  sheet: Sheet,
  mapping: Mapping,
  spValues: string[],
  resolutions: Resolutions = {},
  manifesto: string | null = null,
): Analysis {
  const all = buildRecords(sheet, mapping, spValues);
  const records = manifesto === null ? all : all.filter((r) => r.manifesto === manifesto);
  const spRecords = records.filter((r) => r.isSP);
  const invalidRecords = records.filter((r) => !r.isSP && !r.destino);
  // For per-manifest view: which other manifests carry the same CT-e (SP only)
  const otherMan = new Map<string, Set<string>>();
  if (manifesto !== null)
    for (const r of all)
      if (r.isSP && r.cte && r.manifesto !== manifesto) {
        const s = otherMan.get(r.cte) ?? new Set<string>();
        s.add(r.manifesto || "(sem manifesto)");
        otherMan.set(r.cte, s);
      }
  const groups = new Map<string, SourceRecord[]>();
  for (const r of spRecords) {
    if (!r.cte) {
      invalidRecords.push(r);
      continue;
    }
    const g = groups.get(r.cte);
    if (g) g.push(r);
    else groups.set(r.cte, [r]);
  }

  const ctes: CteResult[] = [];
  for (const [cte, recs] of groups) {
    const manifestos = [...new Set(recs.map((r) => r.manifesto).filter(Boolean))];
    const issues: string[] = [];
    const invalid = recs.filter((r) => r.errors.length);
    const valid = recs.filter((r) => !r.errors.length);
    const pairs = new Set(valid.map((r) => `${r.vols}|${r.lidos}`));
    const res = resolutions[cte];
    let vols: number | null = null;
    let lidos: number | null = null;
    let status: Status;
    let resolved = false;

    if (res) {
      vols = res.vols;
      lidos = res.lidos;
      resolved = true;
      status = classify(vols, lidos);
      issues.push("Divergência resolvida manualmente");
    } else if (invalid.length) {
      status = "INVALIDO";
      invalid.forEach((r) => issues.push(`Linha ${r.line}: ${r.errors.join(", ")}`));
    } else if (pairs.size > 1) {
      status = "CONFLITO";
      issues.push(`${pairs.size} combinações diferentes de VOLS/LIDOS entre ${recs.length} registros`);
    } else {
      vols = valid[0]!.vols!;
      lidos = valid[0]!.lidos!;
      status = classify(vols, lidos);
    }
    if (status === "EXCEDENTE") issues.push("Anomalia: leitura acima do previsto");
    const others = otherMan.get(cte);
    if (others) issues.push(`Também presente em: ${[...others].join(", ")} — leitura pode não ser exclusiva desta carreta`);

    ctes.push({
      cte,
      destino: recs[0]!.destino,
      manifestos,
      records: recs,
      vols,
      lidos,
      faltantes: vols !== null && lidos !== null ? missing(vols, lidos) : 0,
      pct: vols !== null && lidos !== null ? readPct(vols, lidos) : null,
      status,
      duplicated: recs.length > 1,
      resolved,
      issues,
    });
  }

  ctes.sort((a, b) => b.faltantes - a.faltantes || (a.pct ?? 999) - (b.pct ?? 999));

  const count = (s: Status) => ctes.filter((c) => c.status === s).length;
  const ok = ctes.filter((c) => c.vols !== null && c.lidos !== null);
  const volsPrevistos = ok.reduce((s, c) => s + c.vols!, 0);
  const volsLidos = ok.reduce((s, c) => s + c.lidos!, 0);
  const volsFaltantes = ok.reduce((s, c) => s + c.faltantes, 0);
  const conflitos = count("CONFLITO");
  const invalidos = count("INVALIDO");
  const pendentes = conflitos + invalidos + invalidRecords.length;

  return {
    ctes,
    invalidRecords,
    summary: {
      totalLinhas: records.length,
      linhasSP: spRecords.length,
      linhasOutras: records.filter((r) => !r.isSP && r.destino).length,
      linhasSemDestino: records.filter((r) => !r.destino).length,
      ctesUnicos: ctes.length,
      registrosDuplicados: ctes.reduce((s, c) => s + (c.records.length - 1), 0),
      conflitos,
      registrosInvalidos: records.filter((r) => (r.isSP || !r.destino) && r.errors.length).length,
      pendentes,
      completos: count("COMPLETO"),
      incompletos: count("INCOMPLETO"),
      semLeitura: count("SEM_LEITURA"),
      excedentes: count("EXCEDENTE"),
      invalidos,
      volsPrevistos,
      volsLidos,
      volsFaltantes,
      pctGeral: readPct(volsPrevistos, volsLidos),
      definitivo: pendentes === 0,
      compartilhados: ctes.filter((c) => otherMan.has(c.cte)).length,
    },
  };
}

// ---------- Manifests / origins ----------

export type OriginMap = Record<string, string>;
export const DEFAULT_ORIGINS: OriginMap = { CP: "Campinas" };
export const UNKNOWN_ORIGIN = "Origem não cadastrada";

export const manifestPrefix = (code: string) => (code.trim().toUpperCase().match(/^[A-Z]+/)?.[0] ?? "");

export function originOf(code: string, origins: OriginMap): string {
  const p = manifestPrefix(code);
  if (!p) return UNKNOWN_ORIGIN;
  // longest registered prefix wins
  const key = Object.keys(origins)
    .filter((k) => k && p.startsWith(k.toUpperCase()))
    .sort((a, b) => b.length - a.length)[0];
  return key ? origins[key]! : UNKNOWN_ORIGIN;
}

/** Distinct manifest codes among SP records, as they appear (trimmed). */
export function listManifestos(sheet: Sheet, mapping: Mapping, spValues: string[]): string[] {
  if (!mapping.manifesto) return [];
  const set = new Set<string>();
  for (const r of buildRecords(sheet, mapping, spValues)) if (r.isSP && r.manifesto) set.add(r.manifesto);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export interface ManifestRow {
  manifesto: string;
  origem: string;
  summary: Summary;
}

export function compareManifestos(sheet: Sheet, mapping: Mapping, spValues: string[], resolutions: Resolutions, origins: OriginMap): ManifestRow[] {
  return listManifestos(sheet, mapping, spValues).map((m) => ({
    manifesto: m,
    origem: originOf(m, origins),
    summary: analyze(sheet, mapping, spValues, resolutions, m).summary,
  }));
}

// ---------- Table extraction ----------

/** Turns a matrix of cell strings into a Sheet, detecting the header row. */
export function matrixToSheet(matrix: unknown[][]): Sheet {
  const rows = matrix.map((r) => (r ?? []).map((c) => (c === null || c === undefined ? "" : String(c))));
  let headerIdx = 0;
  let best = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i]!.filter((c) => c.trim() !== "");
    if (cells.length < 2) continue;
    const { candidates } = autoMap(cells);
    const score = REQUIRED_FIELDS.filter((f) => candidates[f].length).length * 10 + cells.length * 0.01;
    if (score > best) {
      best = score;
      headerIdx = i;
    }
  }
  const raw: string[] = rows[headerIdx] ?? [];
  const seen = new Map<string, number>();
  const headers = raw.map((h, i) => {
    let name = h.trim() || `Coluna ${i + 1}`;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n > 1) name = `${name} (${n})`;
    return name;
  });
  const data = rows
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  return { headers, rows: data };
}

// ---------- Formatting ----------
export const fmtInt = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR"));
export const fmtPct = (n: number | null) =>
  n === null ? "—" : `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
