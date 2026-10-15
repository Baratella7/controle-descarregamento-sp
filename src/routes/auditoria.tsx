import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/store";
import { PageHeader } from "@/components/app/shell";
import { ExportButton, NoData, StatCard, StatusBadge } from "@/components/app/bits";
import { CteDialog } from "@/components/app/cte-table";
import { Button } from "@/components/ui/button";
import { exportInconsistencies } from "@/lib/reports";
import { fmtInt } from "@/lib/analysis";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Descarregamento SP" },
      { name: "description", content: "Duplicidades entre manifestos, conflitos e registros inválidos." },
      { property: "og:title", content: "Auditoria — Descarregamento SP" },
      { property: "og:description", content: "Duplicidades entre manifestos, conflitos e registros inválidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { analysis } = useData();
  const [open, setOpen] = useState<string | null>(null);
  if (!analysis) return (<><PageHeader title="Auditoria" /><NoData /></>);
  const s = analysis.summary;
  const flagged = analysis.ctes.filter((c) => c.status === "CONFLITO" || c.status === "INVALIDO" || c.resolved);
  const dups = analysis.ctes.filter((c) => c.duplicated && c.status !== "CONFLITO" && !c.resolved);
  return (
    <>
      <PageHeader title="Auditoria e validação" subtitle="Nenhuma inconsistência é ocultada. Clique para ver os registros de origem."
        actions={<ExportButton label="Inconsistências e conflitos" onExport={(f) => exportInconsistencies(analysis, f)} />} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Linhas importadas" value={fmtInt(s.totalLinhas)} tone="primary" />
        <StatCard label="Registros destino SP" value={fmtInt(s.linhasSP)} tone="success" />
        <StatCard label="Outras filiais (ignorados)" value={fmtInt(s.linhasOutras)} />
        <StatCard label="CT-es únicos" value={fmtInt(s.ctesUnicos)} />
        <StatCard label="Registros duplicados" value={fmtInt(s.registrosDuplicados)} hint="Contados uma única vez" />
        <StatCard label="Duplicidades com conflito" value={fmtInt(s.conflitos)} tone="warning" />
        <StatCard label="Registros inválidos" value={fmtInt(s.registrosInvalidos)} tone="warning" hint={s.linhasSemDestino ? `${fmtInt(s.linhasSemDestino)} sem destino` : undefined} />
        <StatCard label="Pendentes de validação" value={fmtInt(s.pendentes)} tone={s.pendentes ? "danger" : "success"} />
      </div>

      <Section title={`Conflitos, inválidos e resoluções (${flagged.length})`}>
        {flagged.map((c) => (
          <Row key={c.cte} onClick={() => setOpen(c.cte)} left={<><span className="font-mono text-xs font-medium">{c.cte}</span><StatusBadge status={c.resolved ? c.status : c.status} />{c.resolved && <span className="text-xs text-success">resolvido</span>}</>} right={c.issues[0]} />
        ))}
        {!flagged.length && <Empty>Nenhum conflito ou registro inválido.</Empty>}
      </Section>

      {analysis.invalidRecords.length > 0 && (
        <Section title={`Registros sem CT-e ou sem destino (${analysis.invalidRecords.length})`}>
          {analysis.invalidRecords.slice(0, 200).map((r) => (
            <Row key={r.line} left={<span className="text-xs">Linha {r.line} {r.cte && <span className="font-mono">· {r.cte}</span>}</span>} right={r.errors.join(", ")} />
          ))}
        </Section>
      )}

      <Section title={`CT-es repetidos em manifestos, sem divergência (${dups.length})`}>
        {dups.slice(0, 200).map((c) => (
          <Row key={c.cte} onClick={() => setOpen(c.cte)} left={<span className="font-mono text-xs font-medium">{c.cte}</span>} right={`${c.records.length} registros · manifestos ${c.manifestos.join(", ") || "—"}`} />
        ))}
        {!dups.length && <Empty>Nenhuma duplicidade.</Empty>}
      </Section>

      <CteDialog cte={analysis.ctes.find((c) => c.cte === open) ?? null} onClose={() => setOpen(null)} />
    </>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-6 rounded-lg border bg-card shadow-sm">
    <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
    <div className="max-h-96 divide-y overflow-y-auto">{children}</div>
  </div>
);
const Row = ({ left, right, onClick }: { left: React.ReactNode; right?: string | undefined; onClick?: () => void }) => (
  <div className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-2">{left}</div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{right}</span>
      {onClick && <Button size="sm" variant="ghost" onClick={onClick}>Ver registros</Button>}
    </div>
  </div>
);
const Empty = ({ children }: { children: React.ReactNode }) => <div className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</div>;
