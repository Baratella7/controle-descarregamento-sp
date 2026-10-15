import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, AlertTriangle, ShieldCheck, Upload, Truck, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useData } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard", desc: "Visão geral", icon: LayoutDashboard },
  { to: "/carretas", label: "Por Carreta", desc: "Manifestos e comparativo", icon: Truck },
  { to: "/conferencia", label: "Conferência de CT-es", desc: "Tabela completa", icon: ClipboardList },
  { to: "/divergencias", label: "Divergências", desc: "Faltas e incompletos", icon: AlertTriangle },
  { to: "/auditoria", label: "Auditoria", desc: "Duplicidades", icon: ShieldCheck },
  { to: "/importar", label: "Importar Planilha", desc: "Excel e CSV", icon: Upload },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { loaded } = useData();
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
          <div className="grid size-10 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Truck className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-xs uppercase tracking-[0.18em] text-sidebar-foreground/60">Controle de</div>
            <div className="font-semibold text-sidebar-accent-foreground">Descarregamento — SP</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-sidebar-accent data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <n.icon className="size-4 text-sidebar-primary" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{n.label}</span>
                <span className="text-xs text-sidebar-foreground/55">{n.desc}</span>
              </span>
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-md border border-sidebar-border p-3 text-xs text-sidebar-foreground/70">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-sidebar-accent-foreground">
            <Lock className="size-3.5" /> Processamento local
          </div>
          Planilhas são lidas apenas neste navegador e descartadas ao fechar ou atualizar a página.
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-20 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 py-3">
          <Truck className="size-5 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-accent-foreground text-sm">Controle de Descarregamento — SP</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <n.icon className="size-3.5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-w-0">
        {loaded && (
          <div className="border-b bg-card px-4 py-2 text-xs text-muted-foreground lg:px-8">
            Arquivo em análise: <span className="font-medium text-foreground">{loaded.fileName}</span> · aba{" "}
            {loaded.sheetName} · {loaded.sheet.rows.length.toLocaleString("pt-BR")} linhas
          </div>
        )}
        <div className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
