import { STATUS_LABELS, type Analysis, type CteResult, type ManifestRow } from "./analysis";
import { exportRows } from "./files";

const stamp = () => new Date().toISOString().slice(0, 10);
const H = [
  "CT-e",
  "Destino",
  "Manifestos",
  "Vols previstos",
  "Vols lidos",
  "Vols faltantes",
  "% leitura",
  "Status",
  "Observações",
];
const row = (c: CteResult) => [
  c.cte,
  c.destino,
  c.manifestos.join(", "),
  c.vols ?? "",
  c.lidos ?? "",
  c.vols !== null ? c.faltantes : "",
  c.pct !== null ? Math.round(c.pct * 100) / 100 : "",
  STATUS_LABELS[c.status],
  c.issues.join(" | "),
];

export function exportCtes(name: string, list: CteResult[], f: "xlsx" | "csv") {
  exportRows(`${name}_${stamp()}`, H, list.map(row), f);
}

export function exportSummary(a: Analysis, f: "xlsx" | "csv") {
  const s = a.summary;
  const rows: [string, string | number][] = [
    ["Linhas importadas", s.totalLinhas],
    ["Registros destino SP", s.linhasSP],
    ["Registros outras filiais (desconsiderados)", s.linhasOutras],
    ["Registros sem destino", s.linhasSemDestino],
    ["CT-es únicos SP", s.ctesUnicos],
    ["Completos", s.completos],
    ["Incompletos", s.incompletos],
    ["Sem leitura", s.semLeitura],
    ["Leitura excedente", s.excedentes],
    ["Dados inválidos", s.invalidos],
    ["Duplicidades com conflito", s.conflitos],
    ["Registros duplicados", s.registrosDuplicados],
    ["Volumes previstos", s.volsPrevistos],
    ["Volumes lidos", s.volsLidos],
    ["Volumes faltantes", s.volsFaltantes],
    ["% leitura geral", s.pctGeral !== null ? Math.round(s.pctGeral * 100) / 100 : ""],
    ["Resultado definitivo", s.definitivo ? "Sim" : "Não — há pendências"],
  ];
  exportRows(`resumo_geral_${stamp()}`, ["Indicador", "Valor"], rows, f);
}

export function exportInconsistencies(a: Analysis, f: "xlsx" | "csv") {
  const rows: unknown[][] = [];
  a.ctes
    .filter((c) => c.status === "INVALIDO" || c.status === "CONFLITO" || c.resolved)
    .forEach((c) =>
      c.records.forEach((r) =>
        rows.push([
          c.cte,
          STATUS_LABELS[c.status] + (c.resolved ? " (resolvido)" : ""),
          r.line,
          r.manifesto,
          r.destino,
          r.vols ?? "",
          r.lidos ?? "",
          r.errors.join(", "),
        ]),
      ),
    );
  a.invalidRecords.forEach((r) =>
    rows.push([
      r.cte,
      "Registro inválido",
      r.line,
      r.manifesto,
      r.destino,
      r.vols ?? "",
      r.lidos ?? "",
      r.errors.join(", "),
    ]),
  );
  exportRows(
    `inconsistencias_${stamp()}`,
    ["CT-e", "Situação", "Linha", "Manifesto", "Destino", "VOLS", "LIDOS", "Erros"],
    rows,
    f,
  );
}

const pct2 = (n: number | null) => (n !== null ? Math.round(n * 100) / 100 : "");

/** Full report of one manifest (or all): header block + detailed CT-e table. */
export function exportManifestReport(
  name: string,
  label: string,
  origem: string,
  a: Analysis,
  list: CteResult[],
  originOf: (m: string) => string,
  f: "xlsx" | "csv",
) {
  const s = a.summary;
  const head: unknown[][] = [
    ["Manifesto", label],
    ["Origem", origem],
    ["Destino", "SP"],
    ["CT-es únicos", s.ctesUnicos],
    ["Volumes previstos", s.volsPrevistos],
    ["Volumes lidos", s.volsLidos],
    ["Volumes faltantes", s.volsFaltantes],
    ["% leitura", pct2(s.pctGeral)],
    ["CT-es incompletos", s.incompletos],
    ["Pendências", s.pendentes],
    ["CT-es compartilhados com outras carretas", s.compartilhados],
    ["Resultado", s.definitivo ? "Definitivo" : "Prévia (há pendências)"],
    [],
    [
      "CT-e",
      "Manifesto",
      "Origem",
      "Vols previstos",
      "Vols lidos",
      "Vols faltantes",
      "% leitura",
      "Status",
      "Observações",
    ],
  ];
  const body = list.map((c) => [
    c.cte,
    c.manifestos.join(", "),
    [...new Set(c.manifestos.map(originOf))].join(", "),
    c.vols ?? "",
    c.lidos ?? "",
    c.vols !== null ? c.faltantes : "",
    pct2(c.pct),
    STATUS_LABELS[c.status],
    c.issues.join(" | "),
  ]);
  const rows = [...head.slice(1), ...body];
  exportRows(`${name}_${stamp()}`, head[0]!.map(String), rows, f);
}

export function exportComparison(list: ManifestRow[], f: "xlsx" | "csv") {
  exportRows(
    `comparativo_carretas_${stamp()}`,
    [
      "Manifesto",
      "Origem",
      "Destino",
      "CT-es",
      "Vols previstos",
      "Vols lidos",
      "Vols faltantes",
      "% leitura",
      "CT-es incompletos",
      "Pendências",
      "CT-es compartilhados",
    ],
    list.map((m) => [
      m.manifesto,
      m.origem,
      "SP",
      m.summary.ctesUnicos,
      m.summary.volsPrevistos,
      m.summary.volsLidos,
      m.summary.volsFaltantes,
      pct2(m.summary.pctGeral),
      m.summary.incompletos,
      m.summary.pendentes,
      m.summary.compartilhados,
    ]),
    f,
  );
}
