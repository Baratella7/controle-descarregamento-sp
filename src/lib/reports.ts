import { STATUS_LABELS, type Analysis, type CteResult } from "./analysis";
import { exportRows } from "./files";

const stamp = () => new Date().toISOString().slice(0, 10);
const H = ["CT-e", "Destino", "Manifestos", "Vols previstos", "Vols lidos", "Vols faltantes", "% leitura", "Status", "Observações"];
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
        rows.push([c.cte, STATUS_LABELS[c.status] + (c.resolved ? " (resolvido)" : ""), r.line, r.manifesto, r.destino, r.vols ?? "", r.lidos ?? "", r.errors.join(", ")]),
      ),
    );
  a.invalidRecords.forEach((r) => rows.push([r.cte, "Registro inválido", r.line, r.manifesto, r.destino, r.vols ?? "", r.lidos ?? "", r.errors.join(", ")]));
  exportRows(`inconsistencias_${stamp()}`, ["CT-e", "Situação", "Linha", "Manifesto", "Destino", "VOLS", "LIDOS", "Erros"], rows, f);
}
