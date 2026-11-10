import { useMemo, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_LABELS, fmtInt, fmtPct, type CteResult, type Status } from "@/lib/analysis";
import { useData } from "@/lib/data-context";
import { StatusBadge } from "./bits";
import { cn } from "@/lib/utils";

type Sort = "faltantes" | "pct-asc" | "pct-desc" | "cte";
const PAGE = 25;

export function CteTable({ data, statuses }: { data: CteResult[]; statuses?: Status[] }) {
  const { originOf } = useData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [sort, setSort] = useState<Sort>("faltantes");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toUpperCase();
    let l = data.filter(
      (c) =>
        (!term || c.cte.toUpperCase().includes(term)) && (status === "ALL" || c.status === status),
    );
    l = [...l];
    if (sort === "faltantes") l.sort((a, b) => b.faltantes - a.faltantes);
    if (sort === "pct-asc") l.sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1));
    if (sort === "pct-desc") l.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    if (sort === "cte") l.sort((a, b) => a.cte.localeCompare(b.cte));
    return l;
  }, [data, q, status, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const p = Math.min(page, pages - 1);
  const slice = list.slice(p * PAGE, p * PAGE + PAGE);
  const opts = statuses ?? (Object.keys(STATUS_LABELS) as Status[]);
  const selected = data.find((c) => c.cte === open) ?? null;

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Pesquisar CT-e…"
            className="pl-8"
            maxLength={60}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {opts.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="sm:w-56">
            <ArrowDownUp className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="faltantes">Mais volumes faltantes</SelectItem>
            <SelectItem value="pct-asc">Menor % de leitura</SelectItem>
            <SelectItem value="pct-desc">Maior % de leitura</SelectItem>
            <SelectItem value="cte">Código do CT-e</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">CT-e</th>
              <th className="px-3 py-2">Manifesto</th>
              <th className="px-3 py-2">Origem</th>
              <th className="px-3 py-2 text-right">Previstos</th>
              <th className="px-3 py-2 text-right">Lidos</th>
              <th className="px-3 py-2 text-right">Faltantes</th>
              <th className="px-3 py-2 text-right">% leitura</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="tabular">
            {slice.map((c) => (
              <tr
                key={c.cte}
                className={cn(
                  "border-t",
                  c.status !== "COMPLETO" && "bg-destructive/[0.025]",
                  (c.status === "CONFLITO" || c.status === "INVALIDO") && "bg-warning/10",
                )}
              >
                <td className="px-3 py-2 font-mono text-xs font-medium">
                  {c.cte}
                  {c.duplicated && (
                    <span className="ml-1.5 rounded bg-secondary px-1 text-[10px] text-secondary-foreground">
                      {c.records.length}×
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{c.manifestos.join(", ") || "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {[...new Set(c.manifestos.map(originOf))].join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-right">{fmtInt(c.vols)}</td>
                <td className="px-3 py-2 text-right">{fmtInt(c.lidos)}</td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-medium",
                    c.faltantes > 0 && "text-destructive",
                  )}
                >
                  {c.vols === null ? "—" : fmtInt(c.faltantes)}
                </td>
                <td className="px-3 py-2 text-right">{fmtPct(c.pct)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpen(c.cte)}
                    aria-label={`Detalhes do CT-e ${c.cte}`}
                  >
                    <Eye />
                  </Button>
                </td>
              </tr>
            ))}
            {!slice.length && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhum CT-e encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
        <span>{list.length.toLocaleString("pt-BR")} CT-e(s)</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={p === 0} onClick={() => setPage(p - 1)}>
            <ChevronLeft />
          </Button>
          <span>
            Página {p + 1} de {pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={p >= pages - 1}
            onClick={() => setPage(p + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <CteDialog cte={selected} onClose={() => setOpen(null)} />
    </div>
  );
}

export function CteDialog({ cte, onClose }: { cte: CteResult | null; onClose: () => void }) {
  const { resolve } = useData();
  return (
    <Dialog open={!!cte} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {cte && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono">{cte.cte}</DialogTitle>
              <DialogDescription>Registros originais que formam este resultado.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={cte.status} />
              <span className="text-muted-foreground">
                Previstos {fmtInt(cte.vols)} · Lidos {fmtInt(cte.lidos)} · Leitura {fmtPct(cte.pct)}
              </span>
            </div>
            {cte.issues.length > 0 && (
              <ul className="list-disc rounded-md bg-muted p-3 pl-7 text-xs text-muted-foreground">
                {cte.issues.map((i, k) => (
                  <li key={k}>{i}</li>
                ))}
              </ul>
            )}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm tabular">
                <thead className="bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Linha</th>
                    <th className="px-3 py-2">Manifesto</th>
                    <th className="px-3 py-2 text-right">VOLS</th>
                    <th className="px-3 py-2 text-right">LIDOS</th>
                    <th className="px-3 py-2">Erros</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cte.records.map((r) => (
                    <tr key={r.line} className="border-t">
                      <td className="px-3 py-2">{r.line}</td>
                      <td className="px-3 py-2">{r.manifesto || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {r.vols === null || Number.isNaN(r.vols) ? "—" : r.vols}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.lidos === null || Number.isNaN(r.lidos) ? "—" : r.lidos}
                      </td>
                      <td className="px-3 py-2 text-xs text-destructive">{r.errors.join(", ")}</td>
                      <td className="px-3 py-2 text-right">
                        {cte.records.length > 1 &&
                          !r.errors.length &&
                          (cte.status === "CONFLITO" || cte.resolved) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolve(cte.cte, { vols: r.vols!, lidos: r.lidos! })}
                            >
                              Usar este
                            </Button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cte.resolved && (
              <Button variant="ghost" size="sm" onClick={() => resolve(cte.cte, null)}>
                Desfazer resolução manual
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
