import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { PageHeader } from "@/components/app/shell";
import { ExportButton, NoData, PendingWarning, StatCard } from "@/components/app/bits";
import { ManifestBar } from "@/components/app/manifest-bar";
import { CteTable } from "@/components/app/cte-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtInt, fmtPct, UNKNOWN_ORIGIN } from "@/lib/analysis";
import { exportComparison, exportCtes, exportManifestReport } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/carretas")({
  head: () => ({
    meta: [
      { title: "Descarregamento por Carreta — Descarregamento SP" },
      {
        name: "description",
        content: "Relatório por manifesto, comparativo entre carretas e cadastro de origens.",
      },
      { property: "og:title", content: "Descarregamento por Carreta — Descarregamento SP" },
      {
        property: "og:description",
        content: "Relatório por manifesto, comparativo entre carretas e cadastro de origens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { analysis, prefixo, originOf, comparison } = useData();
  const [sort, setSort] = useState<"pct" | "faltantes" | "manifesto">("pct");
  const sorted = useMemo(() => {
    const l = [...comparison];
    if (sort === "pct") l.sort((a, b) => (a.summary.pctGeral ?? -1) - (b.summary.pctGeral ?? -1));
    if (sort === "faltantes") l.sort((a, b) => b.summary.volsFaltantes - a.summary.volsFaltantes);
    if (sort === "manifesto") l.sort((a, b) => a.manifesto.localeCompare(b.manifesto));
    return l;
  }, [comparison, sort]);

  if (!analysis)
    return (
      <>
        <PageHeader title="Relatório de Descarregamento por Carreta" />
        <NoData />
        <OriginConfig />
      </>
    );
  const s = analysis.summary;
  const label = prefixo ? `Origem ${prefixo}` : "Todas as carretas";
  const origem = prefixo ? originOf(prefixo) : "Todas";
  const fname = prefixo ? `origem_${prefixo.replace(/[^\w-]/g, "")}` : "todas_carretas";
  const chart = sorted.map((m) => ({
    m: m.manifesto,
    pct: m.summary.pctGeral === null ? 0 : Math.round(m.summary.pctGeral * 100) / 100,
  }));

  return (
    <>
      <PageHeader
        title="Relatório de Descarregamento por Carreta"
        subtitle="Resultados por manifesto, somente registros com destino SP."
        actions={
          <>
            <ExportButton
              label="Relatório completo"
              onExport={(f) =>
                exportManifestReport(fname, label, origem, analysis, analysis.ctes, originOf, f)
              }
            />
            <ExportButton
              label="Incompletos"
              onExport={(f) =>
                exportCtes(
                  `${fname}_incompletos`,
                  analysis.ctes.filter((c) => c.status === "INCOMPLETO"),
                  f,
                )
              }
            />
            <ExportButton
              label="Volumes faltantes"
              onExport={(f) =>
                exportCtes(
                  `${fname}_faltantes`,
                  analysis.ctes.filter((c) => c.faltantes > 0),
                  f,
                )
              }
            />
          </>
        }
      />
      <ManifestBar />
      <PendingWarning count={s.pendentes} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <StatCard label="CT-es únicos" value={fmtInt(s.ctesUnicos)} tone="primary" />
        <StatCard label="Completos" value={fmtInt(s.completos)} tone="success" />
        <StatCard label="Incompletos" value={fmtInt(s.incompletos)} tone="danger" />
        <StatCard label="Sem leitura" value={fmtInt(s.semLeitura)} tone="danger" />
        <StatCard label="% leitura" value={fmtPct(s.pctGeral)} tone="primary" />
        <StatCard label="Previstos" value={fmtInt(s.volsPrevistos)} />
        <StatCard label="Lidos" value={fmtInt(s.volsLidos)} />
        <StatCard label="Faltantes" value={fmtInt(s.volsFaltantes)} tone="danger" />
        <StatCard label="Excedentes" value={fmtInt(s.excedentes)} tone="warning" />
        <StatCard label="Pendências" value={fmtInt(s.pendentes)} tone="warning" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">CT-es — {label}</h2>
      <CteTable data={analysis.ctes} />

      <div className="mb-3 mt-10 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Comparativo entre carretas</h2>
          <p className="text-xs text-muted-foreground">
            A soma das carretas pode diferir do total geral: o mesmo CT-e pode estar em mais de um
            manifesto.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pct">Menor % de leitura</SelectItem>
              <SelectItem value="faltantes">Mais volumes faltantes</SelectItem>
              <SelectItem value="manifesto">Código do manifesto</SelectItem>
            </SelectContent>
          </Select>
          <ExportButton label="Comparativo" onExport={(f) => exportComparison(sorted, f)} />
        </div>
      </div>
      {sorted.length ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full text-sm tabular">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Manifesto</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2 text-right">CT-es</th>
                  <th className="px-3 py-2 text-right">Previstos</th>
                  <th className="px-3 py-2 text-right">Lidos</th>
                  <th className="px-3 py-2 text-right">Faltantes</th>
                  <th className="px-3 py-2 text-right">% leitura</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr
                    key={m.manifesto}
                    className={cn(
                      "border-t",
                      prefixo !== null &&
                        m.manifesto.toUpperCase().startsWith(prefixo) &&
                        "bg-accent",
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{m.manifesto}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-xs",
                        m.origem === UNKNOWN_ORIGIN && "text-muted-foreground",
                      )}
                    >
                      {m.origem}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtInt(m.summary.ctesUnicos)}</td>
                    <td className="px-3 py-2 text-right">{fmtInt(m.summary.volsPrevistos)}</td>
                    <td className="px-3 py-2 text-right">{fmtInt(m.summary.volsLidos)}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right",
                        m.summary.volsFaltantes > 0 && "font-medium text-destructive",
                      )}
                    >
                      {fmtInt(m.summary.volsFaltantes)}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtPct(m.summary.pctGeral)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold">% de leitura por manifesto</div>
            <ResponsiveContainer width="100%" height={Math.max(220, chart.length * 28)}>
              <BarChart data={chart} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  type="number"
                  domain={[0, (max: number) => Math.max(100, Math.ceil(max))]}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="m"
                  width={95}
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                />
                <Tooltip formatter={(v) => `${Number(v).toLocaleString("pt-BR")}%`} />
                <Bar
                  dataKey="pct"
                  name="% leitura"
                  fill="var(--color-primary)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Nenhum manifesto identificado. Verifique o mapeamento da coluna MAN.
        </div>
      )}

      <OriginConfig />
    </>
  );
}

function OriginConfig() {
  const { origins, setOrigins } = useData();
  const [p, setP] = useState("");
  const [o, setO] = useState("");
  const add = () => {
    const k = p.trim().toUpperCase();
    const v = o.trim().slice(0, 60);
    if (!/^[A-Z]{1,6}$/.test(k) || !v) return;
    setOrigins({ ...origins, [k]: v });
    setP("");
    setO("");
  };
  return (
    <div className="mt-10 rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Origens por prefixo de manifesto</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        A origem é o começo do manifesto (ex.: CP273732 → CP). Cadastre aqui só para mostrar o nome
        da cidade no lugar do prefixo (ex.: CP → Campinas).
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(origins).map(([k, v]) => (
          <span
            key={k}
            className="inline-flex items-center gap-2 rounded-md border bg-secondary px-2.5 py-1 text-sm text-secondary-foreground"
          >
            <span className="font-mono font-semibold">{k}</span> {v}
            <button
              aria-label={`Remover ${k}`}
              onClick={() => {
                const n = { ...origins };
                delete n[k];
                setOrigins(n);
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={p}
          onChange={(e) => setP(e.target.value)}
          placeholder="Prefixo (ex.: SJ)"
          maxLength={6}
          className="w-36"
        />
        <Input
          value={o}
          onChange={(e) => setO(e.target.value)}
          placeholder="Origem"
          maxLength={60}
          className="w-56"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add}>
          <Plus /> Adicionar
        </Button>
      </div>
    </div>
  );
}
