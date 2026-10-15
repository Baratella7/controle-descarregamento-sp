import { AlertTriangle, Truck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData } from "@/lib/store";
import { UNKNOWN_ORIGIN } from "@/lib/analysis";

const ALL = "__all__";

export function ManifestBar() {
  const { analysis, manifestos, manifesto, setManifesto, originOf, loaded } = useData();
  if (!analysis) return null;
  const origem = manifesto ? originOf(manifesto) : null;
  return (
    <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground"><Truck className="size-4" /></div>
          <div className="text-sm">
            <div className="font-semibold">{manifesto ? `Manifesto ${manifesto}` : "Todas as carretas"}</div>
            <div className="text-xs text-muted-foreground">
              Origem: <span className={origem === UNKNOWN_ORIGIN ? "text-warning-foreground" : "text-foreground"}>{origem ?? "Todas"}</span> · Destino: <span className="text-foreground">SP</span>
            </div>
          </div>
        </div>
        <div className="md:w-80">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Selecionar carreta / manifesto</div>
          {loaded?.mapping.manifesto ? (
            <Select value={manifesto ?? ALL} onValueChange={(v) => setManifesto(v === ALL ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as carretas</SelectItem>
                {manifestos.map((m) => <SelectItem key={m} value={m}>{m} — {originOf(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-xs text-muted-foreground">Coluna de manifesto não mapeada. Mapeie-a na importação.</div>
          )}
        </div>
      </div>
      {manifesto && analysis.summary.compartilhados > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning bg-warning/15 p-3 text-xs text-warning-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {analysis.summary.compartilhados} CT-e(s) desta carreta também aparecem em outros manifestos. A planilha não permite garantir quantos volumes foram descarregados exclusivamente nesta carreta — trate o resultado desses CT-es como indicativo.
        </div>
      )}
    </div>
  );
}
