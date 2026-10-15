import { Link } from "@tanstack/react-router";
import { AlertTriangle, Download, FileSpreadsheet, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Status } from "@/lib/analysis";

export const STATUS_STYLE: Record<Status, string> = {
  COMPLETO: "bg-success/12 text-success border-success/30",
  INCOMPLETO: "bg-destructive/10 text-destructive border-destructive/30",
  SEM_LEITURA: "bg-destructive text-destructive-foreground border-destructive",
  EXCEDENTE: "bg-warning/25 text-warning-foreground border-warning/60",
  INVALIDO: "bg-warning/25 text-warning-foreground border-warning/60",
  CONFLITO: "bg-warning text-warning-foreground border-warning",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

type Tone = "default" | "success" | "danger" | "warning" | "primary";
const TONE: Record<Tone, string> = {
  default: "border-border",
  primary: "border-l-4 border-l-primary",
  success: "border-l-4 border-l-success",
  danger: "border-l-4 border-l-destructive",
  warning: "border-l-4 border-l-warning",
};

export function StatCard({ label, value, hint, tone = "default", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm", TONE[tone])}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {icon}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function NoData() {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed bg-card px-6 py-20 text-center">
      <FileSpreadsheet className="size-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">Nenhuma planilha em análise</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Importe um arquivo Excel ou CSV. Os dados ficam apenas na memória deste navegador.
      </p>
      <Button asChild className="mt-6">
        <Link to="/importar">
          <Upload /> Importar planilha
        </Link>
      </Button>
    </div>
  );
}

export function PendingWarning({ count }: { count: number }) {
  if (!count) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning bg-warning/15 p-4 text-sm text-warning-foreground">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <strong>Resultado ainda não definitivo.</strong> Existem {count} inconsistência(s) pendente(s) (conflitos de
        duplicidade ou dados inválidos) fora dos totais.{" "}
        <Link to="/auditoria" className="underline font-medium">
          Ver auditoria
        </Link>
      </div>
    </div>
  );
}

export function ExportButton({ onExport, label = "Exportar" }: { onExport: (f: "xlsx" | "csv") => void; label?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("csv")}>CSV (.csv)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
