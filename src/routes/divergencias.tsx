import { ManifestBar } from "@/components/app/manifest-bar";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/data-context";
import { PageHeader } from "@/components/app/shell";
import { ExportButton, NoData, PendingWarning, StatCard } from "@/components/app/bits";
import { CteTable } from "@/components/app/cte-table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { exportCtes } from "@/lib/reports";
import { fmtInt } from "@/lib/analysis";

export const Route = createFileRoute("/divergencias")({
  head: () => ({
    meta: [
      { title: "Divergências de Descarregamento — SP" },
      {
        name: "description",
        content: "CT-es incompletos, sem leitura, excedentes e inconsistentes.",
      },
      { property: "og:title", content: "Divergências de Descarregamento — SP" },
      {
        property: "og:description",
        content: "CT-es incompletos, sem leitura, excedentes e inconsistentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { analysis } = useData();
  const [onlyMissing, setOnlyMissing] = useState(false);
  if (!analysis)
    return (
      <>
        <PageHeader title="Divergências de descarregamento" />
        <NoData />
      </>
    );
  const div = analysis.ctes.filter((c) => c.status !== "COMPLETO");
  const data = onlyMissing ? div.filter((c) => c.faltantes > 0) : div;
  const s = analysis.summary;
  return (
    <>
      <PageHeader
        title="Divergências de descarregamento"
        subtitle="Tudo o que não fechou na conferência dos CT-es SP."
        actions={
          <ExportButton
            label="Exportar divergências"
            onExport={(f) => exportCtes("divergencias", data, f)}
          />
        }
      />
      <ManifestBar />
      <PendingWarning count={s.pendentes} />
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Incompletos" value={fmtInt(s.incompletos)} tone="danger" />
        <StatCard label="Sem leitura" value={fmtInt(s.semLeitura)} tone="danger" />
        <StatCard label="Vols faltantes" value={fmtInt(s.volsFaltantes)} tone="danger" />
        <StatCard label="Excedentes" value={fmtInt(s.excedentes)} tone="warning" />
        <StatCard
          label="Inconsistências"
          value={fmtInt(s.conflitos + s.invalidos)}
          tone="warning"
        />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <Switch id="only" checked={onlyMissing} onCheckedChange={setOnlyMissing} />
        <Label htmlFor="only">Mostrar apenas CT-es com volumes faltantes</Label>
      </div>
      <CteTable
        data={data}
        statuses={["INCOMPLETO", "SEM_LEITURA", "EXCEDENTE", "INVALIDO", "CONFLITO"]}
      />
    </>
  );
}
