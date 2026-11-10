import { AlertTriangle, Truck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/lib/data-context";

const ALL = "__all__";

export function ManifestBar() {
  const { analysis, prefixes, prefixo, setPrefixo, originOf, loaded } = useData();
  if (!analysis) return null;
  const label = (p: string) => {
    const n = originOf(p);
    return n === p ? p : `${p} — ${n}`;
  };
  return (
    <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground">
            <Truck className="size-4" />
          </div>
          <div className="text-sm">
            <div className="font-semibold">
              {prefixo ? `Origem ${label(prefixo)}` : "Todas as carretas"}
            </div>
            <div className="text-xs text-muted-foreground">
              Origem: <span className="text-foreground">{prefixo ? label(prefixo) : "Todas"}</span>{" "}
              · Destino: <span className="text-foreground">SP</span>
            </div>
          </div>
        </div>
        <div className="md:w-80">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Filtrar por origem</div>
          {loaded?.mapping.manifesto ? (
            <Select value={prefixo ?? ALL} onValueChange={(v) => setPrefixo(v === ALL ? null : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as carretas</SelectItem>
                {prefixes.map((p) => (
                  <SelectItem key={p} value={p}>
                    {label(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-xs text-muted-foreground">
              Coluna de manifesto não mapeada. Mapeie-a na importação.
            </div>
          )}
        </div>
      </div>
      {prefixo && analysis.summary.compartilhados > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning bg-warning/15 p-3 text-xs text-warning-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {analysis.summary.compartilhados} CT-e(s) desta origem também aparecem em manifestos de
          outras origens. A planilha não permite garantir quantos volumes foram descarregados
          exclusivamente nesta origem — trate o resultado desses CT-es como indicativo.
        </div>
      )}
    </div>
  );
}
