import { ManifestBar } from "@/components/app/manifest-bar";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Package,
  PackageCheck,
  PackageX,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { useData } from "@/lib/data-context";
import { PageHeader } from "@/components/app/shell";
import { ExportButton, NoData, PendingWarning, StatCard } from "@/components/app/bits";
import { fmtInt, fmtPct } from "@/lib/analysis";
import { exportSummary } from "@/lib/reports";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Controle de Descarregamento SP" },
      {
        name: "description",
        content: "Indicadores de conferência de volumes dos CT-es destinados a São Paulo.",
      },
      { property: "og:title", content: "Dashboard — Controle de Descarregamento SP" },
      {
        property: "og:description",
        content: "Indicadores de conferência de volumes dos CT-es destinados a São Paulo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const C = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  danger: "var(--color-destructive)",
  warning: "var(--color-warning)",
  info: "var(--color-chart-5)",
};

function Gauge({ pct }: { pct: number | null }) {
  const v = pct ?? 0;
  const r = 70;
  const circ = 2 * Math.PI * r;
  const shown = Math.min(v, 100);
  const tone = v > 100 ? C.warning : v >= 99.99 ? C.success : v >= 95 ? C.primary : C.danger;
  return (
    <svg viewBox="0 0 180 180" className="size-44">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="16" />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${(shown / 100) * circ} ${circ}`}
        transform="rotate(-90 90 90)"
      />
      <text
        x="90"
        y="88"
        textAnchor="middle"
        className="fill-foreground"
        style={{ fontSize: 26, fontWeight: 700 }}
      >
        {fmtPct(pct)}
      </text>
      <text
        x="90"
        y="110"
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: 11 }}
      >
        volumes lidos
      </text>
    </svg>
  );
}

function Dashboard() {
  const { analysis } = useData();
  if (!analysis)
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Visão geral do descarregamento SP" />
        <NoData />
      </>
    );
  const s = analysis.summary;
  const dist = [
    { name: "Completos", value: s.completos, color: C.success },
    { name: "Incompletos", value: s.incompletos, color: C.danger },
    { name: "Sem leitura", value: s.semLeitura, color: "var(--color-chart-3)" },
    { name: "Excedentes", value: s.excedentes, color: C.warning },
    { name: "Pendentes", value: s.conflitos + s.invalidos, color: C.info },
  ].filter((d) => d.value > 0);
  const top = analysis.ctes
    .filter((c) => c.faltantes > 0)
    .slice(0, 10)
    .map((c) => ({ cte: c.cte, faltantes: c.faltantes }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Somente CT-es com destino SP, consolidados entre manifestos."
        actions={
          <ExportButton label="Exportar resumo" onExport={(f) => exportSummary(analysis, f)} />
        }
      />
      <ManifestBar />
      <PendingWarning count={s.pendentes} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-6 shadow-sm lg:row-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Percentual de leitura
          </div>
          <Gauge pct={s.pctGeral} />
          <div className="tabular text-center text-sm text-muted-foreground">
            {fmtInt(s.volsLidos)} de {fmtInt(s.volsPrevistos)} volumes
          </div>
          {s.pctGeral !== null && s.pctGeral > 100 && (
            <div className="mt-2 text-xs font-medium text-warning-foreground">
              Anomalia: leitura acima de 100%
            </div>
          )}
          {!s.definitivo && (
            <div className="mt-2 text-xs text-muted-foreground">Prévia — há pendências</div>
          )}
        </div>
        <div className="rounded-lg border-l-4 border-l-destructive border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <PackageX className="size-4 text-destructive" /> Volumes faltantes
          </div>
          <div className="tabular mt-2 text-5xl font-bold text-destructive">
            {fmtInt(s.volsFaltantes)}
          </div>
        </div>
        <div className="rounded-lg border-l-4 border-l-destructive border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <AlertTriangle className="size-4 text-destructive" /> CT-es incompletos
          </div>
          <div className="tabular mt-2 text-5xl font-bold text-foreground">
            {fmtInt(s.incompletos)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            + {fmtInt(s.semLeitura)} sem leitura
          </div>
        </div>
        <StatCard
          label="CT-es únicos SP"
          value={fmtInt(s.ctesUnicos)}
          tone="primary"
          icon={<Sigma className="size-4" />}
        />
        <StatCard
          label="Completos"
          value={fmtInt(s.completos)}
          tone="success"
          icon={<CheckCircle2 className="size-4 text-success" />}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Sem leitura"
          value={fmtInt(s.semLeitura)}
          tone="danger"
          icon={<CircleSlash className="size-4" />}
        />
        <StatCard
          label="Previstos"
          value={fmtInt(s.volsPrevistos)}
          icon={<Package className="size-4" />}
        />
        <StatCard
          label="Lidos"
          value={fmtInt(s.volsLidos)}
          icon={<PackageCheck className="size-4" />}
        />
        <StatCard label="Faltantes" value={fmtInt(s.volsFaltantes)} tone="danger" />
        <StatCard
          label="Excedentes"
          value={fmtInt(s.excedentes)}
          tone="warning"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Pendências"
          value={fmtInt(s.pendentes)}
          tone="warning"
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="CT-es por situação">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={dist}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {dist.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Previstos × lidos">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[
                {
                  n: "Volumes",
                  Previstos: s.volsPrevistos,
                  Lidos: s.volsLidos,
                  Faltantes: s.volsFaltantes,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="n" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Previstos" fill={C.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lidos" fill={C.success} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Faltantes" fill={C.danger} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top 10 — volumes faltantes por CT-e">
          {top.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="cte"
                  width={95}
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                />
                <Tooltip />
                <Bar dataKey="faltantes" name="Faltantes" fill={C.danger} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-[260px] place-items-center text-sm text-success">
              Nenhum volume faltante.
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
