import { createFileRoute } from "@tanstack/react-router";
import { useData } from "@/lib/store";
import { PageHeader } from "@/components/app/shell";
import { ExportButton, NoData, PendingWarning } from "@/components/app/bits";
import { CteTable } from "@/components/app/cte-table";
import { exportCtes } from "@/lib/reports";

export const Route = createFileRoute("/conferencia")({
  head: () => ({
    meta: [
      { title: "Conferência de CT-es — Descarregamento SP" },
      { name: "description", content: "Tabela completa dos CT-es destinados a SP com volumes e status." },
      { property: "og:title", content: "Conferência de CT-es — Descarregamento SP" },
      { property: "og:description", content: "Tabela completa dos CT-es destinados a SP com volumes e status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { analysis } = useData();
  return (
    <>
      <PageHeader title="Conferência de CT-es" subtitle="Todos os CT-es com destino SP, incluindo os completos."
        actions={analysis && (
          <>
            <ExportButton label="Todos de SP" onExport={(f) => exportCtes("ctes_sp", analysis.ctes, f)} />
            <ExportButton label="Incompletos" onExport={(f) => exportCtes("ctes_incompletos", analysis.ctes.filter((c) => c.status === "INCOMPLETO"), f)} />
            <ExportButton label="Sem leitura" onExport={(f) => exportCtes("ctes_sem_leitura", analysis.ctes.filter((c) => c.status === "SEM_LEITURA"), f)} />
          </>
        )} />
      {analysis ? (<><PendingWarning count={analysis.summary.pendentes} /><CteTable data={analysis.ctes} /></>) : <NoData />}
    </>
  );
}
